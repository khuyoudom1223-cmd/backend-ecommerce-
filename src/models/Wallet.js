import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'ownerModel' },
    ownerModel: { type: String, required: true, enum: ['User', 'Vendor'] },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD' }
  },
  { timestamps: true }
);

export default mongoose.model('Wallet', walletSchema);
