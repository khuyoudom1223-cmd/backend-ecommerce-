import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
console.log('Testing connection to:', uri.replace(/:([^@]+)@/, ':****@')); // Hide password in logs

async function testConnection() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('🎉 SUCCESS: Connected to MongoDB Atlas successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR: Connection failed!');
    console.error(err.message);
    process.exit(1);
  }
}

testConnection();
