<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Barber;
use Illuminate\Http\Request;

// ====================================================================================
// CONTROLLER ULASAN & RATING (CUSTOMER REVIEWS)
// ====================================================================================
// Mengelola rating bintang (1-5) & ulasan kepuasan pelanggan terhadap barber dan layanan.
class ReviewController extends Controller
{
    /**
     * Mengambil daftar ulasan pelanggan beserta data relasi barber, diurutkan dari yang terbaru.
     */
    public function index()
    {
        $reviews = Review::with('barber')->orderBy('createdAt', 'desc')->get();
        return response()->json($reviews);
    }

    /**
     * Menyimpan ulasan & rating bintang dari pelanggan.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'customerName' => 'required|string',
            'barberId' => 'required|integer',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
            'tags' => 'nullable|string',
            'createdAt' => 'nullable|integer',
        ]);

        if (empty($data['createdAt'])) {
            $data['createdAt'] = (int) (microtime(true) * 1000);
        }

        $review = Review::create($data);
        $review->load('barber');

        return response()->json($review, 201);
    }

    /**
     * Menghapus ulasan pelanggan.
     */
    public function destroy($id)
    {
        $review = Review::find($id);
        if ($review) {
            $review->delete();
        }
        return response()->json(['success' => true, 'id' => (int) $id]);
    }
}
