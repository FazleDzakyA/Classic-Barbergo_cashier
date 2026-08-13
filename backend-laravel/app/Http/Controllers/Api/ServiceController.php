<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index()
    {
        $services = Service::orderBy('name', 'asc')->get();
        return response()->json($services);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'nullable|string',
            'price' => 'required|integer',
            'duration' => 'nullable|integer',
            'labelColor' => 'nullable|string',
            'isActive' => 'boolean',
            'stock' => 'nullable|integer',
        ]);

        $service = Service::create($data);
        return response()->json($service, 201);
    }

    public function update(Request $request, $id)
    {
        $service = Service::findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'nullable|string',
            'price' => 'required|integer',
            'duration' => 'nullable|integer',
            'labelColor' => 'nullable|string',
            'isActive' => 'boolean',
            'stock' => 'nullable|integer',
        ]);

        $service->update($data);
        return response()->json($service);
    }

    public function destroy($id)
    {
        $service = Service::findOrFail($id);
        $service->delete();

        return response()->json([
            'success' => true,
            'id' => (int) $id
        ]);
    }
}
