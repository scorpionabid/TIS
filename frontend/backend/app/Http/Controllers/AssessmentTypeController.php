<?php

namespace App\Http\Controllers;

use App\Models\AssessmentType;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AssessmentTypeController extends Controller
{
    // Middleware will be handled by routes, no need for constructor

    /**
     * Display a listing of assessment types
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        // Build query with user access control
        $query = AssessmentType::with(['creator', 'institution'])
            ->orderBy('created_at', 'desc');

        // Apply access control based on user role
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can see all assessment types
        } elseif ($user->hasRole('regionadmin')) {
            // RegionAdmin can see global types and their institution's types
            $query->where(function ($q) use ($user) {
                $q->whereNull('institution_id') // Global types
                  ->orWhere('institution_id', $user->institution_id); // Their institution's types
            });
        } else {
            // Other roles can only see their institution's types
            $query->forInstitution($user->institution_id);
        }

        // Apply filters
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        $assessmentTypes = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $assessmentTypes,
            'message' => 'Qiymətləndirmə növləri uğurla yükləndi'
        ]);
    }

    /**
     * Store a newly created assessment type
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Check permissions
        if (!$user->hasRole(['superadmin', 'regionadmin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur'
            ], 403);
        }

        // Validation rules
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'category' => ['required', Rule::in(['ksq', 'bsq', 'custom'])],
            'is_active' => 'boolean',
            'criteria' => 'nullable|array',
            'max_score' => 'required|integer|min:1|max:1000',
            'scoring_method' => ['required', Rule::in(['percentage', 'points', 'grades'])],
            'grade_levels' => 'nullable|array',
            'subjects' => 'nullable|array',
            'institution_id' => 'nullable|exists:institutions,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        $data['created_by'] = $user->id;

        // RegionAdmin can only create for their own institution
        if ($user->hasRole('regionadmin') && isset($data['institution_id'])) {
            if ($data['institution_id'] !== $user->institution_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Yalnız öz təşkilatınız üçün qiymətləndirmə növü yarada bilərsiniz'
                ], 403);
            }
        }

        // Only SuperAdmin can create global types (institution_id = null)
        if (!isset($data['institution_id']) && !$user->hasRole('superadmin')) {
            return response()->json([
                'success' => false,
                'message' => 'Yalnız SuperAdmin sistem geneli qiymətləndirmə növü yarada bilər'
            ], 403);
        }

        $assessmentType = AssessmentType::create($data);
        $assessmentType->load(['creator', 'institution']);

        return response()->json([
            'success' => true,
            'data' => $assessmentType,
            'message' => 'Qiymətləndirmə növü uğurla yaradıldı'
        ], 201);
    }

    /**
     * Display the specified assessment type
     */
    public function show(AssessmentType $assessmentType): JsonResponse
    {
        $user = Auth::user();

        // Check if user can view this assessment type
        if (!$this->canUserAccessAssessmentType($user, $assessmentType)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növünə giriş icazəniz yoxdur'
            ], 403);
        }

        $assessmentType->load(['creator', 'institution']);

        return response()->json([
            'success' => true,
            'data' => $assessmentType,
            'message' => 'Qiymətləndirmə növü məlumatları'
        ]);
    }

    /**
     * Update the specified assessment type
     */
    public function update(Request $request, AssessmentType $assessmentType): JsonResponse
    {
        $user = Auth::user();

        // Check if user can edit this assessment type
        if (!$assessmentType->canBeEditedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növünü redaktə etmək icazəniz yoxdur'
            ], 403);
        }

        // Validation rules
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'category' => ['required', Rule::in(['ksq', 'bsq', 'custom'])],
            'is_active' => 'boolean',
            'criteria' => 'nullable|array',
            'max_score' => 'required|integer|min:1|max:1000',
            'scoring_method' => ['required', Rule::in(['percentage', 'points', 'grades'])],
            'grade_levels' => 'nullable|array',
            'subjects' => 'nullable|array',
            'institution_id' => 'nullable|exists:institutions,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasiya xətası',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        // RegionAdmin can only update to their own institution
        if ($user->hasRole('regionadmin') && isset($data['institution_id'])) {
            if ($data['institution_id'] !== $user->institution_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Yalnız öz təşkilatınıza təyin edə bilərsiniz'
                ], 403);
            }
        }

        $assessmentType->update($data);
        $assessmentType->load(['creator', 'institution']);

        return response()->json([
            'success' => true,
            'data' => $assessmentType,
            'message' => 'Qiymətləndirmə növü uğurla yeniləndi'
        ]);
    }

    /**
     * Remove the specified assessment type from storage
     */
    public function destroy(AssessmentType $assessmentType): JsonResponse
    {
        $user = Auth::user();

        // Check if user can delete this assessment type
        if (!$assessmentType->canBeEditedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növünü silmək icazəniz yoxdur'
            ], 403);
        }

        // Check if there are any results associated with this type
        $hasResults = $assessmentType->ksqResults()->exists() || 
                     $assessmentType->bsqResults()->exists();

        if ($hasResults) {
            return response()->json([
                'success' => false,
                'message' => 'Bu qiymətləndirmə növü ilə əlaqəli nəticələr mövcuddur. Silinə bilməz.'
            ], 422);
        }

        $assessmentType->delete();

        return response()->json([
            'success' => true,
            'message' => 'Qiymətləndirmə növü uğurla silindi'
        ]);
    }

    /**
     * Get all active assessment types for dropdown
     */
    public function dropdown(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $query = AssessmentType::active()
            ->select('id', 'name', 'category', 'institution_id');

        // Apply access control
        if ($user->hasRole('superadmin')) {
            // SuperAdmin can see all
        } elseif ($user->hasRole('regionadmin')) {
            $query->where(function ($q) use ($user) {
                $q->whereNull('institution_id')
                  ->orWhere('institution_id', $user->institution_id);
            });
        } else {
            $query->forInstitution($user->institution_id);
        }

        // Filter by category if requested
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $assessmentTypes = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $assessmentTypes,
            'message' => 'Aktiv qiymətləndirmə növləri'
        ]);
    }

    /**
     * Toggle assessment type status
     */
    public function toggleStatus(AssessmentType $assessmentType): JsonResponse
    {
        $user = Auth::user();

        if (!$assessmentType->canBeEditedBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur'
            ], 403);
        }

        $assessmentType->update([
            'is_active' => !$assessmentType->is_active
        ]);

        $status = $assessmentType->is_active ? 'aktiv' : 'deaktiv';

        return response()->json([
            'success' => true,
            'data' => $assessmentType,
            'message' => "Qiymətləndirmə növü {$status} edildi"
        ]);
    }

    /**
     * Check if user can access the assessment type
     */
    private function canUserAccessAssessmentType($user, AssessmentType $assessmentType): bool
    {
        if ($user->hasRole('superadmin')) {
            return true;
        }

        if ($user->hasRole('regionadmin')) {
            if ($assessmentType->institution_id === null) return true; // Global types
            return $assessmentType->institution_id === $user->institution_id;
        }

        // For other roles, check if it's accessible to their institution
        return $assessmentType->institution_id === null || 
               $assessmentType->institution_id === $user->institution_id;
    }
}