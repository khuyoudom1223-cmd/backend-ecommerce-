<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckoutController extends Controller
{
    /**
     * Wallet Order Flow
     * User buys product
     * -> Check user wallet balance
     * -> If wallet balance >= order amount
     * -> Deduct amount from User Wallet
     * -> Add amount to Vendor Wallet
     * -> Create wallet transaction record
     * -> Create order record
     * -> Save selected size and color
     * -> Return success response
     * Else
     * -> Return "Insufficient wallet balance"
     */
    public function checkout(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'size' => 'required|string',
            'color' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'customer_name' => 'required|string|max:255',
            'phone_number' => 'required|string',
            'delivery_address' => 'required|string',
            'note' => 'nullable|string',
            'payment_method' => 'nullable|string',
        ]);

        $user = $request->user() ?? User::find($request->input('user_id'));
        if (!$user) {
            $user = User::first();
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User account not found.'
            ], 404);
        }
        $product = Product::findOrFail($request->product_id);

        if ($product->stock < $request->quantity) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient product stock quantity.'
            ], 400);
        }

        $price = $product->discount_price ?? $product->price;
        $orderAmount = $price * $request->quantity;

        $paymentMethod = $request->payment_method ?? 'Wallet';

        // Vendor User (Let's fetch the default vendor or associate product with vendor)
        $vendor = User::where('role', 'vendor')->first();
        if (!$vendor) {
            Log::error('Checkout failed: System vendor account not found (vendor_id missing).');
            return response()->json([
                'success' => false,
                'message' => 'System vendor account not found.'
            ], 404);
        }

        // If payment method is not wallet (e.g., KHQR), create Pending order and skip wallet flows
        if ($paymentMethod !== 'Wallet') {
            try {
                // reduce product stock immediately to reserve the item
                $product->decrement('stock', $request->quantity);

                $order = Order::create([
                    'order_number' => 'ORD-' . strtoupper(uniqid()),
                    'user_id' => $user->id,
                    'vendor_id' => $vendor->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'size' => $request->size,
                    'color' => $request->color,
                    'quantity' => $request->quantity,
                    'total_amount' => $orderAmount,
                    'status' => 'Pending',
                    'customer_name' => $request->customer_name,
                    'phone_number' => $request->phone_number,
                    'delivery_address' => $request->delivery_address,
                    'note' => $request->note,
                    'payment_method' => $paymentMethod,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Order created. Awaiting external payment.',
                    'order' => $order
                ], 200);

            } catch (\Exception $e) {
                Log::error('KHQR Checkout Failure: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create order for external payment.'
                ], 500);
            }
        }



        try {
            DB::transaction(function () use ($user, $vendor, $product, $request, $orderAmount) {
                // 1. Deduct amount from User Wallet
                $user->decrement('wallet_balance', $orderAmount);

                // 2. Add amount to Vendor Wallet
                $vendor->increment('wallet_balance', $orderAmount);

                // 3. Create wallet transaction record for user
                Transaction::create([
                    'txn_number' => 'TXN-U' . strtoupper(uniqid()),
                    'user_id' => $user->id,
                    'type' => 'Purchase Deduct',
                    'amount' => -$orderAmount,
                    'description' => "Purchase of product {$product->name}"
                ]);

                // Create wallet transaction record for vendor
                Transaction::create([
                    'txn_number' => 'TXN-V' . strtoupper(uniqid()),
                    'user_id' => $vendor->id,
                    'type' => 'Sale Income',
                    'amount' => $orderAmount,
                    'description' => "Payout for product {$product->name} from {$user->name}"
                ]);

                // 4. Update product inventory stock
                $product->decrement('stock', $request->quantity);

                // 5. Create order record
                Order::create([
                    'order_number' => 'ORD-' . strtoupper(uniqid()),
                    'user_id' => $user->id,
                    'vendor_id' => $vendor->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'size' => $request->size,
                    'color' => $request->color,
                    'quantity' => $request->quantity,
                    'total_amount' => $orderAmount,
                    'status' => 'Paid', // Paid immediately on wallet deduct
                    'customer_name' => $request->customer_name,
                    'phone_number' => $request->phone_number,
                    'delivery_address' => $request->delivery_address,
                    'note' => $request->note,
                    'payment_method' => $request->payment_method ?? 'Wallet',
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Checkout completed successfully! Deducted $' . number_format($orderAmount, 2) . ' from wallet.',
                'new_balance' => $user->fresh()->wallet_balance
            ], 200);

        } catch (\Exception $e) {
            Log::error('Wallet Checkout Failure: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Transaction aborted. Wallet payments system encountered an internal issue.'
            ], 500);
        }
    }

    /**
     * If vendor cancels order:
     * -> Return money to User Wallet
     * -> Update wallet transaction
     * -> Update order status to Cancelled
     */
    public function cancelOrder(Request $request, $orderId)
    {
        $vendor = $request->user();
        
        if ($vendor->role !== 'vendor' && $vendor->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized action. Only vendors or administrators can cancel orders.'
            ], 403);
        }

        $order = Order::findOrFail($orderId);

        if ($order->status === 'Cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Order is already cancelled.'
            ], 400);
        }

        $refundAmount = $order->total_amount;
        $buyer = User::findOrFail($order->user_id);

        try {
            DB::transaction(function () use ($order, $buyer, $vendor, $refundAmount) {
                // 1. Return money to User Wallet
                $buyer->increment('wallet_balance', $refundAmount);

                // 2. Deduct money from Vendor Wallet (only if paid previously)
                if ($order->status !== 'Pending') {
                    $order->vendor->decrement('wallet_balance', $refundAmount);
                }

                // 3. Update wallet transaction for user
                Transaction::create([
                    'txn_number' => 'TXN-RU' . strtoupper(uniqid()),
                    'user_id' => $buyer->id,
                    'type' => 'Refund Addition',
                    'amount' => $refundAmount,
                    'description' => "Refund for Cancelled Order #{$order->order_number}"
                ]);

                // Update wallet transaction for vendor
                Transaction::create([
                    'txn_number' => 'TXN-RV' . strtoupper(uniqid()),
                    'user_id' => $order->vendor_id,
                    'type' => 'Refund Deduct',
                    'amount' => -$refundAmount,
                    'description' => "Refund deduction for Cancelled Order #{$order->order_number}"
                ]);

                // 4. Replenish product stock
                Product::findOrFail($order->product_id)->increment('stock', $order->quantity);

                // 5. Update order status to Cancelled
                $order->update([
                    'status' => 'Cancelled'
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Order # ' . $order->order_number . ' successfully cancelled and $' . number_format($refundAmount, 2) . ' refunded to customer wallet.'
            ], 200);

        } catch (\Exception $e) {
            Log::error('Cancel Order Refund Failure: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Cancellation aborted due to transaction error.'
            ], 500);
        }
    }
}
