import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Inventory, { StockMovement } from "../models/Inventory.js";
import { asyncHandler } from "../middleware/error.js";
import { initiateSTKPush } from "../services/mpesa.js";
import MpesaPayment from "../models/Payment.js";
import mongoose from "mongoose";

// ─── Create POS Sale ──────────────────────────────────────────────────────────
export const createPOSSale = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items, customerId, customerName, customerPhone,
      paymentMethod, cashReceived, mpesaPhone,
      discountAmount = 0, notes,
    } = req.body;

    const branchId = req.user.branch;
    if (!branchId) {
      return res.status(400).json({ success: false, message: "Cashier must be assigned to a branch" });
    }

    // Validate and enrich items
    const enrichedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }

      // Check inventory
      const inventory = await Inventory.findOne({
        product: product._id,
        branch: branchId,
      }).session(session);

      if (product.trackInventory && (!inventory || inventory.availableQuantity < item.quantity)) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const unitPrice = item.unitPrice || product.effectivePrice || product.price;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      enrichedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: item.quantity,
        unitPrice,
        costPrice: product.costPrice || 0,
        taxRate: product.taxRate || 16,
        taxAmount: (itemTotal * (product.taxRate || 16)) / 116,
        total: itemTotal,
      });
    }

    const taxAmount = enrichedItems.reduce((s, i) => s + i.taxAmount, 0);
    const total = subtotal - discountAmount;
    const change = paymentMethod === "cash" ? Math.max(0, (cashReceived || 0) - total) : 0;

    // Create order
    const order = await Order.create(
      [
        {
          type: "pos",
          status: paymentMethod === "mpesa" ? "pending" : "completed",
          paymentStatus: paymentMethod === "mpesa" ? "unpaid" : "paid",
          customer: customerId,
          customerName: customerName || "Walk-in",
          customerPhone,
          branch: branchId,
          cashier: req.user._id,
          items: enrichedItems,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          amountPaid: paymentMethod === "cash" ? (cashReceived || total) : 0,
          change,
          paymentMethod,
          payments: paymentMethod === "cash"
            ? [{ method: "cash", amount: total, paidAt: new Date(), status: "completed" }]
            : [],
          notes,
        },
      ],
      { session }
    );

    // Deduct inventory for non-mpesa (immediate sale)
    if (paymentMethod !== "mpesa") {
      for (const item of enrichedItems) {
        const inv = await Inventory.findOneAndUpdate(
          { product: item.product, branch: branchId },
          { $inc: { quantity: -item.quantity } },
          { session, new: true }
        );

        await StockMovement.create(
          [
            {
              product: item.product,
              branch: branchId,
              type: "sale",
              quantity: -item.quantity,
              quantityBefore: (inv?.quantity || 0) + item.quantity,
              quantityAfter: inv?.quantity || 0,
              reference: order[0].orderNumber,
              referenceModel: "Order",
              performedBy: req.user._id,
            },
          ],
          { session }
        );
      }
    }

    await session.commitTransaction();

    // Trigger STK Push for M-Pesa
    let mpesaData = null;
    if (paymentMethod === "mpesa" && mpesaPhone) {
      try {
        const stkResponse = await initiateSTKPush({
          phone: mpesaPhone,
          amount: total,
          accountReference: order[0].orderNumber,
          transactionDesc: `POS Sale - ${order[0].orderNumber}`,
        });

        mpesaData = await MpesaPayment.create({
          merchantRequestId: stkResponse.MerchantRequestID,
          checkoutRequestId: stkResponse.CheckoutRequestID,
          phoneNumber: mpesaPhone,
          amount: total,
          accountReference: order[0].orderNumber,
          order: order[0]._id,
          branch: branchId,
          initiatedBy: req.user._id,
          status: "pending",
        });
      } catch (err) {
        // STK Push failed — order still created, handle manually
      }
    }

    const populatedOrder = await Order.findById(order[0]._id).populate("items.product", "name sku");

    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data: {
        order: populatedOrder,
        mpesaPaymentId: mpesaData?._id,
        checkoutRequestId: mpesaData?.checkoutRequestId,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// ─── Get POS Orders ───────────────────────────────────────────────────────────
export const getPOSOrders = asyncHandler(async (req, res) => {
  const { date, page = 1, limit = 50, status } = req.query;
  const filter = { type: "pos", branch: req.user.branch };

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  }
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("cashier", "name")
      .populate("customer", "name phone")
      .sort("-createdAt")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, data: orders, pagination: { page: Number(page), total } });
});

// ─── Daily Summary ────────────────────────────────────────────────────────────
export const getDailySummary = asyncHandler(async (req, res) => {
  const { date = new Date().toISOString().slice(0, 10) } = req.query;
  const branchId = req.user.branch;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const [summary] = await Order.aggregate([
    {
      $match: {
        type: "pos",
        branch: new mongoose.Types.ObjectId(branchId),
        createdAt: { $gte: start, $lte: end },
        status: { $in: ["completed", "delivered"] },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: "$total" },
        totalCash: {
          $sum: {
            $reduce: {
              input: "$payments",
              initialValue: 0,
              in: {
                $cond: [{ $eq: ["$$this.method", "cash"] }, { $add: ["$$value", "$$this.amount"] }, "$$value"],
              },
            },
          },
        },
        totalMpesa: {
          $sum: {
            $reduce: {
              input: "$payments",
              initialValue: 0,
              in: {
                $cond: [{ $eq: ["$$this.method", "mpesa"] }, { $add: ["$$value", "$$this.amount"] }, "$$value"],
              },
            },
          },
        },
        totalDiscount: { $sum: "$discountAmount" },
        totalTax: { $sum: "$taxAmount" },
        avgOrderValue: { $avg: "$total" },
      },
    },
  ]);

  // Top products of the day
  const topProducts = await Order.aggregate([
    {
      $match: {
        type: "pos",
        branch: new mongoose.Types.ObjectId(branchId),
        createdAt: { $gte: start, $lte: end },
        status: { $in: ["completed", "delivered"] },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $first: "$items.name" },
        totalQty: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.total" },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 5 },
  ]);

  res.json({
    success: true,
    data: {
      date,
      summary: summary || {
        totalSales: 0, totalRevenue: 0, totalCash: 0,
        totalMpesa: 0, totalDiscount: 0, totalTax: 0, avgOrderValue: 0,
      },
      topProducts,
    },
  });
});

// ─── Void / Refund Sale ───────────────────────────────────────────────────────
export const voidSale = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  if (order.type !== "pos") return res.status(400).json({ success: false, message: "Not a POS order" });
  if (order.status === "cancelled") return res.status(400).json({ success: false, message: "Order already cancelled" });

  // Restore inventory
  for (const item of order.items) {
    await Inventory.findOneAndUpdate(
      { product: item.product, branch: order.branch },
      { $inc: { quantity: item.quantity } }
    );
    await StockMovement.create({
      product: item.product,
      branch: order.branch,
      type: "return",
      quantity: item.quantity,
      reference: order.orderNumber,
      note: `Voided: ${reason}`,
      performedBy: req.user._id,
    });
  }

  order.status = "cancelled";
  order.paymentStatus = "refunded";
  order.cancelReason = reason;
  await order.save();

  res.json({ success: true, message: "Sale voided successfully", data: order });
});
