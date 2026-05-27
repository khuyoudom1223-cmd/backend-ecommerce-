import asyncHandler from 'express-async-handler';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Order from '../models/Order.js';
import { success, error } from '../utils/response.js';

// Get wallet balance for logged‑in user/vendor
export const getWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.user._id, ownerModel: req.user.role });
  if (!wallet) return error(res, 404, 'Wallet not found');
  return success(res, { balance: wallet.balance, currency: wallet.currency });
});

// Top‑up wallet (any role can top‑up their own wallet)
export const topUp = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (amount <= 0) return error(res, 400, 'Invalid amount');
  const wallet = await Wallet.findOneAndUpdate(
    { owner: req.user._id, ownerModel: req.user.role },
    { $inc: { balance: amount } },
    { new: true, upsert: true }
  );
  await Transaction.create({
    toWallet: wallet._id,
    amount,
    type: 'TopUp',
    status: 'Completed',
    reference: `TopUp-${Date.now()}`
  });
  return success(res, { balance: wallet.balance });
});

// Transfer from a user wallet to a vendor wallet – triggered when an order is paid via wallet
export const transferToVendor = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId).populate('vendor');
  if (!order) return error(res, 404, 'Order not found');
  if (order.paymentMethod !== 'Wallet') return error(res, 400, 'Order not a wallet payment');

  const userWallet = await Wallet.findOne({ owner: req.user._id, ownerModel: 'User' });
  const vendorWallet = await Wallet.findOne({ owner: order.vendor._id, ownerModel: 'Vendor' });
  if (!userWallet || !vendorWallet) return error(res, 404, 'Wallet(s) missing');
  if (userWallet.balance < order.totalAmount) return error(res, 400, 'Insufficient funds');

  const session = await Wallet.startSession();
  session.startTransaction();
  try {
    userWallet.balance -= order.totalAmount;
    vendorWallet.balance += order.totalAmount;
    await userWallet.save({ session });
    await vendorWallet.save({ session });

    const txn = await Transaction.create(
      [
        {
          fromWallet: userWallet._id,
          toWallet: vendorWallet._id,
          amount: order.totalAmount,
          type: 'Transfer',
          status: 'Completed',
          reference: order._id.toString()
        }
      ],
      { session }
    );

    order.status = 'Paid';
    order.paymentId = txn[0]._id;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();
    return success(res, { message: 'Funds transferred', order });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    return error(res, 500, 'Transfer failed');
  }
});

// Refund from vendor wallet back to user wallet (order cancellation)
export const refundToUser = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId).populate('vendor');
  if (!order) return error(res, 404, 'Order not found');
  if (order.status !== 'Cancelled') return error(res, 400, 'Order not cancelled');

  const userWallet = await Wallet.findOne({ owner: order.user, ownerModel: 'User' });
  const vendorWallet = await Wallet.findOne({ owner: order.vendor._id, ownerModel: 'Vendor' });
  if (!userWallet || !vendorWallet) return error(res, 404, 'Wallet(s) missing');

  const session = await Wallet.startSession();
  session.startTransaction();
  try {
    vendorWallet.balance -= order.totalAmount;
    userWallet.balance += order.totalAmount;
    await vendorWallet.save({ session });
    await userWallet.save({ session });

    await Transaction.create(
      [
        {
          fromWallet: vendorWallet._id,
          toWallet: userWallet._id,
          amount: order.totalAmount,
          type: 'Refund',
          status: 'Completed',
          reference: order._id.toString()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    return success(res, { message: 'Refund processed' });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    return error(res, 500, 'Refund failed');
  }
});
