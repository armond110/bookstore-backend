import express from "express";
import Stripe from "stripe";
import Book from "../models/Book.js";
import Order from "../models/Order.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }
  return new Stripe(key);
}

async function createOrderFromSession(session) {
  const items = JSON.parse(session.metadata.items);
  const shippingAddress = JSON.parse(session.metadata.shippingAddress || "{}");
  const userId = session.metadata.userId;

  let totalAmount = 0;
  const orderItems = [];
  for (const item of items) {
    const book = await Book.findById(item.bookId);
    if (!book) continue; 
    totalAmount += book.price * item.quantity;
    orderItems.push({
      book: book._id,
      title: book.title,
      price: book.price,
      quantity: item.quantity,
    });
  }

 
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


router.post("/create-checkout-session", protect, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const { items, shippingAddress } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: "No items provided" });
    }

    
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
      
      success_url: `${clientUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/cart`,
      
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

// 
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
