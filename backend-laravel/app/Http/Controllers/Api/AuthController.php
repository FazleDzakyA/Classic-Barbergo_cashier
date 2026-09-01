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

        $user = User::where(function($q) use ($request) {
                    $q->where('username', $request->username)
                      ->orWhere('email', $request->username);
                })
                ->where('isActive', true)
                ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau Email tidak ditemukan'
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
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role,
            ]
        ]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'username' => 'nullable|string|unique:users,username',
            'email' => 'required|string|email|unique:users,email',
            'passwordHash' => 'required|string',
        ], [
            'email.unique' => 'Email ini sudah terdaftar. Silakan login.',
            'username.unique' => 'Username ini sudah digunakan. Silakan gunakan username lain.'
        ]);

        $username = !empty($data['username']) ? strtolower(trim($data['username'])) : (explode('@', $data['email'])[0] . rand(100, 999));

        $user = User::create([
            'username' => $username,
            'email' => $data['email'],
            'name' => $data['name'],
            'passwordHash' => $data['passwordHash'],
            'role' => 'customer',
            'isActive' => true,
            'createdAt' => now()->toIso8601String()
        ]);

        return response()->json([
            'success' => true,
            'user' => [
                'username' => $user->username,
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role,
            ]
        ], 201);
    }

    public function index()
    {
        $users = User::all();
        return response()->json($users);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User tidak ditemukan'], 404);
        }

        $data = $request->validate([
            'name' => 'nullable|string',
            'passwordHash' => 'nullable|string',
            'isActive' => 'nullable|boolean',
            'role' => 'nullable|string',
        ]);

        $user->update(array_filter($data, fn($v) => !is_null($v)));

        return response()->json($user);
    }
}
