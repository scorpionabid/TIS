<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherProfileApproval;
use App\Models\TeacherProfile;
use App\Models\TeacherAchievement;
use App\Models\TeacherCertificate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TeacherApprovalController extends Controller
{
    /**
     * Get all pending approval requests.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            // Check if user is sectoradmin
            if (!$user || !$user->hasRole('sektoradmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $query = TeacherProfileApproval::with(['user', 'approvedBy'])
                ->pending()
                ->orderBy('created_at', 'desc');

            // Filter by model type
            if ($request->has('model_type') && $request->model_type) {
                $query->where('model_type', $request->model_type);
            }

            // Filter by date range
            if ($request->has('date_from') && $request->date_from) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->has('date_to') && $request->date_to) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            $approvals = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $approvals
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get approval requests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get approval statistics.
     */
    public function stats(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('sektoradmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $stats = [
                'pending_count' => TeacherProfileApproval::pending()->count(),
                'approved_count' => TeacherProfileApproval::approved()->count(),
                'rejected_count' => TeacherProfileApproval::rejected()->count(),
                'pending_profiles' => TeacherProfile::pending()->count(),
                'pending_achievements' => TeacherAchievement::pending()->count(),
                'pending_certificates' => TeacherCertificate::pending()->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve an approval request.
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('sektoradmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $approval = TeacherProfileApproval::findOrFail($id);

            if ($approval->status !== TeacherProfileApproval::STATUS_PENDING) {
                return response()->json([
                    'success' => false,
                    'message' => 'Approval request is not pending'
                ], 400);
            }

            DB::beginTransaction();

            try {
                // Update the approval request
                $approval->approve($user->id);

                // Update the actual model
                $this->updateModelStatus($approval);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Approval request approved successfully'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject an approval request.
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('sektoradmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $request->validate([
                'rejection_reason' => 'required|string|max:500'
            ]);

            $approval = TeacherProfileApproval::findOrFail($id);

            if ($approval->status !== TeacherProfileApproval::STATUS_PENDING) {
                return response()->json([
                    'success' => false,
                    'message' => 'Approval request is not pending'
                ], 400);
            }

            DB::beginTransaction();

            try {
                // Update the approval request
                $approval->reject($user->id, $request->rejection_reason);

                // Update the actual model
                $this->updateModelStatus($approval);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Approval request rejected successfully'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk approve approval requests.
     */
    public function bulkApprove(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('sektoradmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $request->validate([
                'ids' => 'required|array',
                'ids.*' => 'integer|exists:teacher_profile_approvals,id'
            ]);

            $ids = $request->ids;
            $approvedCount = 0;

            DB::beginTransaction();

            try {
                foreach ($ids as $id) {
                    $approval = TeacherProfileApproval::find($id);
                    
                    if ($approval && $approval->status === TeacherProfileApproval::STATUS_PENDING) {
                        $approval->approve($user->id);
                        $this->updateModelStatus($approval);
                        $approvedCount++;
                    }
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => "Successfully approved {$approvedCount} requests",
                    'approved_count' => $approvedCount
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to bulk approve requests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get details of an approval request.
     */
    public function show($id): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->hasRole('sektoradmin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $approval = TeacherProfileApproval::with(['user', 'approvedBy'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $approval
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get approval details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the actual model status based on approval.
     */
    private function updateModelStatus(TeacherProfileApproval $approval): void
    {
        switch ($approval->model_type) {
            case TeacherProfileApproval::MODEL_TEACHER_PROFILE:
                $profile = TeacherProfile::find($approval->model_id);
                if ($profile) {
                    if ($approval->isApproved()) {
                        $profile->approve($approval->approved_by);
                    } elseif ($approval->isRejected()) {
                        $profile->reject($approval->approved_by, $approval->rejection_reason);
                    }
                }
                break;

            case TeacherProfileApproval::MODEL_TEACHER_ACHIEVEMENT:
                $achievement = TeacherAchievement::find($approval->model_id);
                if ($achievement) {
                    if ($approval->isApproved()) {
                        $achievement->approve($approval->approved_by);
                    } elseif ($approval->isRejected()) {
                        $achievement->reject($approval->approved_by, $approval->rejection_reason);
                    }
                }
                break;

            case TeacherProfileApproval::MODEL_TEACHER_CERTIFICATE:
                $certificate = TeacherCertificate::find($approval->model_id);
                if ($certificate) {
                    if ($approval->isApproved()) {
                        $certificate->approve($approval->approved_by);
                    } elseif ($approval->isRejected()) {
                        $certificate->reject($approval->approved_by, $approval->rejection_reason);
                    }
                }
                break;
        }
    }
}
