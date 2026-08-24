<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_reports', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('sessionId');
            $table->string('cashierName', 100);
            $table->string('date', 20);
            $table->integer('totalTransactions')->default(0);
            $table->integer('cashRevenue')->default(0);
            $table->integer('nonCashRevenue')->default(0);
            $table->integer('totalExpenses')->default(0);
            $table->integer('startingCash')->default(0);
            $table->integer('expectedCash')->default(0);
            $table->integer('actualCash')->default(0);
            $table->integer('difference')->default(0);
            $table->text('notes')->nullable();
            $table->string('status', 30)->default('terkirim'); // terkirim, diverifikasi
            $table->bigInteger('submittedAt');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_reports');
    }
};
