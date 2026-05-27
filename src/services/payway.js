import axios from 'axios';

const { PAYWAY_ENDPOINT, PAYWAY_MERCHANT_ID, PAYWAY_API_KEY } = process.env;

export const createPayWayPayment = async (order) => {
  const payload = {
    merchantId: PAYWAY_MERCHANT_ID,
    amount: order.totalAmount,
    currency: 'USD',
    description: `Order ${order._id}`,
    callbackUrl: `${process.env.BASE_URL}/api/payments/payway/callback`
  };

  const response = await axios.post(`${PAYWAY_ENDPOINT}/payments`, payload, {
    headers: { Authorization: `Bearer ${PAYWAY_API_KEY}` }
  });
  return response.data; // expected: { paymentId, paymentUrl, ... }
};

export const verifyPayWayPayment = async (paymentId) => {
  const response = await axios.get(`${PAYWAY_ENDPOINT}/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${PAYWAY_API_KEY}` }
  });
  return response.data; // contains status, amount, etc.
};
