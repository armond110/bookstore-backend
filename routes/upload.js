import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { protect, adminOnly } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// per default salviamo dentro frontend/public/images, che è la cartella
// che il frontend serve automaticamente come file statici (es. /images/foo.jpg).
// Se le due cartelle non sono una accanto all'altra (es. in produzione, dove
// backend e frontend sono due progetti separati), si può cambiare cartella
// impostando la variabile d'ambiente IMAGES_DIR con un percorso assoluto.
const imagesDir = process.env.IMAGES_DIR
  ? path.resolve(process.env.IMAGES_DIR)
  : path.join(__dirname, "..", "..", "frontend", "public", "images");

// creo la cartella se non esiste ancora, così non va in errore al primo upload
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    // tolgo caratteri strani dal nome originale e ci metto davanti un timestamp,
    // così due file con lo stesso nome non si sovrascrivono
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    cb(null, `${Date.now()}-${base || "cover"}${ext}`);
  },
});

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const router = express.Router();

// @route  POST /api/upload  (admin only)
// riceve un file con campo "image", lo salva su disco e restituisce il percorso pubblico
router.post("/", protect, adminOnly, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded" });
  }
  // il frontend serve la cartella public/images alla radice, quindi il percorso
  // pubblico è semplicemente /images/<nome-file>
  res.status(201).json({ url: `/images/${req.file.filename}` });
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
