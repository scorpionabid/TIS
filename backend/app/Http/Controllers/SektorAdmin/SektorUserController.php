<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class SektorUserController extends Controller
{
    /**
     * Get all users in sector (sector + schools)
     */
    public function getSectorUsers(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (!$sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            // Include sector itself
            $institutionIds = array_merge([$sector->id], $schoolIds);

            $query = User::whereIn('institution_id', $institutionIds)
                ->with(['roles', 'institution', 'profile'])
                ->where('is_active', true);

            // Apply filters
            if ($request->filled('role')) {
                $query->whereHas('roles', function($q) use ($request) {
                    $q->where('name', $request->role);
                });
            }

            if ($request->filled('institution_id')) {
                $query->where('institution_id', $request->institution_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('username', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }

            $users = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            $transformedUsers = $users->getCollection()->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->roles->first()?->name ?? 'No role',
                    'role_display' => $user->roles->first()?->display_name ?? 'Rol təyin edilməyib',
                    'institution' => [
                        'id' => $user->institution?->id,
                        'name' => $user->institution?->name,
                        'type' => $user->institution?->type
                    ],
                    'is_active' => $user->is_active,
                    'last_login_at' => $user->last_login_at,
                    'created_at' => $user->created_at->format('Y-m-d H:i')
                ];
            });

            // Get statistics
            $statistics = [
                'total_users' => $users->total(),
                'by_role' => User::whereIn('institution_id', $institutionIds)
                    ->where('is_active', true)
                    ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                    ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                    ->selectRaw('roles.name as role_name, roles.display_name, COUNT(*) as count')
                    ->groupBy('roles.name', 'roles.display_name')
                    ->get(),
                'by_institution' => User::whereIn('institution_id', $institutionIds)
                    ->where('is_active', true)
                    ->join('institutions', 'users.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.id, institutions.name, COUNT(*) as count')
                    ->groupBy('institutions.id', 'institutions.name')
                    ->get()
            ];

            return response()->json([
                'users' => $transformedUsers,
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem()
                ],
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'region' => $sector->parent?->name ?? 'Bilinmir'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İstifadəçi məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all teachers in sector schools
     */
    public function getSectorTeachers(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (!$sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $query = User::whereIn('institution_id', $schoolIds)
                ->whereHas('roles', function($q) {
                    $q->where('name', 'müəllim');
                })
                ->with(['roles', 'institution', 'profile'])
                ->where('is_active', true);

            // Apply filters
            if ($request->filled('school_id')) {
                $query->where('institution_id', $request->school_id);
            }

            if ($request->filled('subject')) {
                // Add subject filter when available
                $query->whereHas('profile', function($q) use ($request) {
                    $q->where('subjects', 'LIKE', '%' . $request->subject . '%');
                });
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }

            $teachers = $query->orderBy('name', 'asc')
                ->paginate($request->get('per_page', 20));

            $transformedTeachers = $teachers->getCollection()->map(function($teacher) {
                return [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'school' => [
                        'id' => $teacher->institution?->id,
                        'name' => $teacher->institution?->name,
                        'type' => $teacher->institution?->type
                    ],
                    'subjects' => $teacher->profile?->subjects ?? [],
                    'phone' => $teacher->profile?->phone ?? 'Qeyd edilməyib',
                    'experience_years' => $teacher->profile?->experience_years ?? 0,
                    'is_active' => $teacher->is_active,
                    'last_login_at' => $teacher->last_login_at,
                    'created_at' => $teacher->created_at->format('Y-m-d')
                ];
            });

            // Get teacher statistics
            $statistics = [
                'total_teachers' => $teachers->total(),
                'by_school' => User::whereIn('institution_id', $schoolIds)
                    ->whereHas('roles', function($q) {
                        $q->where('name', 'müəllim');
                    })
                    ->where('is_active', true)
                    ->join('institutions', 'users.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.id, institutions.name, COUNT(*) as count')
                    ->groupBy('institutions.id', 'institutions.name')
                    ->get(),
                'active_teachers' => $teachers->total(),
                'average_experience' => User::whereIn('institution_id', $schoolIds)
                    ->whereHas('roles', function($q) {
                        $q->where('name', 'müəllim');
                    })
                    ->join('user_profiles', 'users.id', '=', 'user_profiles.user_id')
                    ->avg('experience_years') ?? 0
            ];

            return response()->json([
                'teachers' => $transformedTeachers,
                'pagination' => [
                    'current_page' => $teachers->currentPage(),
                    'last_page' => $teachers->lastPage(),
                    'per_page' => $teachers->perPage(),
                    'total' => $teachers->total(),
                    'from' => $teachers->firstItem(),
                    'to' => $teachers->lastItem()
                ],
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Müəllim məlumatları yüklənə bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new user for sector schools
     */
    public function createSchoolUser(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        
        if (!$currentUser->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $currentUser->institution;
        if (!$sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:schooladmin,müəllim,muavin',
            'institution_id' => 'required|exists:institutions,id',
            'phone' => 'nullable|string|max:20',
            'subjects' => 'nullable|array',
            'subjects.*' => 'string|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Verify institution belongs to sector
        $institution = Institution::where('id', $request->institution_id)
            ->where('parent_id', $sector->id)
            ->first();

        if (!$institution) {
            return response()->json([
                'message' => 'Seçilən müəssisə sizin sektora aid deyil'
            ], 400);
        }

        try {
            $user = User::create([
                'name' => $request->name,
                'username' => $request->username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'institution_id' => $request->institution_id,
                'is_active' => true,
                'created_by' => $currentUser->id
            ]);

            // Assign role
            $role = Role::where('name', $request->role)->first();
            if ($role) {
                $user->assignRole($role);
            }

            // Create profile if additional data provided
            if ($request->filled('phone') || $request->filled('subjects')) {
                $user->profile()->create([
                    'phone' => $request->phone,
                    'subjects' => $request->subjects ?? []
                ]);
            }

            return response()->json([
                'message' => 'İstifadəçi uğurla yaradıldı',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $request->role,
                    'institution' => $institution->name
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İstifadəçi yaradıla bilmədi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available schools for user assignment
     */
    public function getAvailableSchools(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (!$sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        $schools = Institution::where('parent_id', $sector->id)
            ->where('level', 4)
            ->where('is_active', true)
            ->select('id', 'name', 'type', 'short_name')
            ->orderBy('name')
            ->get();

        return response()->json([
            'schools' => $schools,
            'sector' => [
                'id' => $sector->id,
                'name' => $sector->name
            ]
        ]);
    }
}