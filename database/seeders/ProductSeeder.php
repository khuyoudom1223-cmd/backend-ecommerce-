<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'name' => 'Azurea Classic Trench Coat',
                'sku' => 'AZ-TC-001',
                'brand' => 'Azurea',
                'category' => 'Coats',
                'description' => 'Wrap yourself in absolute luxury. Crafted from water-resistant premium cotton gabardine, this classic trench coat features double-breasted closure, adjustable belt, and signature storm flaps. The deep sapphire blue tone provides an ultra-modern alternative to the traditional tan.',
                'price' => 120.00,
                'discount_price' => 99.99,
                'stock' => 15,
                'sizes' => ['S', 'M', 'L', 'XL'],
                'colors' => ['Blue', 'White', 'Black'],
                'image' => 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop',
                'rating' => 4.80,
            ],
            [
                'name' => 'Royal Velvet Evening Gown',
                'sku' => 'AZ-VG-002',
                'brand' => 'Azurea',
                'category' => 'Dresses',
                'description' => 'Make an unforgettable entrance. This exquisite evening gown is made from ultra-soft stretch velvet that contours the body beautifully. Features a subtle off-the-shoulder neckline, thigh-high slit, and an elegant sweeping train. Perfect for black-tie events.',
                'price' => 180.00,
                'discount_price' => 149.99,
                'stock' => 8,
                'sizes' => ['S', 'M', 'L'],
                'colors' => ['Blue', 'Red'],
                'image' => 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=600&auto=format&fit=crop',
                'rating' => 4.90,
            ],
            [
                'name' => 'Minimalist Linen Summer Shirt',
                'sku' => 'AZ-LS-003',
                'brand' => 'Modernist',
                'category' => 'Shirts',
                'description' => 'Breathe easy in premium European linen. Cut in a relaxed silhouette, this lightweight shirt is perfect for warm summer days and beach side evenings. Featuring a clean band collar, buttoned cuffs, and rounded hem.',
                'price' => 65.00,
                'discount_price' => 49.99,
                'stock' => 25,
                'sizes' => ['S', 'M', 'L', 'XL', 'XXL'],
                'colors' => ['White', 'Blue', 'Green'],
                'image' => 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop',
                'rating' => 4.50,
            ],
            [
                'name' => 'Slim-Fit Indigo Denim Jacket',
                'sku' => 'AZ-DJ-004',
                'brand' => 'DenimCo',
                'category' => 'Jackets',
                'description' => 'A timeless wardrobe staple with a contemporary cut. Made from durable 12oz indigo denim with a hint of stretch for active comfort. Features classic point collar, chest button-flap pockets, and adjustable waist tabs.',
                'price' => 95.00,
                'discount_price' => 79.99,
                'stock' => 12,
                'sizes' => ['M', 'L', 'XL'],
                'colors' => ['Blue', 'Black'],
                'image' => 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=600&auto=format&fit=crop',
                'rating' => 4.70,
            ],
            [
                'name' => 'Chiffon Pleated Midi Skirt',
                'sku' => 'AZ-MS-005',
                'brand' => 'Azurea',
                'category' => 'Skirts',
                'description' => 'Add a touch of feminine elegance to your daily rotation. This pleated midi skirt is crafted from lightweight georgette chiffon that moves gracefully with every step. Features a comfortable elasticated waistband and smooth inner lining.',
                'price' => 55.00,
                'discount_price' => 39.99,
                'stock' => 20,
                'sizes' => ['S', 'M', 'L'],
                'colors' => ['White', 'Blue'],
                'image' => 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600&auto=format&fit=crop',
                'rating' => 4.60,
            ],
            [
                'name' => 'Cable-Knit Cashmere Sweater',
                'sku' => 'AZ-CS-006',
                'brand' => 'CozyLux',
                'category' => 'Knitwear',
                'description' => 'Indulge in unparalleled softness. Spun from 100% fine Mongolian cashmere, this heavy cable-knit sweater delivers superior insulation and timeless style. Finished with chunky ribbed mock neck, cuffs, and hem.',
                'price' => 140.00,
                'discount_price' => 119.99,
                'stock' => 5,
                'sizes' => ['S', 'M', 'L', 'XL'],
                'colors' => ['White', 'Blue'],
                'image' => 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&auto=format&fit=crop',
                'rating' => 4.90,
            ]
        ];

        foreach ($products as $product) {
            Product::updateOrCreate(['sku' => $product['sku']], $product);
        }
    }
}
