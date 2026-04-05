import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "50kg bag", "2m length"
  sku: { type: String, required: true, unique: true, sparse: true },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0 },
  barcode: String,
  attributes: mongoose.Schema.Types.Mixed, // { size: "50kg", color: "grey" }
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: "text",
    },
    slug: { type: String, unique: true, lowercase: true },
    description: String,
    shortDescription: String,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    brand: { type: String, trim: true },
    sku: { type: String, unique: true, sparse: true },
    barcode: { type: String, sparse: true },

    // Pricing
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    taxRate: { type: Number, default: 16 }, // Kenya VAT 16%

    // Variants (e.g., sizes, weights)
    hasVariants: { type: Boolean, default: false },
    variants: [variantSchema],

    // Media
    images: [
      {
        url: String,
        alt: String,
        isPrimary: Boolean,
      },
    ],

    // Status
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isOnlineVisible: { type: Boolean, default: true },

    // Inventory settings
    trackInventory: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 10 },
    unit: { type: String, default: "piece" }, // bag, piece, roll, litre, kg

    // SEO
    metaTitle: String,
    metaDescription: String,
    tags: [String],

    // Supplier
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },

    // Stats (denormalized for performance)
    totalSold: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: effective price after discount
productSchema.virtual("effectivePrice").get(function () {
  if (this.discountPercent > 0) {
    return this.price * (1 - this.discountPercent / 100);
  }
  return this.price;
});

// Auto-generate slug
productSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ sku: 1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
