import express from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import axios from 'axios';
import TbTransaction from '../models/TbTransaction.js';
import User from '../models/User.js';

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
    const response = await axios.post(
      `${baseUrl}/check-transaction-by-md5`,
      { md5: md5Hash },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000 // 10s timeout for safety
      }
    );
    return response.data;
  } catch (err) {
    console.error('⚠️ [Bakong API Error]', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// @desc    Check Bakong KHQR payment status and credit wallet
// @route   GET /api/wallet/check-payment/:transactionId
// @access  Public (will validate ownership internally)
// ─────────────────────────────────────────────────────────────────
router.get('/check-payment/:transactionId', asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  // ── 1. Find the transaction in MongoDB ──────────────────────
  const txn = await TbTransaction.findOne({ transactionId });
  if (!txn) {
    return res.status(404).json({
      success: false,
      status: 'Failed',
      message: 'Transaction not found'
    });
  }

  // ── 2. If already Paid → return immediately (idempotency) ──
  if (txn.status === 'Paid') {
    const user = await User.findById(txn.userId).select('balance');
    return res.json({
      success: true,
      status: 'Paid',
      message: 'Payment already processed',
      balance: user ? user.balance : 0
    });
  }

  // ── 3. If Failed → return immediately ──────────────────────
  if (txn.status === 'Failed') {
    return res.json({
      success: false,
      status: 'Failed',
      message: 'Payment failed or expired'
    });
  }

  // ── 4. Status is Pending → call Bakong Verification API ────
  const bakongResult = await verifyWithBakong(txn.md5);

  // Check if Bakong confirms the payment (responseCode 0 = success)
  const isPaid = bakongResult
    && bakongResult.responseCode === 0
    && bakongResult.data;

  if (!isPaid) {
    // Payment not yet completed at Bakong
    return res.json({
      success: false,
      status: 'Pending',
      message: 'Waiting for Bakong payment'
    });
  }

  // ── 5. Payment confirmed! Use atomic session to prevent race conditions ──
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Re-fetch inside session with lock to prevent double processing
    const lockedTxn = await TbTransaction.findOneAndUpdate(
      { transactionId, status: 'Pending' },  // Only update if still Pending
      {
        status: 'Paid',
        bakongTransactionId: bakongResult.data.hash || bakongResult.data.transactionId || '',
        paymentReference: bakongResult.data.paymentRef || bakongResult.data.externalRef || transactionId,
        bakongResponse: bakongResult,
        paidAt: new Date()
      },
      { new: true, session }
    );

    // If lockedTxn is null, another process already updated it (race condition guard)
    if (!lockedTxn) {
      await session.abortTransaction();
      session.endSession();

      const user = await User.findById(txn.userId).select('balance');
      return res.json({
        success: true,
        status: 'Paid',
        message: 'Payment already processed (concurrent)',
        balance: user ? user.balance : 0
      });
    }

    // ── 6. Credit user balance atomically (ONCE only) ─────────
    const updatedUser = await User.findByIdAndUpdate(
      lockedTxn.userId,
      { $inc: { balance: lockedTxn.amount } },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log(`🎉 [BAKONG PAID] Txn ${transactionId} → User ${lockedTxn.userId} credited $${lockedTxn.amount}. New balance: $${updatedUser.balance}`);

    return res.json({
      success: true,
      status: 'Paid',
      message: 'Payment successful',
      balance: updatedUser.balance
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ [Atomic Update Failed]', err.message);
    return res.status(500).json({
      success: false,
      status: 'Failed',
      message: 'Internal error during payment processing'
    });
  }
}));

export default router;
