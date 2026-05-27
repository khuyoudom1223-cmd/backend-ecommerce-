import express from 'express';
import { register, login, getMe } from '../controllers/AuthController.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('User', 'Vendor', 'Admin')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);

export default router;
