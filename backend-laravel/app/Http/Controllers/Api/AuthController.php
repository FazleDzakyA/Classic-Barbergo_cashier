<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'passwordHash' => 'required|string',
        ]);

        $user = User::where('username', $request->username)
                    ->where('isActive', true)
                    ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Username tidak ditemukan'
            ], 401);
        }

        if ($user->passwordHash !== $request->passwordHash) {
            return response()->json([
                'success' => false,
                'message' => 'Password salah'
            ], 401);
        }

        return response()->json([
            'success' => true,
            'user' => [
                'username' => $user->username,
                'name' => $user->name,
                'role' => $user->role,
            ]
        ]);
    }

    public function index()
    {
        $users = User::all();
        return response()->json($users);
    }
}
