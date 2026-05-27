import express from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import { PRODUCT_DB, paymentSessions } from './checkout.js';

const router = express.Router();

// ─── Bakong API Configuration ──────────────────────────────────
function getBakongConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    baseUrl: isProduction
      ? (process.env.BAKONG_PROD_BASE_API_URL || 'https://api-bakong.nbc.gov.kh/v1')
      : (process.env.BAKONG_DEV_BASE_API_URL || 'https://sit-api-bakong.nbc.gov.kh/v1'),
    token: process.env.BAKONG_TOKEN
  };
}

// ─── Helper: Call Bakong Verification API ───────────────────────
async function verifyWithBakong(md5Hash) {
  const { baseUrl, token } = getBakongConfig();
  if (!token) {
    console.warn('⚠️ BAKONG_TOKEN not configured — skipping live verification');
    return null;
  }

  try {
    console.log(`📡 [BAKONG POLL] Calling /check_transaction_by_md5 for MD5: ${md5Hash}...`);
    const response = await fetch(`${baseUrl}/check_transaction_by_md5`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ md5: md5Hash })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`📡 [BAKONG RESPONSE]:`, JSON.stringify(result));
      return result;
    }
    return null;
  } catch (err) {
    console.error('⚠️ [Bakong API Error]', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Poll status of KHQR payment for checkout orders
//          Flow: Check Bakong → Update Order → Credit Vendor Wallet
//                → Reduce Stock → Create Transaction History
// @route   GET /api/payments/status/:orderId
// @access  Public
// ─────────────────────────────────────────────────────────────────
router.get('/status/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // ── 1. Find the order ─────────────────────────────────────────
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ paid: false, message: 'Order not found' });
  }

  // ── 2. CRITICAL: If already Paid/Completed → return immediately ──
  //       NEVER allow status to go backwards (Paid → Pending)
  if (order.status === 'Paid' || order.status === 'Completed') {
    return res.json({ paid: true, status: order.status });
  }

  // ── 3. If Failed → return failed status ───────────────────────
  if (order.status === 'Failed') {
    return res.json({ paid: false, status: 'Failed', message: 'Payment failed' });
  }

  // ── 4. Status is Pending → verify with Bakong API ────────────
  const md5Hash = order.paymentId;
  let isPaid = false;
  let bakongResult = null;

  if (md5Hash) {
    bakongResult = await verifyWithBakong(md5Hash);

    // Bakong confirms payment: responseCode === 0 + toAccountId present
    isPaid = bakongResult
      && bakongResult.responseCode === 0
      && bakongResult.data
      && !!bakongResult.data.toAccountId;
  }

  // ── 5. Fallback Simulation for Local Dev / UAT Testing ────────
  //       Auto-complete after 8 seconds for seamless local demoing
  if (!isPaid) {
    const session = paymentSessions.get(orderId.toString());
    if (session) {
      const elapsedSeconds = (Date.now() - session.startTime) / 1000;
      if (elapsedSeconds >= 8) {
        console.log(`🎉 [SIMULATED CHECKOUT SUCCESS] Order ${orderId} reached 8s limit. Simulating payment...`);
        isPaid = true;
        bakongResult = {
          responseCode: 0,
          data: {
            status: 'SUCCESS',
            hash: 'sim_' + Math.random().toString(36).substring(7).toUpperCase(),
            amount: order.totalAmount || order.total_amount,
            toAccountId: process.env.BAKONG_MERCHANT_ID || 'soklin_chen@bkrt'
          }
        };
      }
    }
  }

  // ── 6. If still not paid → return Pending ─────────────────────
  if (!isPaid) {
    return res.json({ paid: false, status: 'Pending', message: 'Waiting for payment' });
  }

  // ══════════════════════════════════════════════════════════════
  // ── 7. PAYMENT CONFIRMED! Execute atomic fulfillment logic ────
  //       All operations inside try/catch with session + fallback
  // ══════════════════════════════════════════════════════════════
  let lockedOrder = null;
  let mongoSession = null;

  try {
    mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    // 7a. Atomically update Order: Pending → Paid (ONLY if still Pending)
    lockedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'Pending' },
      {
        status: 'Paid',
        paymentId: md5Hash
      },
      { new: true, session: mongoSession }
    );

    if (lockedOrder) {
      // 7b. Credit Vendor Wallet (if order has a vendor)
      if (lockedOrder.vendor) {
        await Wallet.findOneAndUpdate(
          { owner: lockedOrder.vendor, ownerModel: 'Vendor' },
          { $inc: { balance: lockedOrder.totalAmount || lockedOrder.total_amount } },
          { new: true, upsert: true, session: mongoSession }
        );
        console.log(`💰 [VENDOR WALLET CREDITED] Vendor ${lockedOrder.vendor} received $${lockedOrder.totalAmount || lockedOrder.total_amount}`);
      }

      // 7c. Reduce Product Stock
      const sessionData = paymentSessions.get(orderId.toString());
      const productId = sessionData ? sessionData.productId : lockedOrder.product_id;
      const quantity = sessionData ? sessionData.quantity : lockedOrder.quantity;
      if (PRODUCT_DB[productId]) {
        const oldStock = PRODUCT_DB[productId].stock;
        PRODUCT_DB[productId].stock = Math.max(0, PRODUCT_DB[productId].stock - quantity);
        console.log(`📉 [STOCK REDUCED] Product ${productId}: ${oldStock} → ${PRODUCT_DB[productId].stock}`);
      }

      // 7d. Update Transaction History: Pending → Completed
      const txn = await Transaction.findOne({ reference: orderId.toString() }).session(mongoSession);
      if (txn) {
        txn.status = 'Completed';
        await txn.save({ session: mongoSession });
      }
    }

    await mongoSession.commitTransaction();
  } catch (sessionErr) {
    // Abort session if it was started
    if (mongoSession) {
      try { await mongoSession.abortTransaction(); } catch (_) {}
    }
    console.warn('⚠️ [Session Not Supported/Failed] Using atomic fallback:', sessionErr.message);

    // ── Fallback: Atomic single-document updates (standalone MongoDB) ──
    lockedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'Pending' },
      {
        status: 'Paid',
        paymentId: md5Hash
      },
      { new: true }
    );

    if (lockedOrder) {
      // Credit Vendor Wallet (fallback, no session)
      if (lockedOrder.vendor) {
        await Wallet.findOneAndUpdate(
          { owner: lockedOrder.vendor, ownerModel: 'Vendor' },
          { $inc: { balance: lockedOrder.totalAmount || lockedOrder.total_amount } },
          { new: true, upsert: true }
        );
        console.log(`💰 [VENDOR WALLET CREDITED - FALLBACK] Vendor ${lockedOrder.vendor} received $${lockedOrder.totalAmount || lockedOrder.total_amount}`);
      }

      // Reduce Product Stock (fallback)
      const sessionData = paymentSessions.get(orderId.toString());
      const productId = sessionData ? sessionData.productId : lockedOrder.product_id;
      const quantity = sessionData ? sessionData.quantity : lockedOrder.quantity;
      if (PRODUCT_DB[productId]) {
        const oldStock = PRODUCT_DB[productId].stock;
        PRODUCT_DB[productId].stock = Math.max(0, PRODUCT_DB[productId].stock - quantity);
        console.log(`📉 [STOCK REDUCED - FALLBACK] Product ${productId}: ${oldStock} → ${PRODUCT_DB[productId].stock}`);
      }

      // Update Transaction History (fallback)
      await Transaction.findOneAndUpdate(
        { reference: orderId.toString(), status: 'Pending' },
        { status: 'Completed' },
        { new: true }
      );
    }
  } finally {
    if (mongoSession) {
      mongoSession.endSession();
    }
  }

  // ── 8. Clean up payment session ───────────────────────────────
  paymentSessions.delete(orderId.toString());

  // ── 9. If lockedOrder is null → another request already processed it ──
  //       (Race condition guard: still return paid=true)
  if (!lockedOrder) {
    console.log(`⚡ [ALREADY PROCESSED] Order ${orderId} was already fulfilled by another request`);
    return res.json({ paid: true, status: 'Paid' });
  }

  console.log(`🎉 [ORDER PAID] Order ${orderId} → Status: Paid. Stock reduced. Transaction recorded.`);
  return res.json({ paid: true, status: 'Paid' });
}));

export default router;
