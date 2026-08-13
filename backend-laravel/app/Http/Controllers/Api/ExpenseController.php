<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Session;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index()
    {
        $expenses = Expense::orderBy('date', 'desc')->orderBy('time', 'desc')->get();
        return response()->json($expenses);
    }

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
