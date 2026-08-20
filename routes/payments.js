import express from "express";
import Stripe from "stripe";
import Book from "../models/Book.js";
import Order from "../models/Order.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// creiamo il client Stripe solo se c'è davvero una chiave configurata,
// così il resto del sito continua a funzionare anche senza Stripe impostato
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }
  return new Stripe(key);
}

// Crea l'ordine a partire da una sessione Stripe già pagata, se non esiste
// già. Questa funzione viene chiamata da DUE posti diversi: dalla pagina di
// conferma (/confirm, quando l'utente torna dal pagamento) E dal webhook di
// Stripe (che arriva indipendentemente, anche se l'utente chiude la scheda).
// Può quindi capitare che entrambi provino a creare lo stesso ordine quasi
// nello stesso momento: per evitare di scalare lo stock due volte, prima
// "prenotiamo" l'ordine con un'operazione atomica sul database, e scaliamo
// lo stock solo se siamo stati NOI a crearlo davvero in quel momento.
async function createOrderFromSession(session) {
  const items = JSON.parse(session.metadata.items);
  const shippingAddress = JSON.parse(session.metadata.shippingAddress || "{}");
  const userId = session.metadata.userId;

  // calcoliamo cosa dovrebbe contenere l'ordine, senza ancora toccare lo stock
  let totalAmount = 0;
  const orderItems = [];
  for (const item of items) {
    const book = await Book.findById(item.bookId);
    if (!book) continue; // libro cancellato nel frattempo, lo saltiamo
    totalAmount += book.price * item.quantity;
    orderItems.push({
      book: book._id,
      title: book.title,
      price: book.price,
      quantity: item.quantity,
    });
  }

  // upsert atomico: se un ordine con questo stripeSessionId esiste già,
  // MongoDB non lo tocca (grazie a $setOnInsert) e ci dice "non l'hai creato
  // tu adesso". Se non esiste ancora, lo crea in un'unica operazione atomica.
  // Questo elimina la corsa critica anche se webhook e /confirm arrivano insieme.
  const result = await Order.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        user: userId,
        items: orderItems,
        totalAmount,
        shippingAddress,
        status: "paid",
        stripeSessionId: session.id,
      },
    },
    { upsert: true, new: true, rawResult: true }
  );

  const order = result.value;
  const weJustCreatedIt = Boolean(result.lastErrorObject?.upserted);

  // scaliamo lo stock SOLO se l'ordine lo abbiamo appena creato noi:
  // se esisteva già (creato dall'altra chiamata), lo stock è già stato scalato
  if (weJustCreatedIt) {
    for (const item of items) {
      const book = await Book.findById(item.bookId);
      if (!book) continue;
      book.stock = Math.max(0, book.stock - item.quantity);
      await book.save();
    }
  }

  return order;
}

// @route  POST /api/payments/create-checkout-session
// riceve il carrello, controlla lo stock, e crea una sessione di pagamento Stripe.
// Non tocca ancora lo stock né crea l'ordine: quello succede solo DOPO il
// pagamento confermato (via webhook o quando l'utente torna sulla pagina di successo).
router.post("/create-checkout-session", protect, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const { items, shippingAddress } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: "No items provided" });
    }

    // controlliamo che i libri esistano e ci sia abbastanza stock,
    // e costruiamo le righe che Stripe deve mostrare nella pagina di pagamento
    const lineItems = [];
    for (const item of items) {
      const book = await Book.findById(item.bookId);
      if (!book) return res.status(404).json({ message: `Book not found: ${item.bookId}` });
      if (book.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for "${book.title}"` });
      }
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: book.title },
          // Stripe vuole il prezzo in centesimi, non in dollari
          unit_amount: Math.round(book.price * 100),
        },
        quantity: item.quantity,
      });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      // dopo il pagamento Stripe rimanda qui, con l'id sessione nell'url
      success_url: `${clientUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/cart`,
      // salviamo qui i dati che ci servono per creare l'ordine dopo il pagamento,
      // perché Stripe non conosce il nostro database
      metadata: {
        userId: req.user._id.toString(),
        items: JSON.stringify(items),
        shippingAddress: JSON.stringify(shippingAddress || {}),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// @route  GET /api/payments/confirm/:sessionId
// il frontend chiama questa rotta quando l'utente torna dalla pagina di
// pagamento Stripe. È il modo "veloce" di confermare l'ordine (l'utente lo
// vede subito) — il webhook qui sotto è il modo "affidabile" che funziona
// anche se l'utente non torna mai sul sito dopo aver pagato.
router.get("/confirm/:sessionId", protect, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed yet" });
    }

    // controllo di sicurezza: la sessione deve appartenere all'utente che sta chiedendo
    if (session.metadata.userId !== req.user._id.toString()) {
      return res.status(403).json({ message: "This payment session doesn't belong to you" });
    }

    const order = await createOrderFromSession(session);
    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
});

export default router;
export { createOrderFromSession, getStripe };
