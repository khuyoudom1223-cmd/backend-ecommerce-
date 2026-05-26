<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'string|in:user,vendor,admin'
        ]);

        $role = $request->role ?? 'user';
        // Give starting bonus to demonstrate wallet
        $startingBalance = $role === 'vendor' ? 50.00 : 100.00;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $role,
            'wallet_balance' => $startingBalance
        ]);

        // Create starting top-up transaction entry
        $user->transactions()->create([
            'txn_number' => 'TXN-' . strtoupper(uniqid()),
            'type' => 'Top Up',
            'amount' => $startingBalance,
            'description' => 'Account creation starting bonus'
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully!',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ], 201);
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid account login credentials.'
            ], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Logged in successfully!',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ]);
    }

    /**
     * Fetch profile details
     */
    public function profile(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => $request->user()
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully!'
        ]);
    }
}
