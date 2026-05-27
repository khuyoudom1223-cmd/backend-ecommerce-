import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { success, error } from '../utils/response.js';

// Get all users (admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  return success(res, { users });
});

// Get single user by id (admin or self)
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return error(res, 404, 'User not found');
  // If not admin, ensure the user is requesting own profile
  if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
    return error(res, 403, 'Forbidden');
  }
  return success(res, { user });
});

// Update user (admin can edit any, user can edit self)
export const updateUser = asyncHandler(async (req, res) => {
  const updates = { name: req.body.name, email: req.body.email };
  const user = await User.findById(req.params.id);
  if (!user) return error(res, 404, 'User not found');
  if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
    return error(res, 403, 'Forbidden');
  }
  Object.assign(user, updates);
  await user.save();
  return success(res, { message: 'User updated', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// Delete user (admin only)
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Admin') return error(res, 403, 'Forbidden');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return error(res, 404, 'User not found');
  return success(res, { message: 'User deleted' });
});
