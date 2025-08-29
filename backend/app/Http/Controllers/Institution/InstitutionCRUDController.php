<?php

namespace App\Http\Controllers\Institution;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class InstitutionCRUDController extends Controller
{
    /**
     * Display a listing of the institutions.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Institution::query();

        // Apply role-based access control
        $this->applyAccessControl($query, $user);

        // Apply filters if provided
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('institution_code', 'like', "%{$search}%")
                  ->orWhere('short_name', 'like', "%{$search}%");
            });
        }

        // Paginate results
        $perPage = $request->input('per_page', 15);
        $institutions = $query->paginate($perPage);

        return response()->json($institutions);
    }

    /**
     * Store a newly created institution in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'type' => 'required|string|max:50',
            'institution_code' => 'required|string|max:50|unique:institutions',
            'parent_id' => 'nullable|exists:institutions,id',
            'level' => 'required|integer|min:1',
            'region_code' => 'required|string|max:50',
            'contact_info' => 'nullable|array',
            'location' => 'nullable|array',
            'metadata' => 'nullable|array',
            'is_active' => 'boolean',
            'established_date' => 'nullable|date',
        ]);

        $institution = Institution::create($validated);

        return response()->json($institution, 201);
    }

    /**
     * Display the specified institution.
     */
    public function show(Institution $institution): JsonResponse
    {
        return response()->json($institution);
    }

    /**
     * Update the specified institution in storage.
     */
    public function update(Request $request, Institution $institution): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'type' => 'sometimes|required|string|max:50',
            'institution_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('institutions')->ignore($institution->id)
            ],
            'parent_id' => 'nullable|exists:institutions,id',
            'level' => 'sometimes|required|integer|min:1',
            'region_code' => 'sometimes|required|string|max:50',
            'contact_info' => 'nullable|array',
            'location' => 'nullable|array',
            'metadata' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'established_date' => 'nullable|date',
        ]);

        $institution->update($validated);

        return response()->json($institution);
    }

    /**
     * Remove the specified institution from storage.
     */
    public function destroy(Request $request, Institution $institution): JsonResponse
    {
        // Check if institution has children
        if ($institution->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete institution with child institutions. Please delete or move the children first.'
            ], 422);
        }

        // Check if institution has users
        if ($institution->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete institution with associated users. Please reassign or delete the users first.'
            ], 422);
        }

        $institution->delete();

        return response()->json(null, 204);
    }

    /**
     * Apply role-based access control to institution queries
     */
    private function applyAccessControl($query, $user): void
    {
        if ($user->hasRole('regionadmin')) {
            // RegionAdmin can see their own region and child institutions
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 2) {
                $query->where(function ($q) use ($userInstitution) {
                    // Their own regional institution
                    $q->where('id', $userInstitution->id)
                      // Or their child institutions (sectors and schools)
                      ->orWhere('parent_id', $userInstitution->id)
                      // Or grandchild institutions (schools under sectors)
                      ->orWhereIn('parent_id', function ($subQuery) use ($userInstitution) {
                          $subQuery->select('id')
                                   ->from('institutions')
                                   ->where('parent_id', $userInstitution->id);
                      });
                });
            }
        } elseif ($user->hasRole('sektoradmin')) {
            // SectorAdmin can see their own sector and child schools
            $userInstitution = $user->institution;
            if ($userInstitution && $userInstitution->level === 3) {
                $query->where(function ($q) use ($userInstitution) {
                    $q->where('id', $userInstitution->id)
                      ->orWhere('parent_id', $userInstitution->id);
                });
            }
        } elseif ($user->hasRole('schooladmin')) {
            // SchoolAdmin can only see their own school
            $userInstitution = $user->institution;
            if ($userInstitution) {
                $query->where('id', $userInstitution->id);
            }
        }
        // SuperAdmin sees all institutions (no additional filtering)
    }
}
