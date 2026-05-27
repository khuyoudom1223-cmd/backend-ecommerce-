import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['Vendor'],
      default: 'Vendor'
    },
    // Additional vendor-specific fields (storeName, address, phone, etc.)
  },
  { timestamps: true }
);

// hash password before saving – reuse same logic as User
vendorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const bcrypt = (await import('bcryptjs')).default;
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

vendorSchema.methods.matchPassword = function (plain) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('Vendor', vendorSchema);
