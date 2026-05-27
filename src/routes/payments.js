import express from 'express';
import {
  createOrder,
  payWayCallback,
  getOrderQRCode,
  verifyPayment
} from '../controllers/PaymentController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

// Order creation – any authenticated user can create
const orderSchema = Joi.object({
  vendorId: Joi.string().required(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().positive().required()
      })
    )
    .min(1)
    .required(),
  paymentMethod: Joi.string().valid('Wallet', 'PayWay').required()
});

router.post('/order', protect, validate(orderSchema), createOrder);
router.post('/payway/callback', express.json(), payWayCallback); // webhook – no auth
router.get('/order/:orderId/qrcode', protect, authorize('User', 'Vendor', 'Admin'), getOrderQRCode);
router.get('/payway/verify', protect, verifyPayment);

export default router;
