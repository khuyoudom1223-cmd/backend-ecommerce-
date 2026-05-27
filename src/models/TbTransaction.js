import mongoose from 'mongoose';

const tbTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed'],
      default: 'Pending',
      index: true
    },
    paymentMethod: {
      type: String,
      default: 'BAKONG'
    },
    khqrData: {
      type: String  // The full KHQR QR string
    },
    md5: {
      type: String,  // MD5 hash of KHQR for Bakong verification
      index: true
    },
    bakongTransactionId: {
      type: String   // Bakong's own transaction ID after verification
    },
    paymentReference: {
      type: String   // Additional ref from Bakong response
    },
    bakongResponse: {
      type: mongoose.Schema.Types.Mixed  // Store full Bakong API response
    },
    paidAt: {
      type: Date     // Timestamp when payment was confirmed
    }
  },
  { timestamps: true }
);

export default mongoose.model('TbTransaction', tbTransactionSchema);
