# Marginalia — Backend API

Express + MongoDB API for the Marginalia bookstore.

## Local setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in MONGODB_URI and JWT_SECRET
npm run seed            # adds sample books + an admin user
npm run dev              # starts on http://localhost:5000
```

Seeded admin login: `admin@bookstore.com` / `admin1234`

## Pagamenti (Stripe)

Il checkout usa **Stripe Checkout** (pagina di pagamento ospitata da Stripe).

1. Crea un account gratuito su https://dashboard.stripe.com/register
2. Resta in modalità **Test** (in alto a destra nella dashboard)
3. Vai su Developers → API keys, copia la "Secret key" (inizia con `sk_test_...`)
4. Mettila in `.env` come `STRIPE_SECRET_KEY`
5. Per pagare in test, usa la carta `4242 4242 4242 4242`, qualsiasi data futura, qualsiasi CVC

Il flusso: il frontend chiede una "sessione di pagamento" al backend → l'utente paga
sulla pagina di Stripe → Stripe rimanda l'utente su `/order-success`, e IN PARALLELO
notifica il backend tramite webhook → l'ordine viene creato una volta sola (qualunque
dei due arrivi per primo) e lo stock viene scalato.

### Configurare il webhook (consigliato, per affidabilità in produzione)

Il webhook conferma l'ordine lato server, in modo affidabile anche se l'utente
chiude la scheda del browser subito dopo aver pagato e non torna mai su
`/order-success`. Senza webhook, quell'ordine non verrebbe mai creato.

**In locale**, usa la Stripe CLI per inoltrare gli eventi al tuo server:
```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```
Il comando stampa un "webhook signing secret" (inizia con `whsec_...`): mettilo
in `.env` come `STRIPE_WEBHOOK_SECRET`.

**In produzione (Vercel)**:
1. Dashboard Stripe → Developers → Webhooks → "Add endpoint"
2. URL: `https://<il-tuo-backend>.vercel.app/api/payments/webhook`
3. Eventi da ascoltare: `checkout.session.completed` (e opzionalmente `checkout.session.async_payment_succeeded`)
4. Copia il "Signing secret" mostrato dopo la creazione, mettilo su Vercel come
   `STRIPE_WEBHOOK_SECRET` (Settings → Environment Variables), poi fai Redeploy

Se `STRIPE_WEBHOOK_SECRET` non è impostato, il sito continua a funzionare
normalmente (gli ordini vengono comunque creati quando l'utente torna sulla
pagina di successo) — semplicemente non hai la rete di sicurezza in più che
copre il caso "l'utente non torna mai sul sito".

## Endpoints

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/books` (search/genre/price/sort/pagination), `GET /api/books/:id`, `GET /api/books/genres`
- `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id` (admin only)
- `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders` (admin), `PUT /api/orders/:id/status` (admin)
- `POST /api/payments/create-checkout-session`, `GET /api/payments/confirm/:sessionId`
- `POST /api/upload` (admin only, solo in locale)

## Deploy

See the root `DEPLOY.md` for GitHub + Vercel + MongoDB Atlas steps.
