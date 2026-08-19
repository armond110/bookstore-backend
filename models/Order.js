import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      fullName: String,
      street: String,
      city: String,
      postalCode: String,
      country: String,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    // id della sessione di pagamento Stripe che ha generato questo ordine.
    // Serve per non creare due ordini uguali se la pagina di conferma
    // viene ricaricata dopo il pagamento.
    stripeSessionId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
