<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'invoice_id')) {
                $table->string('invoice_id')->nullable()->index();
            }
            if (!Schema::hasColumn('orders', 'transaction_id')) {
                $table->string('transaction_id')->nullable();
            }
            if (!Schema::hasColumn('orders', 'paid_at')) {
                $table->timestamp('paid_at')->nullable();
            }
            if (!Schema::hasColumn('orders', 'expires_at')) {
                $table->timestamp('expires_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['invoice_id', 'transaction_id', 'paid_at', 'expires_at']);
        });
    }
};
