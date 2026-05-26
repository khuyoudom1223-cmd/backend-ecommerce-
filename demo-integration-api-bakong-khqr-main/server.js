require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { BakongKHQR, khqrData, IndividualInfo } = require("bakong-khqr");
const ui = require("./src/ui");

const app = express();
app.use(express.json());
app.use("/", ui);

const PORT = process.env.PORT || 3000;

const BAKONG_BASE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.BAKONG_PROD_BASE_API_URL
    : process.env.BAKONG_DEV_BASE_API_URL;

const BAKONG_ACCESS_TOKEN = process.env.BAKONG_ACCESS_TOKEN || process.env.BAKONG_TOKEN;
const BAKONG_ACCOUNT_ID = process.env.BAKONG_MERCHANT_ID;
const BAKONG_MERCHANT_NAME = process.env.BAKONG_MERCHANT_NAME || "Chandev Store";

// Function to generate KHQR
async function generateKHQR(amount, currency = "KHR", orderId = "ORDER_00001") {
  try {
    const expirationTimestamp = Date.now() + 5 * 60 * 1000; 
    const optionalData = {
      currency: currency === "KHR" ? khqrData.currency.khr : khqrData.currency.usd,
      amount: parseFloat(amount),
      billNumber: orderId,
      storeLabel: "Chandev", //update your name store or name you want.
      terminalLabel: "Online Payment",
      expirationTimestamp,
    };

    const individualInfo = new IndividualInfo(
      BAKONG_ACCOUNT_ID,
      BAKONG_MERCHANT_NAME,
      "Phnom Penh",
      optionalData
    );

    const khqr = new BakongKHQR();
    const qrData = khqr.generateIndividual(individualInfo);

    if (!qrData || !qrData.data) {
      throw new Error(`Invalid QR response: ${JSON.stringify(qrData)}`);
    }

    return {
      orderId,
      amount,
      currency,
      qr: qrData.data.qr,
      md5: qrData.data.md5,
      expiresAt: expirationTimestamp,
    };
  } catch (error) {
    console.error("❌ Failed to generate KHQR:", error);
    throw new Error("KHQR generation failed");
  }
}

// Function to check payment status
async function checkPayment(md5) {
  try {
    const response = await axios.post(
      `${BAKONG_BASE_URL}/check_transaction_by_md5`,
      { md5 },
      { headers: { Authorization: `Bearer ${BAKONG_ACCESS_TOKEN}` } }
    );

    const data = response.data;

    if (data.responseCode === 0 && data.data?.hash) {
      const isPaid = !!data.data.toAccountId;
      return {
        paid: isPaid,
        hash: data.data.hash,
        amount: data.data.amount,
        from: data.data.fromAccountId,
        to: isPaid ? data.data.toAccountId : "unknown",
        timestamp: new Date(data.data.createdDateMs).toLocaleString(),
      };
    }

    return { paid: false, hash: md5, amount: 0, from: "unknown", to: "unknown", timestamp: new Date().toLocaleString() };
  } catch (error) {
    console.error("❌ Error checking payment:", error.response?.data || error.message);
    return { paid: false, hash: md5, amount: 0, from: "unknown", to: "unknown", timestamp: new Date().toLocaleString() };
  }
}


// 1. Generate KHQR
app.post("/api/generate-khqr", async (req, res) => {
  const { amount, currency, orderId } = req.body;
  console.log("🔹 /api/generate-khqr called with:", req.body);

  if (!amount || !orderId) {
    console.log("❌ Missing amount or orderId");
    return res.status(400).json({ error: "amount and orderId are required" });
  }

  try {
    const payment = await generateKHQR(amount, currency || "KHR", orderId);
    console.log("✅ KHQR Generated:", payment);

    // just return QR info and md5
    res.json(payment);
  } catch (error) {
    console.error("❌ Error generating KHQR:", error.message);
    res.status(500).json({ error: error.message });
  }
});


// 2. Check payment status (loop until paid or timeout)
app.post("/api/check-payment", async (req, res) => {
  const { md5, interval = 2000, timeout = 60000 } = req.body; 
  console.log("🔹 /api/check-payment called with MD5:", md5);

  if (!md5) {
    console.log("❌ MD5 not provided");
    return res.status(400).json({ error: "md5 is required" });
  }

  const startTime = Date.now();

  const pollPayment = async () => {
    try {
      const result = await checkPayment(md5);
      console.log("💰 Payment Check Result:", result);

      // If payment completed
      if (result.paid) {
        console.log("✅ Payment completed for MD5:", md5);
        return res.json({ status: "paid", ...result });
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        console.log("⌛ Timeout: Payment not completed in time for MD5:", md5);
        return res.json({
          status: "timeout",
          paid: false,
          message: "Payment not completed in time",
        });
      }

      // Payment still pending, retry
      console.log("⏳ Payment pending, retrying...");
      setTimeout(pollPayment, interval);
    } catch (error) {
      console.error("❌ Error checking payment:", error.message);
      return res.status(500).json({ error: error.message });
    }
  };
  // Start loop
  pollPayment();
});


app.listen(PORT, () => {
  console.log(`🚀 Bakong KHQR API running on port ${PORT}`);
});
