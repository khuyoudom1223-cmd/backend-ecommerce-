import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user_id: { type: Number },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendor_id: { type: Number },
    product_id: { type: Number },
    product_name: { type: String },
    size: { type: String },
    color: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    total_amount: { type: Number },
    totalAmount: { type: Number },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Processing', 'Cancelled', 'Completed'],
      default: 'Pending'
    },
    paymentMethod: { type: String },
    payment_method: { type: String },
    customer_name: { type: String },
    phone_number: { type: String },
    delivery_address: { type: String },
    note: { type: String },
    paymentId: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
