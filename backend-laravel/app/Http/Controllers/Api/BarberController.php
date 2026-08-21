<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barber;
use Illuminate\Http\Request;

class BarberController extends Controller
{
    public function index()
    {
        $barbers = Barber::orderBy('name', 'asc')->get();
        return response()->json($barbers);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|unique:barbers,name',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'shift' => 'nullable|string',
            'isActive' => 'boolean',
            'photo' => 'nullable|string',
            'joinedDate' => 'nullable|string',
        ], [
            'name.unique' => 'Nama barber ini sudah terdaftar. Gunakan nama lain.'
        ]);

        $barber = Barber::create($data);
        return response()->json($barber, 201);
    }

    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'name' => 'required|string|unique:barbers,name,' . $id,
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'shift' => 'nullable|string',
            'isActive' => 'boolean',
            'photo' => 'nullable|string',
            'joinedDate' => 'nullable|string',
        ], [
            'name.unique' => 'Nama barber ini sudah terdaftar. Gunakan nama lain.'
        ]);

        $barber = Barber::find($id);
        if (!$barber) {
            $barber = Barber::create(array_merge(['id' => (int) $id], $data));
        } else {
            $barber->update($data);
        }

        return response()->json($barber);
    }

    public function destroy($id)
    {
        $barber = Barber::find($id);
        if ($barber) {
            $barber->delete();
        }

        return response()->json([
            'success' => true,
            'id' => (int) $id
        ]);
    }
}
