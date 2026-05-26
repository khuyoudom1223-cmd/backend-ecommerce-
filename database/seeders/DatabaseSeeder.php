<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Customer User
        User::updateOrCreate(
            ['email' => 'alex@example.com'],
            [
                'name' => 'Alex Mercer',
                'password' => bcrypt('password'),
                'role' => 'user',
                'wallet_balance' => 250.00
            ]
        );

        // 2. Vendor User
        User::updateOrCreate(
            ['email' => 'vendor@example.com'],
            [
                'name' => 'Vogue Vendor',
                'password' => bcrypt('password'),
                'role' => 'vendor',
                'wallet_balance' => 50.00
            ]
        );

        // 3. Admin User
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Super Admin',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'wallet_balance' => 0.00
            ]
        );

        // 4. Run Product Seeder
        $this->call(ProductSeeder::class);
    }
}
