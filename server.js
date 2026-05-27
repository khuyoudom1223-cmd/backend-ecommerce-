import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import connectDB from './src/config/database.js';
import errorHandler from './src/middleware/errorHandler.js';

// Load env variables
dotenv.config();

const app = express();

// Global middlewares
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.url} - Body:`, req.body);
  next();
});

// Connect to MongoDB
await connectDB();

// Import routers (keep same URL structure as Laravel)
import authRouter from './src/routes/auth.js';
import userRouter from './src/routes/users.js';
import vendorRouter from './src/routes/vendors.js';
import walletRouter from './src/routes/wallet.js';
import paymentRouter from './src/routes/payments.js';
import orderRouter from './src/routes/orders.js';
import checkoutRouter from './src/routes/checkout.js';

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/vendors', vendorRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/orders', orderRouter);
app.use('/api/checkout', checkoutRouter);

// Simple health check endpoint
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is up' }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Central error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
