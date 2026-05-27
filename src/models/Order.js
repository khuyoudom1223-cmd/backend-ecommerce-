import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }
      }
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Cancelled', 'Completed'],
      default: 'Pending'
    },
    paymentMethod: { type: String, enum: ['Wallet', 'PayWay'], required: true },
    paymentId: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
