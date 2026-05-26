🏦 Bakong KHQR API Integration Guide

A modern, professional documentation for KHQR payment integration


🎯 Project Overview

This project demonstrates seamless integration with the Bakong API for generating KHQR payment codes and verifying transaction statuses in real-time. Built with Node.js and Express, it provides a robust foundation for digital payment solutions in Cambodia.

✨ Key Features

Feature	Status	Description
🎨 Dynamic KHQR Generation	✅	Generate QR codes for any payment amount
🔄 Automated Payment Verification	✅	Continuous status monitoring until completion
🔐 Secure Transaction Validation	✅	MD5 hash-based security
⏰ Smart Expiration Tracking	✅	Real-time QR code validity monitoring
🛡️ Production-Ready	✅	Sandbox and live environment support

🚀 Quick Start

Prerequisites

Node.js (v14 or higher)

API Credentials


Installation

# Clone repository
git clone https://github.com/earsokchan/demo-baking.git
cd demo-baking.git

# Install dependencies
npm install

# Configure environment
cp .env.example .env


⚙️ Configuration
Environment Setup

PORT=3000
NODE_ENV=production
BAKONG_DEV_BASE_API_URL=https://sit-api-bakong.nbc.gov.kh/v1
BAKONG_PROD_BASE_API_URL=https://api-bakong.nbc.gov.kh/v1
BAKONG_ACCOUNT_USERNAME=YOU_BAKONG_ACCOUT_NAME
BAKONG_MERCHANT_ID=YOUR_BAKONG_MERCHANT_ID #Optional
BAKONG_ACCESS_TOKEN=YOUR_BAKONG_TOKEN

Account Verification

Register at api-bakong
Obtain API credentials and access token
Verify your Bakong ID (e.g., your_id@aclb)


💳 API Endpoints

POST /api/generate-khqr
Content-Type: application/json

{
  "amount": 1500,
  "currency": "KHR",
  "orderId": "ORDER_1762179271536"
}


Example Response:

{
  "success": true,
  "data": {
    "orderId": "ORDER_1762179271536",
    "amount": 1500,
    "currency": "KHR",
    "qr": "00020101021229210017ear_sokchan2@aclb52045999530311654031005802KH...",
    "md5": "555d01de7baf6f6b6c8ac2818b2ed119",
    "expiresAt": 1762179571563
  }
}


Check Payment Status

POST /api/check-payment
Content-Type: application/json

{
  "md5": "555d01de7baf6f6b6c8ac2818b2ed119"
}

Response States:

Pending Payment

{
  "paid": false,
  "hash": "555d01de7baf6f6b6c8ac2818b2ed119",
  "amount": 0,
  "from": "unknown",
  "to": "unknown",
  "timestamp": "11/3/2025, 9:14:34 PM"
}

Payment Completed

{
  "paid": true,
  "hash": "5b792fa172db22c8fc7752c97ceecc057c9fe8819ec81c2909c42aeab9959f9f",
  "amount": 1500,
  "from": "abaakhppxxx@abaa",
  "to": "ear_sokchan2@aclb",
  "timestamp": "11/3/2025, 9:15:07 PM"
}

🚀 Deployment

Development

bash
npm run dev
# Server running at: http://localhost:3000
Production

bash
npm start
# Production server initialized


🔧 Advanced Configuration

Payment Polling Strategy

javascript
// Optimal polling configuration
const pollingConfig = {
    interval: 2000,        // Check every 2 seconds
    timeout: 300000,       // Stop after 5 minutes
    backoff: 1.5           // Exponential backoff factor
};



📝 Important Notes

QR Validity: Generated codes expire after 5 minutes
Hash Verification: Always validate MD5 hash against stored transactions
Error Handling: Implement comprehensive error handling for production use
Compliance: Ensure adherence to NBC regulations and guidelines
🎯 Use Cases

E-commerce Payments
Bill Payments
Donation Systems
POS Integration
Mobile App Payments
