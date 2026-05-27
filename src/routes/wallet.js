import express from 'express';
import { getWallet, topUp, transferToVendor, refundToUser } from '../controllers/WalletController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

const topUpSchema = Joi.object({ amount: Joi.number().positive().required() });
const transferSchema = Joi.object({ orderId: Joi.string().required() });
const refundSchema = Joi.object({ orderId: Joi.string().required() });

router.get('/', protect, getWallet);
router.post('/topup', protect, validate(topUpSchema), topUp);
router.post('/transfer', protect, authorize('User'), validate(transferSchema), transferToVendor);
router.post('/refund', protect, authorize('User'), validate(refundSchema), refundToUser);

export default router;
