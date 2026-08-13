<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Barber;
use App\Models\Service;
use App\Models\Session;
use App\Models\Transaction;
use App\Models\Expense;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class DatabaseController extends Controller
{
    public function reset()
    {
        Transaction::truncate();
        Expense::truncate();
        Session::truncate();
        Barber::truncate();
        Service::truncate();
        User::truncate();
        Setting::truncate();

        Artisan::call('db:seed', ['--force' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Database reset successfully.'
        ]);
    }

    public function import(Request $request)
    {
        $data = $request->all();

        Transaction::truncate();
        Expense::truncate();
        Session::truncate();
        Barber::truncate();
        Service::truncate();
        User::truncate();
        Setting::truncate();

        if (!empty($data['settings']) && count($data['settings']) > 0) {
            $s = $data['settings'][0];
            Setting::create([
                'key_name' => 'app_settings',
                'logo' => $s['logo'] ?? null,
                'name' => $s['name'] ?? null,
                'address' => $s['address'] ?? null,
                'phone' => $s['phone'] ?? null,
                'receiptFooter' => $s['receiptFooter'] ?? null,
                'defaultTax' => $s['defaultTax'] ?? 0,
                'currency' => $s['currency'] ?? 'Rp',
            ]);
        }

        if (!empty($data['users'])) {
            foreach ($data['users'] as $u) {
                User::create([
                    'id' => $u['id'],
                    'username' => $u['username'],
                    'passwordHash' => $u['passwordHash'],
                    'role' => $u['role'],
                    'name' => $u['name'],
                    'isActive' => !empty($u['isActive']),
                    'createdAt' => $u['createdAt'] ?? null,
                ]);
            }
        }

        if (!empty($data['barbers'])) {
            foreach ($data['barbers'] as $b) {
                Barber::create([
                    'id' => $b['id'],
                    'name' => $b['name'],
                    'phone' => $b['phone'] ?? null,
                    'address' => $b['address'] ?? null,
                    'shift' => $b['shift'] ?? null,
                    'isActive' => !empty($b['isActive']),
                    'photo' => $b['photo'] ?? null,
                    'joinedDate' => $b['joinedDate'] ?? null,
                ]);
            }
        }

        if (!empty($data['services'])) {
            foreach ($data['services'] as $s) {
                Service::create([
                    'id' => $s['id'],
                    'name' => $s['name'],
                    'category' => $s['category'] ?? null,
                    'price' => $s['price'],
                    'duration' => $s['duration'] ?? null,
                    'labelColor' => $s['labelColor'] ?? null,
                    'isActive' => !empty($s['isActive']),
                    'stock' => $s['stock'] ?? null,
                ]);
            }
        }

        if (!empty($data['sessions'])) {
            foreach ($data['sessions'] as $ss) {
                Session::create([
                    'id' => $ss['id'],
                    'openedBy' => $ss['openedBy'],
                    'openTime' => $ss['openTime'],
                    'closeTime' => $ss['closeTime'] ?? null,
                    'startingCash' => $ss['startingCash'],
                    'expectedCash' => $ss['expectedCash'] ?? 0,
                    'actualCash' => $ss['actualCash'] ?? null,
                    'status' => $ss['status'] ?? 'open',
                    'notes' => $ss['notes'] ?? '',
                ]);
            }
        }

        if (!empty($data['transactions'])) {
            foreach ($data['transactions'] as $t) {
                $serviceIdsStr = is_array($t['serviceIds']) ? implode(',', $t['serviceIds']) : $t['serviceIds'];
                Transaction::create([
                    'id' => $t['id'],
                    'date' => $t['date'],
                    'time' => $t['time'],
                    'customerName' => $t['customerName'] ?? '',
                    'barberId' => $t['barberId'],
                    'serviceIds' => $serviceIdsStr,
                    'subtotal' => $t['subtotal'],
                    'discountPercent' => $t['discountPercent'] ?? 0,
                    'discountNominal' => $t['discountNominal'] ?? 0,
                    'taxPercent' => $t['taxPercent'] ?? 0,
                    'taxNominal' => $t['taxNominal'] ?? 0,
                    'total' => $t['total'],
                    'notes' => $t['notes'] ?? '',
                    'paymentMethod' => $t['paymentMethod'],
                    'createdAt' => $t['createdAt'],
                    'sessionId' => $t['sessionId'] ?? null,
                    'cashReceived' => $t['cashReceived'] ?? null,
                    'changeReturned' => $t['changeReturned'] ?? null,
                ]);
            }
        }

        if (!empty($data['expenses'])) {
            foreach ($data['expenses'] as $e) {
                Expense::create([
                    'id' => $e['id'],
                    'date' => $e['date'],
                    'time' => $e['time'],
                    'category' => $e['category'],
                    'amount' => $e['amount'],
                    'handler' => $e['handler'],
                    'notes' => $e['notes'] ?? '',
                    'sessionId' => $e['sessionId'] ?? null,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Database imported successfully.'
        ]);
    }
}
