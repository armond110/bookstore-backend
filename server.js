import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/books.js";
import orderRoutes from "./routes/orders.js";
import uploadRoutes from "./routes/upload.js";
import paymentRoutes from "./routes/payments.js";
import stripeWebhookHandler from "./routes/stripeWebhook.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

// IMPORTANTE: il webhook di Stripe deve stare PRIMA di express.json().
// Stripe ci manda il corpo della richiesta "raw" (i byte grezzi, non ancora
// interpretati come JSON), perché la firma che verifica l'autenticità della
// richiesta è calcolata su quei byte esatti — se li facessimo prima passare
// da express.json() la firma non corrisponderebbe più.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json());

// prima di gestire qualsiasi richiesta, ci assicuriamo che mongoose sia connesso.
// Su Vercel ogni "funzione" può partire a freddo (cold start), quindi non possiamo
// contare su una connessione fatta una volta sola all'avvio come in un server normale:
// connectDB() qui dentro riusa la connessione se già aperta, altrimenti ne apre una nuova.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Bookstore API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// su Vercel NON dobbiamo chiamare app.listen(): è la piattaforma stessa che
// invoca la funzione ad ogni richiesta. Vercel imposta automaticamente la
// variabile d'ambiente VERCEL, la usiamo per capire dove siamo in esecuzione.
// In locale invece serve davvero, altrimenti il server non parte.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
