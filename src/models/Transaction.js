import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    fromWallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    toWallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['Transfer', 'TopUp', 'Refund', 'Payment'],
      required: true
    },
    reference: { type: String }, // e.g., orderId, paymentId
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
