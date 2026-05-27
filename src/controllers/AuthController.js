import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { success, error } from '../utils/response.js';
import bcrypt from 'bcryptjs';

// @desc    Register new user (or vendor if role provided)
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return error(res, 400, 'User already exists');

  const user = await User.create({ name, email, password, role: role || 'User' });
  const token = signToken({ id: user._id, role: user.role });
  return success(res, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }, 201);
});

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) return error(res, 401, 'Invalid credentials');
  const match = await bcrypt.compare(password, user.password);
  if (!match) return error(res, 401, 'Invalid credentials');

  const token = signToken({ id: user._id, role: user.role });
  return success(res, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// @desc    Get current logged‑in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  return success(res, { id: user._id, name: user.name, email: user.email, role: user.role });
});
