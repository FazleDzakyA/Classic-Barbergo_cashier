<?php

function testRequest($method, $url, $data = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Accept: application/json']);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $res];
}

echo "=== TESTING ALL CRUD ENDPOINTS ===\n\n";

// 1. Service CRUD
echo "--- SERVICE --- \n";
$sAdd = testRequest('POST', 'http://localhost:8000/api/services', [
    'name' => 'Service Test ' . rand(100, 999),
    'category' => 'Haircut',
    'price' => 25000,
    'duration' => 30,
    'labelColor' => '#D4AF37',
    'isActive' => true,
    'stock' => null
]);
echo "POST /api/services -> Code: {$sAdd['code']} Body: {$sAdd['body']}\n";
$sData = json_decode($sAdd['body'], true);
$sId = $sData['id'] ?? null;

if ($sId) {
    $sEdit = testRequest('PUT', "http://localhost:8000/api/services/{$sId}", [
        'name' => 'Service Test Updated',
        'category' => 'Haircut',
        'price' => 30000,
        'duration' => 35,
        'labelColor' => '#4169E1',
        'isActive' => true,
        'stock' => null
    ]);
    echo "PUT /api/services/{$sId} -> Code: {$sEdit['code']} Body: {$sEdit['body']}\n";

    $sDel = testRequest('DELETE', "http://localhost:8000/api/services/{$sId}");
    echo "DELETE /api/services/{$sId} -> Code: {$sDel['code']} Body: {$sDel['body']}\n";
}

// 2. Expense CRUD
echo "\n--- EXPENSE --- \n";
$eAdd = testRequest('POST', 'http://localhost:8000/api/expenses', [
    'date' => '2026-08-21',
    'time' => '14:30',
    'category' => 'Pengeluaran Bebas',
    'amount' => 50000,
    'handler' => 'Faiz',
    'notes' => 'Beli perlengkapan'
]);
echo "POST /api/expenses -> Code: {$eAdd['code']} Body: {$eAdd['body']}\n";
$eData = json_decode($eAdd['body'], true);
$eId = $eData['id'] ?? null;

if ($eId) {
    $eEdit = testRequest('PUT', "http://localhost:8000/api/expenses/{$eId}", [
        'date' => '2026-08-21',
        'time' => '14:35',
        'category' => 'Pengeluaran Bebas',
        'amount' => 60000,
        'handler' => 'Faiz',
        'notes' => 'Beli perlengkapan updated'
    ]);
    echo "PUT /api/expenses/{$eId} -> Code: {$eEdit['code']} Body: {$eEdit['body']}\n";

    $eDel = testRequest('DELETE', "http://localhost:8000/api/expenses/{$eId}");
    echo "DELETE /api/expenses/{$eId} -> Code: {$eDel['code']} Body: {$eDel['body']}\n";
}

// 3. Barber CRUD
echo "\n--- BARBER --- \n";
$bAdd = testRequest('POST', 'http://localhost:8000/api/barbers', [
    'name' => 'Barber Test ' . rand(100, 999),
    'phone' => '0812345678',
    'address' => 'Semarang',
    'shift' => 'Pagi',
    'isActive' => true,
    'joinedDate' => '2026-08-21'
]);
echo "POST /api/barbers -> Code: {$bAdd['code']} Body: {$bAdd['body']}\n";
$bData = json_decode($bAdd['body'], true);
$bId = $bData['id'] ?? null;

if ($bId) {
    $bEdit = testRequest('PUT', "http://localhost:8000/api/barbers/{$bId}", [
        'name' => 'Barber Test Updated ' . rand(100, 999),
        'phone' => '0812345678',
        'address' => 'Semarang Central',
        'shift' => 'Malam',
        'isActive' => true,
        'joinedDate' => '2026-08-21'
    ]);
    echo "PUT /api/barbers/{$bId} -> Code: {$bEdit['code']} Body: {$bEdit['body']}\n";

    $bDel = testRequest('DELETE', "http://localhost:8000/api/barbers/{$bId}");
    echo "DELETE /api/barbers/{$bId} -> Code: {$bDel['code']} Body: {$bDel['body']}\n";
}
