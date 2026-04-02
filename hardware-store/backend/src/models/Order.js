import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variant: mongoose.Schema.Types.ObjectId,
  name: String, // denormalized
  sku: String,
  barcode: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 16 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    type: {
      type: String,
      enum: ["pos", "online", "wholesale"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "ready", "delivered", "completed", "cancelled", "refunded"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid", "refunded"],
      default: "unpaid",
    },

    // Parties
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerName: String, // for walk-in customers
    customerPhone: String,
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Items
    items: [orderItemSchema],

    // Totals
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    shippingAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 }, // amount on credit

    // Payment
    paymentMethod: {
      type: String,
      enum: ["cash", "mpesa", "bank_transfer", "credit", "mixed"],
    },
    payments: [
      {
        method: { type: String, enum: ["cash", "mpesa", "bank_transfer", "credit"] },
        amount: Number,
        reference: String, // M-Pesa receipt, bank ref
        mpesaTransactionId: String,
        paidAt: Date,
        status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
      },
    ],

    // Delivery (online orders)
    deliveryAddress: {
      street: String,
      city: String,
      county: String,
      postalCode: String,
    },
    deliveryNotes: String,
    estimatedDelivery: Date,
    deliveredAt: Date,

    // POS specific
    receiptPrinted: { type: Boolean, default: false },
    isOffline: { type: Boolean, default: false }, // created offline, synced later
    offlineId: String, // local ID before sync

    notes: String,
    internalNotes: String,
    cancelReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Auto-generate order number
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const prefix = this.type === "pos" ? "POS" : "ORD";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `${prefix}-${date}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

orderSchema.virtual("profit").get(function () {
  const cost = this.items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  return this.total - cost;
});

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ branch: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ type: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
