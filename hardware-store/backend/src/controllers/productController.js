import Product from "../models/Product.js";
import Inventory, { StockMovement } from "../models/Inventory.js";
import { asyncHandler } from "../middleware/error.js";

// ─── Get All Products ─────────────────────────────────────────────────────────
export const getProducts = asyncHandler(async (req, res) => {
  const {
    search, category, brand, minPrice, maxPrice,
    page = 1, limit = 20, sort = "-createdAt",
    isActive, isFeatured, branchId
  } = req.query;

  const filter = {};
  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";
  // Online customers only see visible products
  if (req.user?.role === "customer") filter.isOnlineVisible = true;

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .populate("supplier", "name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  // Attach inventory if branch specified
  let inventory = {};
  if (branchId) {
    const invRecords = await Inventory.find({
      product: { $in: products.map((p) => p._id) },
      branch: branchId,
    });
    invRecords.forEach((inv) => {
      inventory[inv.product.toString()] = inv;
    });
  }

  const productsWithStock = products.map((p) => ({
    ...p.toJSON(),
    inventory: inventory[p._id.toString()] || null,
  }));

  res.json({
    success: true,
    data: productsWithStock,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// ─── Get Single Product ───────────────────────────────────────────────────────
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    $or: [{ _id: req.params.id }, { slug: req.params.id }],
  })
    .populate("category", "name slug")
    .populate("subcategory", "name slug")
    .populate("supplier", "name phone");

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  // Get inventory for all branches
  const inventory = await Inventory.find({ product: product._id }).populate("branch", "name code");

  res.json({ success: true, data: { ...product.toJSON(), inventory } });
});

// ─── Create Product ───────────────────────────────────────────────────────────
export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);

  // Initialize inventory for all branches if trackInventory
  if (product.trackInventory && req.body.initialStock) {
    const { Branch } = await import("../models/Branch.js");
    const branches = await Branch.find({ isActive: true });
    const invDocs = branches.map((b) => ({
      product: product._id,
      branch: b._id,
      quantity: 0,
      lowStockThreshold: product.lowStockThreshold,
    }));
    await Inventory.insertMany(invDocs, { ordered: false });
  }

  res.status(201).json({ success: true, data: product });
});

// ─── Update Product ───────────────────────────────────────────────────────────
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, data: product });
});

// ─── Delete Product ───────────────────────────────────────────────────────────
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, message: "Product deactivated" });
});

// ─── Search by Barcode ────────────────────────────────────────────────────────
export const getByBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.params;
  const product = await Product.findOne({
    $or: [{ barcode }, { "variants.barcode": barcode }],
    isActive: true,
  }).populate("category", "name");

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  // Find the matching variant if barcode is on a variant
  let variant = null;
  if (product.hasVariants) {
    variant = product.variants.find((v) => v.barcode === barcode);
  }

  res.json({ success: true, data: { product, variant } });
});

// ─── Get Inventory ────────────────────────────────────────────────────────────
export const getInventory = asyncHandler(async (req, res) => {
  const { branchId, lowStock } = req.query;
  const filter = {};
  if (branchId) filter.branch = branchId;
  if (lowStock === "true") {
    filter.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
  }

  const inventory = await Inventory.find(filter)
    .populate("product", "name sku barcode images price unit")
    .populate("branch", "name code");

  res.json({ success: true, data: inventory });
});

// ─── Adjust Stock ─────────────────────────────────────────────────────────────
export const adjustStock = asyncHandler(async (req, res) => {
  const { productId, branchId, quantity, type, note } = req.body;

  const inventory = await Inventory.findOne({ product: productId, branch: branchId });
  if (!inventory) {
    return res.status(404).json({ success: false, message: "Inventory record not found" });
  }

  const quantityBefore = inventory.quantity;
  inventory.quantity += quantity;
  if (inventory.quantity < 0) inventory.quantity = 0;
  await inventory.save();

  // Record movement
  await StockMovement.create({
    product: productId,
    branch: branchId,
    type,
    quantity,
    quantityBefore,
    quantityAfter: inventory.quantity,
    note,
    performedBy: req.user._id,
  });

  res.json({ success: true, data: inventory });
});

// ─── Get Stock Movements ──────────────────────────────────────────────────────
export const getStockMovements = asyncHandler(async (req, res) => {
  const { productId, branchId, type, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (productId) filter.product = productId;
  if (branchId) filter.branch = branchId;
  if (type) filter.type = type;

  const movements = await StockMovement.find(filter)
    .populate("product", "name sku")
    .populate("branch", "name")
    .populate("performedBy", "name")
    .sort("-createdAt")
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ success: true, data: movements });
});
