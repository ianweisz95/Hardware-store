import mongoose from "mongoose";

// ─── Branch ──────────────────────────────────────────────────────────────────
const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, unique: true, uppercase: true },
    address: {
      street: String,
      city: String,
      county: String,
      postalCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    phone: String,
    email: String,
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    isMainBranch: { type: Boolean, default: false },
    openingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    mpesaTill: String,
    mpesaPaybill: String,
  },
  { timestamps: true }
);

export const Branch = mongoose.model("Branch", branchSchema);

// ─── Supplier ────────────────────────────────────────────────────────────────
const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, unique: true, sparse: true },
    contactPerson: String,
    email: String,
    phone: { type: String, required: true },
    address: {
      street: String,
      city: String,
      county: String,
    },
    kraPin: String, // Kenya Revenue Authority PIN
    paymentTerms: { type: Number, default: 30 }, // days
    creditLimit: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    notes: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

export const Supplier = mongoose.model("Supplier", supplierSchema);

// ─── Purchase Order ───────────────────────────────────────────────────────────
const poItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variant: mongoose.Schema.Types.ObjectId,
  description: String,
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true },
  total: Number,
  receivedQuantity: { type: Number, default: 0 },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "partial", "received", "cancelled"],
      default: "draft",
    },
    items: [poItemSchema],
    subtotal: Number,
    taxAmount: Number,
    total: Number,
    expectedDelivery: Date,
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

purchaseOrderSchema.pre("save", async function (next) {
  if (!this.poNumber) {
    const count = await mongoose.model("PurchaseOrder").countDocuments();
    this.poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  }
  // Calculate totals
  this.subtotal = this.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
  this.taxAmount = this.subtotal * 0.16;
  this.total = this.subtotal + this.taxAmount;
  next();
});

export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
