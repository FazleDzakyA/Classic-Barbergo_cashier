<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

DB::statement('SET FOREIGN_KEY_CHECKS=0;');
DB::table('transactions')->truncate();
DB::table('expenses')->truncate();
DB::table('sessions')->truncate();

if (Schema::hasTable('reviews')) {
    DB::table('reviews')->truncate();
}

DB::statement('SET FOREIGN_KEY_CHECKS=1;');

echo "All transaction history, expenses, and sessions cleared successfully.\n";
