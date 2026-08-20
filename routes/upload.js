import express from "express";
import multer from "multer";
import { protect, adminOnly } from "../middleware/auth.js";

// invece di scrivere il file su disco, lo teniamo in memoria (come Buffer)
// e lo trasformiamo subito in una stringa "data URI" (base64). Questa
// stringa viene salvata direttamente nel campo coverImage del libro dentro
// MongoDB — nessun file scritto da nessuna parte, quindi funziona identico
// sia in locale sia su Vercel (che non permette di scrivere file permanenti).
const storage = multer.memoryStorage();

// accetto solo immagini (jpeg, png, webp, gif)
function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, png, webp, gif) are allowed"));
  }
}

const upload = multer({
  storage,
  fileFilter,
  // IMPORTANTE: qui il limite è più basso di quello che useresti per un file
  // qualsiasi, perché l'immagine finisce dentro un documento MongoDB (che ha
  // un limite di 16MB per documento) e dentro ogni risposta dell'API che
  // elenca i libri. Codificata in base64 diventa anche circa un 33% più
  // grande del file originale, quindi teniamo il tetto basso per non
  // appesantire troppo il sito.
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

const router = express.Router();

// @route  POST /api/upload  (admin only)
// riceve un file con campo "image" e lo restituisce come stringa base64
// pronta per essere salvata nel campo coverImage di un libro
router.post("/", protect, adminOnly, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded" });
  }

  const base64 = req.file.buffer.toString("base64");
  const dataUri = `data:${req.file.mimetype};base64,${base64}`;

  res.status(201).json({ url: dataUri });
});

// multer lancia i suoi errori (es. file troppo grande) prima di arrivare qui,
// quindi li gestiamo con un piccolo error handler dedicato a questa rotta
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || "Upload failed" });
  }
  next();
});

export default router;
