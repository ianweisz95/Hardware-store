import mongoose from "mongoose";

const mpesaPaymentSchema = new mongoose.Schema(
  {
    // STK Push request details
    merchantRequestId: String,
    checkoutRequestId: String,

    // Payment details
    phoneNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    accountReference: String,
    transactionDesc: String,

    // Status
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled", "timeout"],
      default: "pending",
    },

    // Callback data (from Safaricom)
    resultCode: Number,
    resultDesc: String,
    mpesaReceiptNumber: String,
    transactionDate: String,
    balance: Number,

    // Reconciliation
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Raw callback data for audit
    callbackRaw: mongoose.Schema.Types.Mixed,

    // Timing
    initiatedAt: { type: Date, default: Date.now },
    completedAt: Date,
    timeoutAt: Date,
  },
  { timestamps: true }
);

mpesaPaymentSchema.index({ checkoutRequestId: 1 });
mpesaPaymentSchema.index({ mpesaReceiptNumber: 1 });
mpesaPaymentSchema.index({ order: 1 });
mpesaPaymentSchema.index({ status: 1 });
mpesaPaymentSchema.index({ phoneNumber: 1 });

const MpesaPayment = mongoose.model("MpesaPayment", mpesaPaymentSchema);
export default MpesaPayment;
