import MpesaPayment from "../models/Payment.js";
import Order from "../models/Order.js";
import { initiateSTKPush, querySTKStatus, parseSTKCallback } from "../services/mpesa.js";
import { asyncHandler } from "../middleware/error.js";
import logger from "../utils/logger.js";

// ─── Initiate STK Push ────────────────────────────────────────────────────────
export const initiateMpesaPayment = asyncHandler(async (req, res) => {
  const { phone, amount, orderId, accountReference } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ success: false, message: "Phone and amount required" });
  }

  // If tied to an order, validate it
  let order = null;
  if (orderId) {
    order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
  }

  // Initiate with Safaricom
  const stkResponse = await initiateSTKPush({
    phone,
    amount: amount || order?.total,
    accountReference: accountReference || order?.orderNumber || "PAYMENT",
    transactionDesc: `Payment for ${accountReference || order?.orderNumber}`,
  });

  if (stkResponse.ResponseCode !== "0") {
    return res.status(400).json({
      success: false,
      message: stkResponse.ResponseDescription || "STK Push failed",
    });
  }

  // Save pending payment record
  const payment = await MpesaPayment.create({
    merchantRequestId: stkResponse.MerchantRequestID,
    checkoutRequestId: stkResponse.CheckoutRequestID,
    phoneNumber: phone,
    amount,
    accountReference: accountReference || order?.orderNumber,
    order: orderId,
    branch: order?.branch || req.user?.branch,
    initiatedBy: req.user?._id,
    status: "pending",
    timeoutAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min timeout
  });

  res.json({
    success: true,
    message: "STK Push sent. Check your phone to complete payment.",
    data: {
      paymentId: payment._id,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      customerMessage: stkResponse.CustomerMessage,
    },
  });
});

// ─── M-Pesa STK Callback ──────────────────────────────────────────────────────
export const mpesaCallback = asyncHandler(async (req, res) => {
  // Acknowledge immediately (Safaricom expects fast response)
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  try {
    const parsed = parseSTKCallback(req.body);
    logger.info(`M-Pesa callback: ${parsed.checkoutRequestId} - ${parsed.resultDesc}`);

    const payment = await MpesaPayment.findOne({
      checkoutRequestId: parsed.checkoutRequestId,
    });

    if (!payment) {
      logger.warn(`Payment not found for checkoutRequestId: ${parsed.checkoutRequestId}`);
      return;
    }

    // Update payment record
    payment.resultCode = parsed.resultCode;
    payment.resultDesc = parsed.resultDesc;
    payment.callbackRaw = req.body;

    if (parsed.success) {
      payment.status = "completed";
      payment.mpesaReceiptNumber = parsed.mpesaReceiptNumber;
      payment.transactionDate = parsed.transactionDate;
      payment.completedAt = new Date();

      // Update associated order if exists
      if (payment.order) {
        const order = await Order.findById(payment.order);
        if (order) {
          // Add payment to order's payments array
          order.payments.push({
            method: "mpesa",
            amount: parsed.amount,
            reference: parsed.mpesaReceiptNumber,
            mpesaTransactionId: parsed.mpesaReceiptNumber,
            paidAt: new Date(),
            status: "completed",
          });

          order.amountPaid = (order.amountPaid || 0) + parsed.amount;

          // Update payment status
          if (order.amountPaid >= order.total) {
            order.paymentStatus = "paid";
            if (order.type === "pos") order.status = "completed";
            else order.status = "confirmed";
          } else if (order.amountPaid > 0) {
            order.paymentStatus = "partial";
          }

          await order.save();
          logger.info(`Order ${order.orderNumber} payment updated via M-Pesa`);
        }
      }
    } else {
      payment.status = parsed.resultCode === 1032 ? "cancelled" : "failed";
    }

    await payment.save();
  } catch (err) {
    logger.error("Error processing M-Pesa callback:", err);
  }
});

// ─── Query Payment Status ─────────────────────────────────────────────────────
export const queryPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await MpesaPayment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  // If still pending, query Safaricom
  if (payment.status === "pending") {
    try {
      const queryResult = await querySTKStatus(payment.checkoutRequestId);
      if (queryResult.ResultCode === "0") {
        payment.status = "completed";
        await payment.save();
      } else if (queryResult.ResultCode !== undefined) {
        payment.status = "failed";
        await payment.save();
      }
    } catch (err) {
      logger.warn("STK query failed:", err.message);
    }
  }

  res.json({ success: true, data: payment });
});

// ─── Get Payments ─────────────────────────────────────────────────────────────
export const getPayments = asyncHandler(async (req, res) => {
  const { status, orderId, phone, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (orderId) filter.order = orderId;
  if (phone) filter.phoneNumber = { $regex: phone };
  if (req.user.role !== "admin") filter.branch = req.user.branch;

  const [payments, total] = await Promise.all([
    MpesaPayment.find(filter)
      .populate("order", "orderNumber total")
      .sort("-createdAt")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    MpesaPayment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: payments,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});
