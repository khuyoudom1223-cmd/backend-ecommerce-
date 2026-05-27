import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { getAllVendors, getVendor, updateVendor, deleteVendor } from '../controllers/VendorController.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

const updateSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional()
});

router.get('/', protect, authorize('Admin'), getAllVendors);
router.get('/:id', protect, authorize('Admin', 'Vendor'), getVendor);
router.put('/:id', protect, authorize('Admin', 'Vendor'), validate(updateSchema), updateVendor);
router.delete('/:id', protect, authorize('Admin'), deleteVendor);

export default router;
