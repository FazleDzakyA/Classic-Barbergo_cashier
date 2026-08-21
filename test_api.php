<?php

function testPost($url, $data) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Accept: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $res];
}

// 1. Test Barber Add
$barberRes = testPost('http://localhost:8000/api/barbers', [
    'name' => 'Barber Baru ' . rand(100, 999),
    'phone' => '08123456789',
    'address' => 'Jl. Test No 123',
    'shift' => 'Pagi',
    'isActive' => true,
    'joinedDate' => '2026-08-21'
]);
echo "POST /api/barbers -> Code: {$barberRes['code']} Body: {$barberRes['body']}\n";

// 2. Test Expense Add
$expenseRes = testPost('http://localhost:8000/api/expenses', [
    'date' => '2026-08-21',
    'time' => '14:30',
    'category' => 'Pengeluaran Bebas',
    'amount' => 50000,
    'handler' => 'Faiz',
    'notes' => 'Beli sabun kramas'
]);
echo "POST /api/expenses -> Code: {$expenseRes['code']} Body: {$expenseRes['body']}\n";
