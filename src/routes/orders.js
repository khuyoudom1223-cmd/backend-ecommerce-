import express from 'express';
import {
  getAllOrders,
  getMyOrders,
  getVendorOrders,
  getOrderById,
  updateOrderStatus
} from '../controllers/OrderController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';

const router = express.Router();

// Admin – all orders
router.get('/', protect, authorize('Admin'), getAllOrders);

// User – their own orders
router.get('/my', protect, authorize('User', 'Admin'), getMyOrders);

// Vendor – orders assigned to them
router.get('/vendor', protect, authorize('Vendor', 'Admin'), getVendorOrders);

// Any authenticated party – single order (controller enforces ownership)
router.get('/:id', protect, getOrderById);

// Admin – update order status
router.patch('/:id/status', protect, authorize('Admin'), updateOrderStatus);

export default router;
