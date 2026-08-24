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
        Schema::create('transactions', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('date', 20);
            $table->string('time', 20);
            $table->string('customerName', 100)->nullable();
            $table->integer('barberId');
            $table->string('serviceIds', 255);
            $table->integer('subtotal');
            $table->integer('discountPercent')->default(0);
            $table->integer('discountNominal')->default(0);
            $table->integer('taxPercent')->default(0);
            $table->integer('taxNominal')->default(0);
            $table->integer('total');
            $table->text('notes')->nullable();
            $table->string('paymentMethod', 20);
            $table->bigInteger('createdAt');
            $table->bigInteger('sessionId')->nullable();
            $table->integer('cashReceived')->nullable();
            $table->integer('changeReturned')->nullable();
            $table->string('customerEmail', 100)->nullable();
            $table->string('status', 30)->default('selesai');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
