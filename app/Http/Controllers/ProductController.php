<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Display listing of catalog products with category & pricing filter
     */
    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->has('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        if ($request->has('max_price')) {
            $query->where(function($q) use ($request) {
                $q->where('discount_price', '<=', $request->max_price)
                  ->orWhere(function($sq) use ($request) {
                      $sq->whereNull('discount_price')
                         ->where('price', '<=', $request->max_price);
                  });
            });
        }

        if ($request->has('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('brand', 'like', $search)
                  ->orWhere('sku', 'like', $search);
            });
        }

        return response()->json([
            'success' => true,
            'products' => $query->get()
        ]);
    }

    /**
     * Show single product details with reviews
     */
    public function show($id)
    {
        $product = Product::findOrFail($id);
        
        // Mock reviews since delivery/complex tables aren't requested
        $reviews = [
            ['id' => 1, 'user' => 'Sarah K.', 'rating' => 5, 'comment' => 'Stunning material! Fits perfectly.'],
            ['id' => 2, 'user' => 'Marcus L.', 'rating' => 4, 'comment' => 'Very comfortable and breathable fabric structure.']
        ];

        return response()->json([
            'success' => true,
            'product' => $product,
            'reviews' => $reviews
        ]);
    }

    /**
     * Vendor capability: Update stock
     */
    public function updateStock(Request $request, $id)
    {
        $request->validate([
            'stock' => 'required|integer|min:0'
        ]);

        $vendor = $request->user();
        if ($vendor->role !== 'vendor' && $vendor->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized stock management action.'
            ], 403);
        }

        $product = Product::findOrFail($id);
        $product->update([
            'stock' => $request->stock
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product catalog stock updated successfully!',
            'product' => $product
        ]);
    }
}
