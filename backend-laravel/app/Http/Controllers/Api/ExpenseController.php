<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Session;
use Illuminate\Http\Request;

// ====================================================================================
// CONTROLLER PENGELUARAN KAS OPERASIONAL (EXPENSES)
// ====================================================================================
// Mengatur pencatatan pengeluaran uang kas laci (seperti beli silet, es batu, listrik),
// serta meng-decrement estimasi uang fisik di shift kasir yang sedang berjalan.
class ExpenseController extends Controller
{
    /**
     * Mengambil daftar seluruh pengeluaran kas, diurutkan dari tanggal terbaru.
     */
    public function index()
    {
        $expenses = Expense::orderBy('date', 'desc')->orderBy('time', 'desc')->get();
        return response()->json($expenses);
    }

    /**
     * Mencatat pengeluaran uang kas baru & meng-decrement saldo estimasi laci kasir.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|string',
            'time' => 'required|string',
            'category' => 'required|string',
            'amount' => 'required|integer',
            'handler' => 'required|string',
            'notes' => 'nullable|string',
            'sessionId' => 'nullable|integer',
        ]);

        $expense = Expense::create($data);

        // Subtract from expectedCash in active session
        if (!empty($data['sessionId'])) {
            $session = Session::find($data['sessionId']);
            if ($session) {
                $session->decrement('expectedCash', $data['amount']);
            }
        }

        return response()->json($expense, 201);
    }

    /**
     * Mengubah data transaksi pengeluaran.
     */
    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'date' => 'required|string',
            'time' => 'required|string',
            'category' => 'required|string',
            'amount' => 'required|integer',
            'handler' => 'required|string',
            'notes' => 'nullable|string',
            'sessionId' => 'nullable|integer',
        ]);

        $expense = Expense::find($id);
        if (!$expense) {
            $expense = Expense::create(array_merge(['id' => (int) $id], $data));
        } else {
            $oldAmount = $expense->amount;
            $expense->update($data);

            if (!empty($expense->sessionId)) {
                $session = Session::find($expense->sessionId);
                if ($session) {
                    $diff = $data['amount'] - $oldAmount;
                    $session->decrement('expectedCash', $diff);
                }
            }
        }

        return response()->json($expense);
    }

    public function destroy($id)
    {
        $expense = Expense::find($id);
        if ($expense) {
            if ($expense->sessionId) {
                $session = Session::find($expense->sessionId);
                if ($session) {
                    $session->increment('expectedCash', $expense->amount);
                }
            }
            $expense->delete();
        }

        return response()->json(['success' => true, 'id' => (int) $id]);
    }
}
