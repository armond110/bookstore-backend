import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    coverImage: { type: String, default: "" },
    genre: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    isbn: { type: String, trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bookSchema.index({ title: "text", author: "text", genre: "text" });

export default mongoose.model("Book", bookSchema);
