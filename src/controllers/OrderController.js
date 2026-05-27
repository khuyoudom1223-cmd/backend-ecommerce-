import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import { success, error } from '../utils/response.js';

// Get all orders (admin only)
export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('user', '-password')
    .populate('vendor', '-password');
  return success(res, { orders });
});

// Get orders for the logged‑in user (role User)
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('vendor', '-password');
  return success(res, { orders });
});

// Get orders for the logged‑in vendor (role Vendor)
export const getVendorOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ vendor: req.user._id })
    .populate('user', '-password');
  return success(res, { orders });
});

// Get a single order by id – accessible by admin, the owner user, or the vendor
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', '-password')
    .populate('vendor', '-password');
  if (!order) return error(res, 404, 'Order not found');

  const isAdmin = req.user.role === 'Admin';
  const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
  const isVendor = order.vendor && order.vendor._id.toString() === req.user._id.toString();
  if (!isAdmin && !isOwner && !isVendor) {
    return error(res, 403, 'Forbidden');
  }
  return success(res, { order });
});

// Admin can manually update order status (e.g., cancel)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // expected values: Pending, Paid, Cancelled, Completed
  const allowed = ['Pending', 'Paid', 'Cancelled', 'Completed'];
  if (!allowed.includes(status)) return error(res, 400, 'Invalid status');

  const order = await Order.findById(req.params.id);
  if (!order) return error(res, 404, 'Order not found');
  order.status = status;
  await order.save();
  return success(res, { message: 'Order status updated', order });
});
