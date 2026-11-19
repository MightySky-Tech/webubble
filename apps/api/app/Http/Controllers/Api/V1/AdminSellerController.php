<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SellerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSellerController extends Controller
{
    /**
     * List sellers with optional status filter
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = SellerProfile::with('user')->orderBy('created_at', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $sellers = $query->paginate(50);

        return response()->json([
            'data' => $sellers->items(),
            'pagination' => [
                'total' => $sellers->total(),
                'per_page' => $sellers->perPage(),
                'current_page' => $sellers->currentPage(),
                'last_page' => $sellers->lastPage(),
            ],
        ]);
    }

    /**
     * Show a single seller
     */
    public function show(SellerProfile $seller): JsonResponse
    {
        $seller->load('user');

        return response()->json(['data' => $seller]);
    }

    /**
     * Approve a seller application
     */
    public function approve(Request $request, SellerProfile $seller): JsonResponse
    {
        if ($seller->status !== SellerProfile::STATUS_PENDING) {
            return response()->json(
                ['error' => 'Only pending sellers can be approved'],
                422
            );
        }

        $seller->update([
            'status' => SellerProfile::STATUS_APPROVED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // TODO: Send approval email to seller
        // TODO: Grant seller role/permissions

        return response()->json([
            'message' => 'Seller approved successfully',
            'data' => $seller->load('user', 'reviewer'),
        ]);
    }

    /**
     * Reject a seller application
     */
    public function reject(Request $request, SellerProfile $seller): JsonResponse
    {
        if ($seller->status !== SellerProfile::STATUS_PENDING) {
            return response()->json(
                ['error' => 'Only pending sellers can be rejected'],
                422
            );
        }

        $reason = $request->input('reason', 'Application does not meet requirements');

        $seller->update([
            'status' => SellerProfile::STATUS_REJECTED,
            'review_notes' => $reason,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // TODO: Send rejection email to seller with reason

        return response()->json([
            'message' => 'Seller rejected successfully',
            'data' => $seller->load('user', 'reviewer'),
        ]);
    }
}
