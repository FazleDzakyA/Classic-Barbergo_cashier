<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

// ====================================================================================
// CONTROLLER MANAJEMEN LAYANAN / SERVIS POTONG RAMBUT
// ====================================================================================
// Mengatur katalog jenis potong rambut, harga, durasi pengerjaan, kategori, 
// serta persediaan stok produk tambahan (seperti pomade/shampoo).
class ServiceController extends Controller
{
    /**
     * Mengambil daftar seluruh layanan potong rambut dari MySQL.
     */
    public function index()
    {
        $services = Service::orderBy('name', 'asc')->get();
        return response()->json($services);
    }

    /**
     * Menambahkan jenis layanan / produk baru ke katalog.
     */
    public function store(Request $request)
    {
        if ($request->has('stock') && ($request->stock === '' || $request->stock === 'null')) {
            $request->merge(['stock' => null]);
        }

        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'nullable|string',
            'price' => 'required|integer',
            'duration' => 'nullable|integer',
            'labelColor' => 'nullable|string',
            'isActive' => 'boolean',
            'stock' => 'nullable|integer',
            'image' => 'nullable|string',
        ]);

        $service = Service::create($data);
        return response()->json($service, 201);
    }

    /**
     * Mengubah data layanan potong (nama, harga, kategori, durasi, stok).
     */
    public function update(Request $request, $id)
    {
        if ($request->has('stock') && ($request->stock === '' || $request->stock === 'null')) {
            $request->merge(['stock' => null]);
        }

        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'nullable|string',
            'price' => 'required|integer',
            'duration' => 'nullable|integer',
            'labelColor' => 'nullable|string',
            'isActive' => 'boolean',
            'stock' => 'nullable|integer',
            'image' => 'nullable|string',
        ]);

        $service = Service::find($id);
        if (!$service) {
            $service = Service::create(array_merge(['id' => (int) $id], $data));
        } else {
            $service->update($data);
        }

        return response()->json($service);
    }

    public function destroy($id)
    {
        $service = Service::find($id);
        if ($service) {
            $service->delete();
        }

        return response()->json([
            'success' => true,
            'id' => (int) $id
        ]);
    }
}
