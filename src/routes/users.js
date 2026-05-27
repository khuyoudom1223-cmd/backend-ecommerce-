import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { getAllUsers, getUser, updateUser, deleteUser } from '../controllers/UserController.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

// Validation schema for updating user
const updateSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional()
});

router.get('/', protect, authorize('Admin'), getAllUsers);
router.get('/:id', protect, authorize('Admin', 'User'), getUser);
router.put('/:id', protect, authorize('Admin', 'User'), validate(updateSchema), updateUser);
router.delete('/:id', protect, authorize('Admin'), deleteUser);

export default router;
