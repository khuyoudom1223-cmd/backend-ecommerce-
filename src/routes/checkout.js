import express from 'express';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import { success, error } from '../utils/response.js';

const router = express.Router();

// Simulated MongoDB-backed Product Database in memory (persisted during server runtime)
export const PRODUCT_DB = {
  1: { name: "Azurea Classic Trench Coat", price: 99.99, stock: 15 },
  2: { name: "Royal Velvet Evening Gown", price: 149.99, stock: 8 },
  3: { name: "Minimalist Linen Summer Shirt", price: 49.99, stock: 25 },
  4: { name: "Slim-Fit Indigo Denim Jacket", price: 79.99, stock: 12 },
  5: { name: "Chiffon Pleated Midi Skirt", price: 39.99, stock: 20 },
  6: { name: "Cable-Knit Cashmere Sweater", price: 119.99, stock: 5 }
};

// Store payment sessions for simulation polling
export const paymentSessions = new Map();

// @desc    Validate order, create Pending record, call Bakong and generate KHQR code
// @route   POST /api/checkout/generate-qr
// @access  Public (frontend requests checkout)
router.post('/generate-qr', asyncHandler(async (req, res) => {
  const {
    user_id,
    product_id,
    size,
    color,
    quantity,
    customer_name,
    phone_number,
    delivery_address,
    note,
    payment_method
  } = req.body;

  // 1. Validation Checks
  if (!product_id || !quantity || !customer_name || !phone_number || !delivery_address) {
    return res.status(400).json({
      success: false,
      message: "Missing required checkout fields"
    });
  }

  const prod = PRODUCT_DB[product_id];
  if (!prod) {
    return res.status(404).json({
      success: false,
      message: "Product not found"
    });
  }

  // Stock check
  if (prod.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Out of stock. Only ${prod.stock} items left.`
    });
  }

  const totalAmount = prod.price * quantity;

  // 2. Create Pending Order record in MongoDB
  const order = await Order.create({
    user_id: user_id || 1,
    product_id,
    product_name: prod.name,
    size,
    color,
    quantity,
    total_amount: totalAmount,
    totalAmount: totalAmount,
    status: 'Pending',
    payment_method: payment_method || 'KHQR',
    paymentMethod: payment_method || 'KHQR',
    customer_name,
    phone_number,
    delivery_address,
    note: note || ''
  });

  // 3. Create Pending Transaction record in MongoDB
  const transaction = await Transaction.create({
    amount: totalAmount,
    type: 'Payment',
    reference: order._id.toString(),
    status: 'Pending'
  });

  // 4. Generate Bakong KHQR String
  const mockQRString = `000201010212373000160123456789ABCDEF0208123456785204599953038405802KH5912${encodeURIComponent(customer_name)}6010Phnom Penh6304` + Math.random().toString(36).substring(7).toUpperCase();
  const mockQRImage = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(mockQRString)}`;

  // Store payment initiation time for status polling simulation
  paymentSessions.set(order._id.toString(), {
    startTime: Date.now(),
    productId: product_id,
    quantity: quantity,
    transactionId: transaction._id
  });

  console.log(`📡 [GENERATE KHQR] Order ${order._id} created. Total: $${totalAmount}. Mock QR generated.`);

  // 5. Return success response per specifications
  return res.status(200).json({
    success: true,
    message: "QR generated successfully",
    qr_string: mockQRString,
    qr_image: mockQRImage,
    amount: totalAmount,
    order_id: order._id
  });
}));

// Fallback Route for backward compatibility if /api/checkout is called
router.post('/', asyncHandler(async (req, res) => {
  const { product_id, quantity, customer_name, phone_number, delivery_address } = req.body;
  if (!product_id || !quantity || !customer_name || !phone_number || !delivery_address) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const prod = PRODUCT_DB[product_id] || { name: "Premium Apparel", price: 99.99 };
  const totalAmount = prod.price * quantity;

  const order = await Order.create({
    ...req.body,
    total_amount: totalAmount,
    totalAmount,
    status: 'Pending',
    payment_method: 'KHQR',
    paymentMethod: 'KHQR'
  });

  return res.status(201).json({
    success: true,
    order
  });
}));

export default router;
