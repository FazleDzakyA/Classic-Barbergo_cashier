<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShiftReport;
use Illuminate\Http\Request;

class ShiftReportController extends Controller
{
    public function index()
    {
        $reports = ShiftReport::orderBy('submittedAt', 'desc')->get();
        return response()->json($reports);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sessionId' => 'required|numeric',
            'cashierName' => 'required|string',
            'date' => 'required|string',
            'totalTransactions' => 'required|integer',
            'cashRevenue' => 'required|integer',
            'nonCashRevenue' => 'required|integer',
            'totalExpenses' => 'required|integer',
            'startingCash' => 'required|integer',
            'expectedCash' => 'required|integer',
            'actualCash' => 'required|integer',
            'difference' => 'required|integer',
            'notes' => 'nullable|string',
            'status' => 'nullable|string',
            'submittedAt' => 'nullable|numeric',
        ]);

        $data['submittedAt'] = $data['submittedAt'] ?? (int) (microtime(true) * 1000);
        $data['status'] = $data['status'] ?? 'terkirim';

        $report = ShiftReport::create($data);
        return response()->json($report, 201);
    }

    public function verify($id)
    {
        $report = ShiftReport::find($id);
        if ($report) {
            $report->update(['status' => 'diverifikasi']);
        }
        return response()->json(['success' => true, 'report' => $report]);
    }
}
