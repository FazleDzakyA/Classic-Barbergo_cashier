<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShiftReport;
use Illuminate\Http\Request;

// ====================================================================================
// CONTROLLER LAPORAN SHIFT KASIR (PENGIRIMAN & VERIFIKASI ADMIN)
// ====================================================================================
// Mengontrol alur laporan shift dari Kasir ke Admin: penerimaan rekapitulasi shift,
// penyimpanan ke database MySQL, dan proses verifikasi (ACC) oleh Admin.
class ShiftReportController extends Controller
{
    /**
     * Mengambil seluruh laporan shift kasir dari database, diurutkan dari yang terbaru.
     */
    public function index()
    {
        $reports = ShiftReport::orderBy('submittedAt', 'desc')->get();
        return response()->json($reports);
    }

    /**
     * Kasir mengirimkan laporan penutupan shift harian ke Admin.
     */
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

    /**
     * Admin memverifikasi (meng-ACC) laporan shift kasir.
     */
    public function verify($id)
    {
        $report = ShiftReport::find($id);
        if ($report) {
            $report->update(['status' => 'diverifikasi']);
        }
        return response()->json(['success' => true, 'report' => $report]);
    }
}
