<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Session;
use App\Models\Service;
use Illuminate\Http\Request;

// ====================================================================================
// CONTROLLER TRANSAKSI (POS KASIR & BOOKING ONLINE)
// ====================================================================================
// Mengontrol pemrosesan data transaksi, booking online, pemotongan stok otomatis, 
// serta penambahan omset tunai ke shift kasir yang sedang aktif.
class TransactionController extends Controller
{
    /**
     * Mengambil daftar seluruh transaksi dari database MySQL, diurutkan dari yang terbaru.
     */
    public function index()
    {
        $transactions = Transaction::orderBy('createdAt', 'desc')->get();

        $mapped = $transactions->map(function (Transaction $t) {
            $serviceIdsArr = !empty($t->serviceIds)
                ? array_map('intval', explode(',', $t->serviceIds))
                : [];

            $data = $t->toArray();
            $data['serviceIds'] = $serviceIdsArr;
            return $data;
        });

        return response()->json($mapped);
    }

    /**
     * Menyimpan transaksi baru (Walk-In Kasir / Booking Online) ke MySQL.
     * Meng-increment omset tunai shift kasir & meng-decrement stok produk jika ada.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'date' => 'required|string',
            'time' => 'required|string',
            'customerName' => 'nullable|string',
            'barberId' => 'required|integer',
            'serviceIds' => 'required|array',
            'subtotal' => 'required|integer',
            'discountPercent' => 'nullable|integer',
            'discountNominal' => 'nullable|integer',
            'taxPercent' => 'nullable|integer',
            'taxNominal' => 'nullable|integer',
            'total' => 'required|integer',
            'notes' => 'nullable|string',
            'paymentMethod' => 'required|string',
            'createdAt' => 'required|numeric',
            'sessionId' => 'nullable|numeric',
            'cashReceived' => 'nullable|integer',
            'changeReturned' => 'nullable|integer',
            'customerEmail' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $serviceIdsStr = implode(',', $data['serviceIds']);

        $tx = Transaction::create([
            'id' => $data['id'],
            'date' => $data['date'],
            'time' => $data['time'],
            'customerName' => $data['customerName'] ?? '',
            'barberId' => $data['barberId'],
            'serviceIds' => $serviceIdsStr,
            'subtotal' => $data['subtotal'],
            'discountPercent' => $data['discountPercent'] ?? 0,
            'discountNominal' => $data['discountNominal'] ?? 0,
            'taxPercent' => $data['taxPercent'] ?? 0,
            'taxNominal' => $data['taxNominal'] ?? 0,
            'total' => $data['total'],
            'notes' => $data['notes'] ?? '',
            'paymentMethod' => $data['paymentMethod'],
            'createdAt' => $data['createdAt'],
            'sessionId' => $data['sessionId'] ?? null,
            'cashReceived' => $data['cashReceived'] ?? null,
            'changeReturned' => $data['changeReturned'] ?? null,
            'customerEmail' => $data['customerEmail'] ?? null,
            'status' => $data['status'] ?? 'selesai',
        ]);

        // If Cash, increment expectedCash in active session
        if ($data['paymentMethod'] === 'Cash' && !empty($data['sessionId'])) {
            $session = Session::find($data['sessionId']);
            if ($session) {
                $session->increment('expectedCash', $data['total']);
            }
        }

        // Decrease stock for items with stock
        if (!empty($data['serviceIds'])) {
            foreach ($data['serviceIds'] as $sId) {
                $srv = Service::find($sId);
                if ($srv && $srv->stock !== null) {
                    $srv->decrement('stock', 1);
                    if ($srv->stock < 0) {
                        $srv->update(['stock' => 0]);
                    }
                }
            }
        }

        return response()->json($tx, 201);
    }

    public function update(Request $request, $id)
    {
        $tx = Transaction::find($id);
        if (!$tx) {
            return response()->json(['message' => 'Transaksi tidak ditemukan'], 404);
        }

        $data = $request->validate([
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
            'paymentMethod' => 'nullable|string',
        ]);

        $tx->update(array_filter($data, fn($v) => !is_null($v)));
        return response()->json($tx);
    }

    public function destroy($id)
    {
        $tx = Transaction::find($id);
        if ($tx) {
            if ($tx->paymentMethod === 'Cash' && $tx->sessionId) {
                $session = Session::find($tx->sessionId);
                if ($session) {
                    $session->decrement('expectedCash', $tx->total);
                }
            }

            // Restore product stock (e.g. Pomade) if transaction is canceled/deleted
            if (!empty($tx->serviceIds)) {
                $serviceIdsArr = is_array($tx->serviceIds)
                    ? $tx->serviceIds
                    : array_map('intval', explode(',', $tx->serviceIds));

                foreach ($serviceIdsArr as $sId) {
                    $srv = Service::find($sId);
                    if ($srv && $srv->stock !== null) {
                        $srv->increment('stock', 1);
                    }
                }
            }

            $tx->delete();
        }

        return response()->json(['success' => true, 'id' => $id]);
    }
}
