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

## Endpoints

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/books` (search/genre/price/sort/pagination), `GET /api/books/:id`, `GET /api/books/genres`
- `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id` (admin only)
- `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders` (admin), `PUT /api/orders/:id/status` (admin)

## Deploy

See the root `DEPLOY.md` for GitHub + Vercel + MongoDB Atlas steps.
