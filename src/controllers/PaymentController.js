import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import { createPayWayPayment, verifyPayWayPayment } from '../services/payway.js';
import { generateQRCode } from '../services/qrcode.js';
import { success, error } from '../utils/response.js';

// Create a new order (public endpoint, but will be associated with logged‑in user)
export const createOrder = asyncHandler(async (req, res) => {
  const { vendorId, items, paymentMethod } = req.body;
  if (!vendorId || !items?.length || !paymentMethod) {
    return error(res, 400, 'Missing required fields');
  }

  // Calculate total amount
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = await Order.create({
    user: req.user._id,
    vendor: vendorId,
    items,
    totalAmount,
    paymentMethod,
    status: 'Pending'
  });

  // If payment method is PayWay, create external payment and return URL
  if (paymentMethod === 'PayWay') {
    const payWayResult = await createPayWayPayment(order);
    // Store external paymentId for later verification
    order.paymentId = payWayResult.paymentId;
    await order.save();
    return success(res, { orderId: order._id, paymentUrl: payWayResult.paymentUrl });
  }

  // If wallet payment, frontend will call wallet transfer endpoint later
  return success(res, { orderId: order._id, message: 'Order created, proceed with wallet payment' });
});

// Callback endpoint for PayWay to notify payment status (public, token‑less)
export const payWayCallback = asyncHandler(async (req, res) => {
  const { paymentId, status } = req.body; // Adjust based on actual PayWay webhook payload
  const order = await Order.findOne({ paymentId });
  if (!order) return error(res, 404, 'Order not found for payment');

  if (status === 'SUCCESS') {
    order.status = 'Paid';
    await order.save();
    // Optionally trigger wallet credit to vendor if needed
    return success(res, { message: 'Payment confirmed' });
  }

  // For other statuses, mark order accordingly
  order.status = 'Cancelled';
  await order.save();
  return success(res, { message: 'Payment failed or cancelled' });
});

// Get QR code for an order (used for QR‑code payment method)
export const getOrderQRCode = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) return error(res, 404, 'Order not found');

  const qrText = `${process.env.BASE_URL}/api/payments/payway/checkout?orderId=${orderId}`;
  const qrDataUrl = await generateQRCode(qrText);
  return success(res, { qrDataUrl });
});

// Verify PayWay payment status manually (optional endpoint for frontend polling)
export const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.query;
  if (!paymentId) return error(res, 400, 'paymentId is required');
  const result = await verifyPayWayPayment(paymentId);
  return success(res, { result });
});
