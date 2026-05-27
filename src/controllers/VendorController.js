import asyncHandler from 'express-async-handler';
import Vendor from '../models/Vendor.js';
import { success, error } from '../utils/response.js';

// Get all vendors (admin only)
export const getAllVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find().select('-password');
  return success(res, { vendors });
});

// Get vendor by id (admin or self)
export const getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).select('-password');
  if (!vendor) return error(res, 404, 'Vendor not found');
  if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
    return error(res, 403, 'Forbidden');
  }
  return success(res, { vendor });
});

// Update vendor (admin can edit any, vendor can edit self)
export const updateVendor = asyncHandler(async (req, res) => {
  const updates = { name: req.body.name, email: req.body.email };
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return error(res, 404, 'Vendor not found');
  if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
    return error(res, 403, 'Forbidden');
  }
  Object.assign(vendor, updates);
  await vendor.save();
  return success(res, { message: 'Vendor updated', vendor: { id: vendor._id, name: vendor.name, email: vendor.email } });
});

// Delete vendor (admin only)
export const deleteVendor = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Admin') return error(res, 403, 'Forbidden');
  const vendor = await Vendor.findByIdAndDelete(req.params.id);
  if (!vendor) return error(res, 404, 'Vendor not found');
  return success(res, { message: 'Vendor deleted' });
});
