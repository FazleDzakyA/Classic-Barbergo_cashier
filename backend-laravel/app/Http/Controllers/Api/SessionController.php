<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Session;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index()
    {
        $sessions = Session::orderBy('id', 'desc')->get();
        return response()->json($sessions);
    }

    public function active()
    {
        $session = Session::where('status', 'open')->first();
        return response()->json($session);
    }

    public function open(Request $request)
    {
        $data = $request->validate([
            'openedBy' => 'required|string',
            'startingCash' => 'required|integer',
        ]);

        $active = Session::where('status', 'open')->first();
        if ($active) {
            return response()->json(['error' => 'Masih ada shift kasir yang aktif'], 400);
        }

        $openTime = (int) (microtime(true) * 1000);

        $session = Session::create([
            'openedBy' => $data['openedBy'],
            'openTime' => $openTime,
            'startingCash' => $data['startingCash'],
            'expectedCash' => $data['startingCash'],
            'status' => 'open',
            'notes' => '',
        ]);

        return response()->json($session, 201);
    }

    public function close(Request $request)
    {
        $data = $request->validate([
            'sessionId' => 'required|integer',
            'actualCash' => 'required|integer',
            'notes' => 'nullable|string',
        ]);

        $session = Session::where('id', $data['sessionId'])
                          ->where('status', 'open')
                          ->first();

        if (!$session) {
            return response()->json(['error' => 'Shift aktif tidak ditemukan'], 404);
        }

        $closeTime = (int) (microtime(true) * 1000);

        $session->update([
            'closeTime' => $closeTime,
            'actualCash' => $data['actualCash'],
            'status' => 'closed',
            'notes' => $data['notes'] ?? '',
        ]);

        return response()->json([
            'success' => true,
            'sessionId' => $session->id,
            'closeTime' => $closeTime,
            'actualCash' => $data['actualCash'],
            'status' => 'closed',
            'notes' => $data['notes'] ?? '',
        ]);
    }
}
