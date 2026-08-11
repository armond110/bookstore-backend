import express from "express";
import Book from "../models/Book.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// @route  GET /api/books
// Supports: ?search=&genre=&minPrice=&maxPrice=&sort=price_asc|price_desc|newest&page=&limit=
router.get("/", async (req, res, next) => {
  try {
    const { search, genre, minPrice, maxPrice, sort, page = 1, limit = 12, featured } = req.query;
    const query = {};

    // partial, case-insensitive search across title, author and genre
    // (regex instead of $text so partial words like "code" still match "Codebreakers")
    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped, "i");
      query.$or = [{ title: pattern }, { author: pattern }, { genre: pattern }];
    }
    if (genre) query.genre = genre;
    if (featured) query.featured = featured === "true";
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { price: 1 };
    if (sort === "price_desc") sortOption = { price: -1 };
    if (sort === "newest") sortOption = { createdAt: -1 };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Number(limit));

    const [books, total] = await Promise.all([
      Book.find(query)
        .sort(sortOption)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Book.countDocuments(query),
    ]);

    res.json({
      books,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// @route  GET /api/books/genres
router.get("/genres", async (req, res, next) => {
  try {
    const genres = await Book.distinct("genre");
    res.json({ genres });
  } catch (err) {
    next(err);
  }
});

// @route  GET /api/books/:id
router.get("/:id", async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ book });
  } catch (err) {
    next(err);
  }
});

// @route  POST /api/books (admin)
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const book = await Book.create(req.body);
    res.status(201).json({ book });
  } catch (err) {
    next(err);
  }
});

// @route  PUT /api/books/:id (admin)
router.put("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ book });
  } catch (err) {
    next(err);
  }
});

// @route  DELETE /api/books/:id (admin)
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ message: "Book deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
