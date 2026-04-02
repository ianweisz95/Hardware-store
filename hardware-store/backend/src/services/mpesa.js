import axios from "axios";
import logger from "../utils/logger.js";

const MPESA_BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// ─── Get Access Token ─────────────────────────────────────────────────────────
export const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  return res.data.access_token;
};

// ─── Generate Password ────────────────────────────────────────────────────────
const generatePassword = () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const str = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  return {
    password: Buffer.from(str).toString("base64"),
    timestamp,
  };
};

// ─── Format Phone Number ──────────────────────────────────────────────────────
export const formatPhone = (phone) => {
  // Convert 07... or +254... to 2547...
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+254")) return cleaned.replace("+", "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  return "254" + cleaned;
};

// ─── STK Push ─────────────────────────────────────────────────────────────────
export const initiateSTKPush = async ({ phone, amount, accountReference, transactionDesc, callbackUrl }) => {
  const token = await getAccessToken();
  const { password, timestamp } = generatePassword();
  const formattedPhone = formatPhone(phone);

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(amount), // M-Pesa requires integer amounts
    PartyA: formattedPhone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl || process.env.MPESA_CALLBACK_URL,
    AccountReference: accountReference || "HardwareStore",
    TransactionDesc: transactionDesc || "Payment",
  };

  logger.info(`STK Push initiated: ${formattedPhone} KES ${amount}`);

  const res = await axios.post(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return res.data;
};

// ─── STK Query (check payment status) ────────────────────────────────────────
export const querySTKStatus = async (checkoutRequestId) => {
  const token = await getAccessToken();
  const { password, timestamp } = generatePassword();

  const res = await axios.post(
    `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return res.data;
};

// ─── Parse STK Callback ───────────────────────────────────────────────────────
export const parseSTKCallback = (callbackData) => {
  const { Body } = callbackData;
  const { stkCallback } = Body;

  const result = {
    merchantRequestId: stkCallback.MerchantRequestID,
    checkoutRequestId: stkCallback.CheckoutRequestID,
    resultCode: stkCallback.ResultCode,
    resultDesc: stkCallback.ResultDesc,
    success: stkCallback.ResultCode === 0,
  };

  if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
    const items = stkCallback.CallbackMetadata.Item;
    const getValue = (name) => items.find((i) => i.Name === name)?.Value;

    result.mpesaReceiptNumber = getValue("MpesaReceiptNumber");
    result.amount = getValue("Amount");
    result.phoneNumber = String(getValue("PhoneNumber"));
    result.transactionDate = String(getValue("TransactionDate"));
    result.balance = getValue("Balance");
  }

  return result;
};

// ─── B2C (Sending money - refunds, etc.) ─────────────────────────────────────
export const b2cPayment = async ({ phone, amount, remarks, occasion }) => {
  const token = await getAccessToken();
  const formattedPhone = formatPhone(phone);

  const res = await axios.post(
    `${MPESA_BASE_URL}/mpesa/b2c/v1/paymentrequest`,
    {
      InitiatorName: process.env.MPESA_INITIATOR_NAME,
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
      CommandID: "BusinessPayment",
      Amount: Math.ceil(amount),
      PartyA: process.env.MPESA_SHORTCODE,
      PartyB: formattedPhone,
      Remarks: remarks || "Refund",
      QueueTimeOutURL: `${process.env.MPESA_CALLBACK_URL}/b2c/timeout`,
      ResultURL: `${process.env.MPESA_CALLBACK_URL}/b2c/result`,
      Occasion: occasion || "",
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return res.data;
};

export default {
  getAccessToken,
  initiateSTKPush,
  querySTKStatus,
  parseSTKCallback,
  b2cPayment,
  formatPhone,
};
