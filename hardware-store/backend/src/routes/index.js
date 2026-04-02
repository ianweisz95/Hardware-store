import express from "express";
import * as authCtrl from "../controllers/authController.js";
import * as productCtrl from "../controllers/productController.js";
import * as paymentCtrl from "../controllers/paymentController.js";
import * as posCtrl from "../controllers/posController.js";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/auth/register", optionalAuth, authCtrl.register);
router.post("/auth/login", authCtrl.login);
router.post("/auth/refresh", authCtrl.refreshToken);
router.post("/auth/logout", authenticate, authCtrl.logout);
router.get("/auth/me", authenticate, authCtrl.getMe);
router.put("/auth/profile", authenticate, authCtrl.updateProfile);
router.put("/auth/password", authenticate, authCtrl.changePassword);

// ─── Products ────────────────────────────────────────────────────────────────
router.get("/products", optionalAuth, productCtrl.getProducts);
router.get("/products/barcode/:barcode", authenticate, productCtrl.getByBarcode);
router.get("/products/:id", optionalAuth, productCtrl.getProduct);
router.post("/products", authenticate, authorize("admin", "manager"), productCtrl.createProduct);
router.put("/products/:id", authenticate, authorize("admin", "manager"), productCtrl.updateProduct);
router.delete("/products/:id", authenticate, authorize("admin", "manager"), productCtrl.deleteProduct);

// ─── Inventory ────────────────────────────────────────────────────────────────
router.get("/inventory", authenticate, authorize("admin", "manager", "cashier"), productCtrl.getInventory);
router.post("/inventory/adjust", authenticate, authorize("admin", "manager"), productCtrl.adjustStock);
router.get("/inventory/movements", authenticate, authorize("admin", "manager"), productCtrl.getStockMovements);

// ─── POS ─────────────────────────────────────────────────────────────────────
router.post("/pos/sale", authenticate, authorize("admin", "manager", "cashier"), posCtrl.createPOSSale);
router.get("/pos/orders", authenticate, authorize("admin", "manager", "cashier"), posCtrl.getPOSOrders);
router.get("/pos/daily-summary", authenticate, authorize("admin", "manager", "cashier"), posCtrl.getDailySummary);
router.put("/pos/orders/:id/void", authenticate, authorize("admin", "manager"), posCtrl.voidSale);

// ─── Payments ─────────────────────────────────────────────────────────────────
router.post("/payments/mpesa/initiate", authenticate, paymentCtrl.initiateMpesaPayment);
router.post("/payments/mpesa/callback", paymentCtrl.mpesaCallback); // No auth - Safaricom webhook
router.get("/payments/mpesa/:paymentId/status", authenticate, paymentCtrl.queryPaymentStatus);
router.get("/payments", authenticate, authorize("admin", "manager"), paymentCtrl.getPayments);

// ─── Categories ───────────────────────────────────────────────────────────────
import Category from "../models/Category.js";
import { asyncHandler } from "../middleware/error.js";

router.get("/categories", asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).populate("children").sort("sortOrder");
  res.json({ success: true, data: categories });
}));

router.post("/categories", authenticate, authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const cat = await Category.create(req.body);
  res.status(201).json({ success: true, data: cat });
}));

// ─── Users (Admin) ────────────────────────────────────────────────────────────
import User from "../models/User.js";

router.get("/users", authenticate, authorize("admin"), asyncHandler(async (req, res) => {
  const { role, branch, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (branch) filter.branch = branch;
  const users = await User.find(filter)
    .populate("branch", "name code")
    .sort("-createdAt")
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));
  const total = await User.countDocuments(filter);
  res.json({ success: true, data: users, pagination: { total } });
}));

router.put("/users/:id", authenticate, authorize("admin"), asyncHandler(async (req, res) => {
  const { name, email, phone, role, branch, isActive, creditLimit } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, phone, role, branch, isActive, creditLimit },
    { new: true, runValidators: true }
  );
  res.json({ success: true, data: user });
}));

// ─── Branches ─────────────────────────────────────────────────────────────────
import { Branch } from "../models/Branch.js";

router.get("/branches", authenticate, asyncHandler(async (req, res) => {
  const branches = await Branch.find({ isActive: true }).populate("manager", "name email");
  res.json({ success: true, data: branches });
}));

router.post("/branches", authenticate, authorize("admin"), asyncHandler(async (req, res) => {
  const branch = await Branch.create(req.body);
  res.status(201).json({ success: true, data: branch });
}));

// ─── Suppliers ─────────────────────────────────────────────────────────────────
import { Supplier, PurchaseOrder } from "../models/Branch.js";

router.get("/suppliers", authenticate, authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({ isActive: true });
  res.json({ success: true, data: suppliers });
}));

router.post("/suppliers", authenticate, authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ success: true, data: supplier });
}));

router.put("/suppliers/:id", authenticate, authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: supplier });
}));

// ─── Purchase Orders ──────────────────────────────────────────────────────────
router.get("/purchase-orders", authenticate, authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const pos = await PurchaseOrder.find(filter)
    .populate("supplier", "name phone")
    .populate("branch", "name")
    .populate("createdBy", "name")
    .sort("-createdAt");
  res.json({ success: true, data: pos });
}));

router.post("/purchase-orders", authenticate, authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: po });
}));

// ─── Reports / Analytics ──────────────────────────────────────────────────────
import Order from "../models/Order.js";
import mongoose from "mongoose";

router.get("/reports/sales", authenticate, authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const { from, to, branchId, groupBy = "day" } = req.query;

  const match = {
    status: { $in: ["completed", "delivered"] },
    paymentStatus: "paid",
  };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);
  if (req.user.role !== "admin") match.branch = new mongoose.Types.ObjectId(req.user.branch);

  const dateFormat = groupBy === "month" ? "%Y-%m" : groupBy === "year" ? "%Y" : "%Y-%m-%d";

  const sales = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
        count: { $sum: 1 },
        revenue: { $sum: "$total" },
        profit: { $sum: { $subtract: ["$total", { $sum: { $map: { input: "$items", as: "i", in: { $multiply: ["$$i.costPrice", "$$i.quantity"] } } } }] } },
        discount: { $sum: "$discountAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: sales });
}));

router.get("/reports/top-products", authenticate, authorize("admin", "manager"), asyncHandler(async (req, res) => {
  const { from, to, limit = 10 } = req.query;
  const match = { status: { $in: ["completed", "delivered"] } };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const products = await Order.aggregate([
    { $match: match },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", name: { $first: "$items.name" }, totalQty: { $sum: "$items.quantity" }, totalRevenue: { $sum: "$items.total" } } },
    { $sort: { totalRevenue: -1 } },
    { $limit: Number(limit) },
  ]);

  res.json({ success: true, data: products });
}));

export default router;
