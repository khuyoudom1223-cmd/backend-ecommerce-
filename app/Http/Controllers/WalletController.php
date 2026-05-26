<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    /**
     * Top up user wallet
     */
    public function topUp(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1'
        ]);

        $user = $request->user();
        $user->topUp($request->amount, "Manual virtual credit top-up");

        return response()->json([
            'success' => true,
            'message' => 'Wallet balance successfully topped up!',
            'wallet_balance' => $user->fresh()->wallet_balance
        ], 200);
    }

    /**
     * Fetch user transaction logs history
     */
    public function history(Request $request)
    {
        $user = $request->user();
        $transactions = Transaction::where('user_id', $user->id)
                                    ->orderBy('created_at', 'desc')
                                    ->get();

        return response()->json([
            'success' => true,
            'balance' => $user->wallet_balance,
            'transactions' => $transactions
        ]);
    }
}
