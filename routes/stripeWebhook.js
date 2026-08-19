import connectDB from '../config/db.js';
import { createOrderFromSession, getStripe } from './payments.js';

export default async function stripeWebhookHandler(req, res) {
  try {
    const stripe = getStripe();
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        'STRIPE_WEBHOOK_SECRET is not set in environment variables',
      );
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error(
        'Stripe webhook signature verification failed:',
        err.message,
      );
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ci interessano solo gli eventi di pagamento completato
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object;

      if (session.payment_status === 'paid') {
        await connectDB();
        try {
          await createOrderFromSession(session);
        } catch (err) {
          console.error(
            'Webhook: failed to create order from session',
            session.id,
            err.message,
          );
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err.message);
    res.status(500).json({ message: 'Webhook handler error' });
  }
}
