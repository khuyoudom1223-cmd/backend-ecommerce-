import express from 'express';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import { success, error } from '../utils/response.js';

const router = express.Router();

const PRODUCT_PRICES = {
  1: { name: "Azurea Classic Trench Coat", price: 99.99 },
  2: { name: "Royal Velvet Evening Gown", price: 149.99 },
  3: { name: "Minimalist Linen Summer Shirt", price: 49.99 },
  4: { name: "Slim-Fit Indigo Denim Jacket", price: 79.99 },
  5: { name: "Chiffon Pleated Midi Skirt", price: 39.99 },
  6: { name: "Cable-Knit Cashmere Sweater", price: 119.99 }
};

// @desc    Create a pending order for checkout
// @route   POST /api/checkout
// @access  Public (frontend requests checkout)
router.post('/', asyncHandler(async (req, res) => {
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

  if (!product_id || !quantity || !customer_name || !phone_number || !delivery_address) {
    return error(res, 400, 'Missing required checkout fields');
  }

  // Lookup product details
  const prodInfo = PRODUCT_PRICES[product_id] || { name: "Premium Apparel", price: 99.99 };
  const totalAmount = prodInfo.price * quantity;

  // Create Order in MongoDB
  const order = await Order.create({
    user_id: user_id || 1,
    product_id,
    product_name: prodInfo.name,
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

  return success(res, {
    success: true,
    message: 'Order created successfully',
    order: {
      id: order._id,
      order_number: `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
      user_id: order.user_id,
      product_id: order.product_id,
      product_name: order.product_name,
      size: order.size,
      color: order.color,
      quantity: order.quantity,
      total_amount: order.total_amount,
      status: order.status,
      customer_name: order.customer_name,
      phone_number: order.phone_number,
      delivery_address: order.delivery_address,
      note: order.note
    }
  }, 201);
}));

export default router;
