import express from 'express';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import { success, error } from '../utils/response.js';

const router = express.Router();

// Store payment initiation times in memory to simulate Bakong payment processing
const paymentSessions = new Map();

// @desc    Generate Bakong KHQR payload
// @route   POST /api/payments/khqr
// @access  Public
router.post('/khqr', asyncHandler(async (req, res) => {
  const { order_id, amount, customer_name } = req.body;

  if (!order_id) {
    return error(res, 400, 'Order ID is required to generate payment');
  }

  // Create an EMVCo compliant KHQR mock string
  // Format based on standard EMVCo specifications for Bakong KHQR
  const mockKHQRString = `000201010212373000160123456789ABCDEF0208123456785204599953038405802KH5912${encodeURIComponent(customer_name || 'Bakong Customer')}6010Phnom Penh6304` + Math.random().toString(36).substring(7).toUpperCase();

  // Save transaction session timestamp
  paymentSessions.set(order_id.toString(), Date.now());

  return res.json({
    success: true,
    order_id,
    khqr: {
      qr_string: mockKHQRString,
      qr_image_url: null // Frontend will auto-convert qr_string to a gorgeous 2D barcode dynamically
    }
  });
}));

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

  // Check if this order was recently initiated for payment
  const startTime = paymentSessions.get(orderId.toString());
  if (startTime) {
    const secondsElapsed = (Date.now() - startTime) / 1000;
    
    // Simulate a successful payment after 8 seconds of scanning!
    if (secondsElapsed >= 8) {
      order.status = 'Paid';
      await order.save();
      paymentSessions.delete(orderId.toString()); // clean up memory
      console.log(`🎉 Payment simulation successful for Order ${orderId}! Marked as Paid in MongoDB.`);
      return res.json({ paid: true });
    }
  }

  return res.json({ paid: false });
}));

export default router;
