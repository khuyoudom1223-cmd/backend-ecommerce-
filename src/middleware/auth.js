import { verifyToken } from '../utils/jwt.js';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }
  try {
    const decoded = verifyToken(token);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
});
