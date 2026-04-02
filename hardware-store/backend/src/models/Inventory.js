import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: mongoose.Schema.Types.ObjectId, // if product has variants
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    quantity: { type: Number, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0 }, // for pending orders
    lowStockThreshold: { type: Number, default: 10 },
    reorderPoint: { type: Number, default: 5 },
    reorderQuantity: { type: Number, default: 50 },
    location: String, // shelf/bin location in store
    lastCounted: Date,
    lastRestocked: Date,
  },
  { timestamps: true }
);

// Available stock (not reserved)
inventorySchema.virtual("availableQuantity").get(function () {
  return Math.max(0, this.quantity - this.reservedQuantity);
});

inventorySchema.virtual("isLowStock").get(function () {
  return this.quantity <= this.lowStockThreshold;
});

inventorySchema.index({ product: 1, branch: 1 }, { unique: true });
inventorySchema.index({ branch: 1 });
inventorySchema.index({ quantity: 1 });

const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;

// ─── Stock Movement / Audit Log ─────────────────────────────────────────────

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variant: mongoose.Schema.Types.ObjectId,
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    type: {
      type: String,
      enum: ["purchase", "sale", "return", "transfer_in", "transfer_out", "adjustment", "damage", "grn"],
      required: true,
    },
    quantity: { type: Number, required: true }, // positive=in, negative=out
    quantityBefore: Number,
    quantityAfter: Number,
    reference: String, // order ID, PO number, etc.
    referenceModel: String, // Order, PurchaseOrder, etc.
    note: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    unitCost: Number,
  },
  { timestamps: true }
);

stockMovementSchema.index({ product: 1, branch: 1 });
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ createdAt: -1 });

export const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
