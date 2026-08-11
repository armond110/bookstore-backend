import express from "express";
import Order from "../models/Order.js";
import Book from "../models/Book.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// @route  POST /api/orders  (create order from cart items)
router.post("/", protect, async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ message: "No order items provided" });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const book = await Book.findById(item.bookId);
      if (!book) return res.status(404).json({ message: `Book not found: ${item.bookId}` });
      if (book.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for "${book.title}"` });
      }
      totalAmount += book.price * item.quantity;
      orderItems.push({
        book: book._id,
        title: book.title,
        price: book.price,
        quantity: item.quantity,
      });
      book.stock -= item.quantity;
      await book.save();
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      status: "paid",
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

// @route  GET /api/orders/mine
router.get("/mine", protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// @route  GET /api/orders (admin - all orders)
router.get("/", protect, adminOnly, async (req, res, next) => {
  try {
    const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// @route  PUT /api/orders/:id/status (admin)
router.put("/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

export default router;
