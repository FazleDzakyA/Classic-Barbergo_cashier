<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Session;
use App\Models\Service;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index()
    {
        $transactions = Transaction::orderBy('createdAt', 'desc')->get();

        $mapped = $transactions->map(function ($t) {
            $serviceIdsArr = !empty($t->serviceIds)
                ? array_map('intval', explode(',', $t->serviceIds))
                : [];

            return array_merge($t->toArray(), [
                'serviceIds' => $serviceIdsArr,
            ]);
        });

        return response()->json($mapped);
    }

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
            'createdAt' => 'required|integer',
            'sessionId' => 'nullable|integer',
            'cashReceived' => 'nullable|integer',
            'changeReturned' => 'nullable|integer',
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

        return response()->json($request->all(), 201);
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
            $tx->delete();
        }

        return response()->json(['success' => true, 'id' => $id]);
    }
}
