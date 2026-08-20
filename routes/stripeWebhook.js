import connectDB from "../config/db.js";
import { createOrderFromSession, getStripe } from "./payments.js";

// Questo NON è un router normale montato con app.use(), perché ha bisogno
// del corpo della richiesta "raw" (grezzo, non interpretato come JSON) per
// poter verificare che la richiesta arrivi davvero da Stripe e non da
// qualcun altro che finge di esserlo. Per questo va registrato in server.js
// PRIMA di express.json(), con express.raw() al posto del parser normale.
//
// Cosa fa: Stripe chiama questo endpoint da solo, sui SUOI server, ogni
// volta che un pagamento va a buon fine — anche se l'utente chiude subito
// la scheda del browser dopo aver pagato e non torna mai sulla pagina
// /order-success. È il modo "affidabile" di confermare gli ordini.
export default async function stripeWebhookHandler(req, res) {
  // avvolgiamo TUTTO in un try/catch: se qualcosa qui dentro lanciasse un
  // errore non gestito, su un ambiente serverless potrebbe far crashare
  // l'intera funzione (stessa lezione imparata con l'upload delle immagini)
  try {
    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set in environment variables");
      return res.status(500).json({ message: "Webhook secret not configured" });
    }

    // verifica crittografica: controlla che la richiesta sia stata firmata
    // davvero da Stripe con la chiave segreta del webhook, e non sia un
    // finto evento mandato da qualcun altro (es. un utente malintenzionato
    // che prova a "regalarsi" ordini senza pagare davvero)
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ci interessano solo gli eventi di pagamento completato
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;

      // il pagamento potrebbe non essere ancora "paid" per certi metodi di
      // pagamento asincroni (es. bonifici): in quel caso aspettiamo l'evento giusto
      if (session.payment_status === "paid") {
        await connectDB();
        try {
          await createOrderFromSession(session);
        } catch (err) {
          // logghiamo l'errore ma rispondiamo comunque 200 a Stripe: se
          // rispondessimo con un errore, Stripe ritenterebbe questo stesso
          // evento per ore, e se il problema non è temporaneo (es. un libro
          // è stato cancellato) non si risolverebbe comunque da solo
          console.error("Webhook: failed to create order from session", session.id, err.message);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handler error:", err.message);
    res.status(500).json({ message: "Webhook handler error" });
  }
}
