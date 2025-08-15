<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ApprovalApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $request->get('status', 'pending');
        $type = $request->get('type');
        
        $query = DB::table('data_approval_requests')
            ->join('approval_workflows', 'data_approval_requests.workflow_id', '=', 'approval_workflows.id')
            ->join('users as requester', 'data_approval_requests.submitted_by', '=', 'requester.id')
            ->where('data_approval_requests.current_status', $status);
            
        if ($type) {
            $query->where('approval_workflows.workflow_type', $type);
        }
        
        $approvals = $query->select([
            'data_approval_requests.*',
            'approval_workflows.name as workflow_name',
            'approval_workflows.workflow_type',
            'requester.username as requester_name',
            'requester.email as requester_email'
        ])
        ->orderBy('data_approval_requests.created_at', 'desc')
        ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $approvals
        ]);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'comments' => 'nullable|string|max:1000'
        ]);

        $approval = DB::table('data_approval_requests')
            ->where('id', $id)
            ->where('current_status', 'pending')
            ->first();

        if (!$approval) {
            return response()->json([
                'success' => false,
                'message' => 'Approval request not found or already processed'
            ], 404);
        }

        DB::beginTransaction();
        try {
            DB::table('data_approval_requests')
                ->where('id', $id)
                ->update([
                    'current_status' => 'approved',
                    'completed_at' => now(),
                    'updated_at' => now()
                ]);

            DB::table('approval_actions')->insert([
                'approval_request_id' => $id,
                'approver_id' => $request->user()->id,
                'approval_level' => 1,
                'action' => 'approved',
                'comments' => $validated['comments'] ?? null,
                'action_taken_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Request approved successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve request'
            ], 500);
        }
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'comments' => 'required|string|max:1000'
        ]);

        $approval = DB::table('data_approval_requests')
            ->where('id', $id)
            ->where('current_status', 'pending')
            ->first();

        if (!$approval) {
            return response()->json([
                'success' => false,
                'message' => 'Approval request not found or already processed'
            ], 404);
        }

        DB::beginTransaction();
        try {
            DB::table('data_approval_requests')
                ->where('id', $id)
                ->update([
                    'current_status' => 'rejected',
                    'completed_at' => now(),
                    'updated_at' => now()
                ]);

            DB::table('approval_actions')->insert([
                'approval_request_id' => $id,
                'approver_id' => $request->user()->id,
                'approval_level' => 1,
                'action' => 'rejected',
                'comments' => $validated['comments'],
                'action_taken_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Request rejected successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject request'
            ], 500);
        }
    }

    public function getStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $stats = [
            'pending' => DB::table('data_approval_requests')
                ->where('current_status', 'pending')
                ->count(),
            'approved_today' => DB::table('data_approval_requests')
                ->where('current_status', 'approved')
                ->whereDate('completed_at', today())
                ->count(),
            'rejected_today' => DB::table('data_approval_requests')
                ->where('current_status', 'rejected')
                ->whereDate('completed_at', today())
                ->count()
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}
