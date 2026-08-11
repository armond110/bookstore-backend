import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// teniamo in cache la connessione (o la promise di connessione), così su
// Vercel non riapriamo una connessione a MongoDB ad ogni singola richiesta:
// se la funzione serverless è ancora "calda", riusiamo quella già aperta
let cachedConnection = null;

export default async function connectDB() {
  // se siamo già connessi, non c'è altro da fare
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // se una connessione è già in corso, aspettiamo quella invece di aprirne un'altra
  if (cachedConnection) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // IMPORTANTE: qui non chiamiamo più process.exit(1). Su un server
    // normale andava bene, ma su Vercel (funzioni serverless) uccide la
    // funzione e trasforma ogni richiesta in un errore 500 senza un
    // messaggio utile. Meglio lanciare un errore normale: lo gestisce
    // l'error handler di Express e risponde con un messaggio chiaro.
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  mongoose.set("strictQuery", true);

  cachedConnection = mongoose
    .connect(uri)
    .then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn.connection;
    })
    .catch((err) => {
      // se la connessione fallisce, azzeriamo la cache così il prossimo
      // tentativo riparte da zero invece di restare bloccato su un errore vecchio
      cachedConnection = null;
      throw err;
    });

  return cachedConnection;
}
