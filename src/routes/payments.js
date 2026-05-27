import express from 'express';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import { PRODUCT_DB, paymentSessions } from './checkout.js';
import { success, error } from '../utils/response.js';

const router = express.Router();

// @desc    Poll status of KHQR payment
// @route   GET /api/payments/status/:orderId
// @access  Public
router.get('/status/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ paid: false, message: 'Order not found' });
  }

  // If already paid, return true
  if (order.status === 'Paid' || order.status === 'Completed') {
    return res.json({ paid: true });
  }

  // Check in-memory payment session
  const session = paymentSessions.get(orderId.toString());
  if (session) {
    const secondsElapsed = (Date.now() - session.startTime) / 1000;
    
    // Simulate a successful payment after 8 seconds of scanning!
    if (secondsElapsed >= 8) {
      // 1. Update Order Status to Paid
      order.status = 'Paid';
      await order.save();

      // 2. Reduce Product Stock
      const { productId, quantity, transactionId } = session;
      if (PRODUCT_DB[productId]) {
        const originalStock = PRODUCT_DB[productId].stock;
        PRODUCT_DB[productId].stock = Math.max(0, PRODUCT_DB[productId].stock - quantity);
        console.log(`📉 Stock Reduced for Product ${productId}: ${originalStock} ➡️ ${PRODUCT_DB[productId].stock}`);
      }

      // 3. Update Transaction History Status to Completed
      if (transactionId) {
        await Transaction.findByIdAndUpdate(transactionId, { status: 'Completed' });
        console.log(`💼 Transaction ${transactionId} updated to Completed.`);
      }

      // Clean up payment session
      paymentSessions.delete(orderId.toString());

      console.log(`🎉 [PAYMENT SUCCESS] Order ${orderId} marked as Paid. Transaction Completed. Stock Reduced.`);
      return res.json({ paid: true });
    }
  }

  return res.json({ paid: false });
}));

export default router;
