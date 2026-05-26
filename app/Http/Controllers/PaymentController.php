<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\User;
use App\Services\BakongService;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    protected $bakong;

    public function __construct(BakongService $bakong)
    {
        $this->bakong = $bakong;
    }

    /**
     * POST /api/payments/khqr
     *
     * Mirrors the demo's /api/generate-khqr endpoint.
     * Accepts an existing order_id OR creates a new order from posted data.
     * Uses order_number as the billNumber/invoiceId (no invoice_id column needed).
     * Returns: { khqr: { qr_string, md5, amount, currency }, order_id, orderId, expiresAt }
     */
    public function createKHQR(Request $request)
    {
        $request->validate([
            'order_id'         => 'nullable|integer|exists:orders,id',
            'amount'           => 'required_without:order_id|numeric|min:0.01',
            'customer_name'    => 'nullable|string|max:255',
            'phone_number'     => 'nullable|string|max:50',
            'delivery_address' => 'nullable|string|max:500',
            'product_id'       => 'nullable|integer',
            'user_id'          => 'nullable|integer',
            'product_name'     => 'nullable|string|max:255',
            'size'             => 'nullable|string|max:50',
            'color'            => 'nullable|string|max:50',
            'quantity'         => 'nullable|integer|min:1',
            'note'             => 'nullable|string|max:1000',
        ]);

        // --- Resolve or create order ---
        if ($request->filled('order_id')) {
            $order = Order::find($request->order_id);
            if (!$order) {
                return response()->json(['error' => true, 'message' => 'Order not found.'], 404);
            }
            $amount = (float) $order->total_amount;
        } else {
            // Fallback: create a minimal order (mirrors demo behaviour when no order exists yet)
            $amount = (float) $request->input('amount', 0);

            // Need a vendor for the NOT NULL constraint
            $vendor = User::where('role', 'vendor')->first();
            if (!$vendor) {
                Log::error('KHQR createKHQR: no vendor account found.');
                return response()->json(['error' => true, 'message' => 'Vendor account not found.'], 404);
            }

            $order = Order::create([
                'order_number'    => 'ORD-' . strtoupper(uniqid()),
                'user_id'         => $request->input('user_id'),
                'vendor_id'       => $vendor->id,
                'product_id'      => $request->input('product_id'),
                'product_name'    => $request->input('product_name', 'Item'),
                'size'            => $request->input('size'),
                'color'           => $request->input('color'),
                'quantity'        => $request->input('quantity', 1),
                'total_amount'    => $amount,
                'status'          => 'Pending',
                'customer_name'   => $request->input('customer_name', 'Guest'),
                'phone_number'    => $request->input('phone_number'),
                'delivery_address'=> $request->input('delivery_address'),
                'note'            => $request->input('note'),
                'payment_method'  => 'KHQR',
            ]);
        }

        // Use order_number as the billNumber — mirrors demo's orderId field
        $orderId = $order->order_number;
        $currency = 'USD'; // always USD for float amounts; use KHR only for integer amounts

        // Generate KHQR via offline Node script (no Bakong API call needed for generation)
        $resp = $this->bakong->generateKHQR($orderId, $amount, $currency);

        if (!empty($resp['error'])) {
            Log::error('KHQR generation failed', [
                'order_id'  => $order->id,
                'order_num' => $orderId,
                'error'     => $resp,
            ]);
            return response()->json(['error' => true, 'message' => $resp['message']], 500);
        }

        $qrString = data_get($resp, 'qr_string');
        $md5      = data_get($resp, 'md5');

        if (!$qrString) {
            Log::warning('KHQR: no qr_string returned', ['resp' => $resp]);
        }

        // Store MD5 hash in invoice_id column for polling
        $order->invoice_id = $md5;
        $order->status = 'Pending';
        $order->save();

        // Return same shape as demo's response + extra khqr wrapper for frontend
        return response()->json([
            'khqr' => [
                'qr_string'    => $qrString,
                'qr_image_url' => null,
                'md5'          => $md5,
                'amount'       => number_format($amount, 2, '.', ''),
                'currency'     => $currency,
                'orderId'      => $orderId,
                'expiresAt'    => (now()->timestamp + 15 * 60) * 1000,
            ],
            'order_id'  => $order->id,
            'orderId'   => $orderId,
            'expiresAt' => (now()->timestamp + 15 * 60) * 1000,
        ]);
    }

    /**
     * POST /api/generate-khqr  (compat with demo Node server endpoint)
     * Body: { amount, currency, orderId }
     */
    public function generateKHQRCompat(Request $request)
    {
        $request->validate([
            'amount'   => 'required|numeric|min:0.01',
            'currency' => 'nullable|string',
            'orderId'  => 'required|string',
        ]);

        $amount   = (float) $request->input('amount');
        $currency = $request->input('currency', 'USD');
        $orderId  = $request->input('orderId');

        $resp = $this->bakong->generateKHQR($orderId, $amount, $currency);

        if (!empty($resp['error'])) {
            return response()->json(['error' => true, 'message' => $resp['message']], 500);
        }

        // Mirror demo response exactly: { orderId, amount, currency, qr, md5, expiresAt }
        return response()->json([
            'orderId'   => $orderId,
            'amount'    => $amount,
            'currency'  => $currency,
            'qr'        => $resp['qr_string'],
            'md5'       => $resp['md5'],
            'expiresAt' => (now()->timestamp + 15 * 60) * 1000,
        ]);
    }

    /**
     * POST /api/check-payment  (compat with demo Node server endpoint)
     * Body: { md5 }
     */
    public function checkPaymentByMd5(Request $request)
    {
        $request->validate(['md5' => 'required|string']);

        $md5  = $request->input('md5');
        $resp = $this->bakong->checkPaymentByMd5($md5);

        if (!empty($resp['error'])) {
            return response()->json(['error' => true, 'message' => $resp['message']], 500);
        }

        return response()->json($resp);
    }

    /**
     * GET /api/payments/status/{orderId}
     *
     * Polls payment by order DB id. Uses the md5 stored on the order (if any)
     * or falls back to "not paid" since we can't poll without md5.
     * Frontend polls this after showing QR.
     */
    public function checkStatus(Request $request, $orderId)
    {
        $order = Order::find($orderId);
        if (!$order) {
            return response()->json(['error' => true, 'message' => 'Order not found'], 404);
        }

        // If already marked paid, return immediately
        if ($order->status === 'Paid') {
            return response()->json(['paid' => true, 'status' => 'Paid']);
        }

        if (empty($order->invoice_id)) {
            return response()->json(['paid' => false, 'status' => $order->status, 'message' => 'No MD5 hash associated']);
        }

        // Query Bakong by MD5 hash
        $resp = $this->bakong->checkPaymentByMd5($order->invoice_id);

        if (!empty($resp['error'])) {
            return response()->json([
                'paid' => false,
                'status' => $order->status,
                'message' => $resp['message']
            ]);
        }

        if (!empty($resp['paid'])) {
            $order->status = 'Paid';
            $order->transaction_id = $resp['hash'] ?? $order->invoice_id;
            $order->paid_at = now();
            $order->save();

            return response()->json([
                'paid' => true,
                'status' => 'Paid',
                'transaction_id' => $order->transaction_id
            ]);
        }

        return response()->json(['paid' => false, 'status' => $order->status]);
    }

    /**
     * POST /api/payments/webhook
     */
    public function webhook(Request $request)
    {
        $payload = $request->all();
        Log::info('Bakong webhook received', $payload);

        $orderNumber = data_get($payload, 'invoiceId') ?? data_get($payload, 'orderId');
        $status      = data_get($payload, 'status');
        $txn         = data_get($payload, 'transactionId');

        if (!$orderNumber) {
            return response()->json(['error' => true, 'message' => 'Missing invoiceId/orderId'], 400);
        }

        $order = Order::where('order_number', $orderNumber)->first();
        if (!$order) {
            return response()->json(['error' => true, 'message' => 'Order not found'], 404);
        }

        if ($status === 'PAID' || $status === 'SUCCESS') {
            if ($order->status !== 'Paid') {
                $order->status         = 'Paid';
                $order->transaction_id = $txn;
                $order->paid_at        = now();
                $order->save();
            }
        }

        return response()->json(['ok' => true]);
    }
}
