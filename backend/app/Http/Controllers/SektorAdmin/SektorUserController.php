<?php

namespace App\Http\Controllers\SektorAdmin;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\TeacherVerification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
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
                $query->whereHas('roles', function ($q) use ($request) {
                    $q->where('name', $request->role);
                });
            }

            if ($request->filled('institution_id')) {
                $query->where('institution_id', $request->institution_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('username', 'LIKE', "%{$search}%")
                        ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }

            $users = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            $transformedUsers = $users->getCollection()->map(function ($user) {
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
                        'type' => $user->institution?->type,
                    ],
                    'is_active' => $user->is_active,
                    'last_login_at' => $user->last_login_at,
                    'created_at' => $user->created_at->format('Y-m-d H:i'),
                ];
            });

            // Get statistics
            $statistics = [
                'total_users' => $users->total(),
                'by_role' => User::whereIn('institution_id', $institutionIds)
                    ->where('users.is_active', true)
                    ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                    ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                    ->selectRaw('roles.name as role_name, roles.display_name, COUNT(*) as count')
                    ->groupBy('roles.name', 'roles.display_name')
                    ->get(),
                'by_institution' => User::whereIn('institution_id', $institutionIds)
                    ->where('users.is_active', true)
                    ->join('institutions', 'users.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.id, institutions.name, COUNT(*) as count')
                    ->groupBy('institutions.id', 'institutions.name')
                    ->get(),
            ];

            return response()->json([
                'users' => $transformedUsers,
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'from' => $users->firstItem(),
                    'to' => $users->lastItem(),
                ],
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'region' => $sector->parent?->name ?? 'Bilinmir',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İstifadəçi məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all teachers in sector schools
     */
    public function getSectorTeachers(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            $query = User::whereIn('institution_id', $schoolIds)
                ->whereHas('roles', function ($q) {
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
                $query->whereHas('profile', function ($q) use ($request) {
                    $q->where('subjects', 'LIKE', '%' . $request->subject . '%');
                });
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }

            $teachers = $query->orderBy('name', 'asc')
                ->paginate($request->get('per_page', 20));

            $transformedTeachers = $teachers->getCollection()->map(function ($teacher) {
                return [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'school' => [
                        'id' => $teacher->institution?->id,
                        'name' => $teacher->institution?->name,
                        'type' => $teacher->institution?->type,
                    ],
                    'subjects' => $teacher->profile?->subjects ?? [],
                    'phone' => $teacher->profile?->phone ?? 'Qeyd edilməyib',
                    'experience_years' => $teacher->profile?->experience_years ?? 0,
                    'is_active' => $teacher->is_active,
                    'last_login_at' => $teacher->last_login_at,
                    'created_at' => $teacher->created_at->format('Y-m-d'),
                ];
            });

            // Get teacher statistics
            $statistics = [
                'total_teachers' => $teachers->total(),
                'by_school' => User::whereIn('institution_id', $schoolIds)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'müəllim');
                    })
                    ->where('users.is_active', true)
                    ->join('institutions', 'users.institution_id', '=', 'institutions.id')
                    ->selectRaw('institutions.id, institutions.name, COUNT(*) as count')
                    ->groupBy('institutions.id', 'institutions.name')
                    ->get(),
                'active_teachers' => $teachers->total(),
                'average_experience' => User::whereIn('institution_id', $schoolIds)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'müəllim');
                    })
                    ->join('user_profiles', 'users.id', '=', 'user_profiles.user_id')
                    ->avg('experience_years') ?? 0,
            ];

            return response()->json([
                'teachers' => $transformedTeachers,
                'pagination' => [
                    'current_page' => $teachers->currentPage(),
                    'last_page' => $teachers->lastPage(),
                    'per_page' => $teachers->perPage(),
                    'total' => $teachers->total(),
                    'from' => $teachers->firstItem(),
                    'to' => $teachers->lastItem(),
                ],
                'statistics' => $statistics,
                'sector' => [
                    'id' => $sector->id,
                    'name' => $sector->name,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Müəllim məlumatları yüklənə bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create new user for sector schools
     */
    public function createSchoolUser(Request $request): JsonResponse
    {
        \Log::info('🔍 [Backend User Creation Debug] createSchoolUser called');
        \Log::info('🔍 [Backend User Creation Debug] Request data:', $request->all());
        \Log::info('🔍 [Backend User Creation Debug] Current user:', $request->user());
        
        $currentUser = $request->user();

        if (! $currentUser->hasRole('sektoradmin')) {
            \Log::error('❌ [Backend User Creation Debug] User not sektoradmin');
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $currentUser->institution;
        if (! $sector) {
            \Log::error('❌ [Backend User Creation Debug] User not assigned to sector');
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }
        
        \Log::info('🔍 [Backend User Creation Debug] Sector found:', ['id' => $sector->id, 'name' => $sector->name]);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:schooladmin,müəllim,muavin',
            'institution_id' => 'required|exists:institutions,id',
            'phone' => 'nullable|string|max:20',
            'subjects' => 'nullable|array',
            'subjects.*' => 'string|max:100',
        ]);

        if ($validator->fails()) {
            \Log::error('❌ [Backend User Creation Debug] Validation failed:', $validator->errors()->toArray());
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }
        
        \Log::info('✅ [Backend User Creation Debug] Validation passed');

        // Verify institution belongs to sector
        $institution = Institution::where('id', $request->institution_id)
            ->where('parent_id', $sector->id)
            ->first();

        if (! $institution) {
            \Log::error('❌ [Backend User Creation Debug] Institution not in sector', [
                'requested_institution_id' => $request->institution_id,
                'sector_id' => $sector->id
            ]);
            return response()->json([
                'message' => 'Seçilən müəssisə sizin sektora aid deyil',
            ], 400);
        }
        
        \Log::info('✅ [Backend User Creation Debug] Institution verified:', ['id' => $institution->id, 'name' => $institution->name]);

        try {
            \Log::info('🚀 [Backend User Creation Debug] Starting user creation');
            
            $user = User::create([
                'name' => $request->name,
                'username' => $request->username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'institution_id' => $request->institution_id,
                'is_active' => true,
                'created_by' => $currentUser->id,
            ]);
            
            \Log::info('✅ [Backend User Creation Debug] User created in database:', ['id' => $user->id, 'name' => $user->name]);

            // Assign role
            $role = Role::where('name', $request->role)->first();
            if ($role) {
                $user->assignRole($role);
                \Log::info('✅ [Backend User Creation Debug] Role assigned:', ['role' => $role->name]);
            } else {
                \Log::warning('⚠️ [Backend User Creation Debug] Role not found:', ['requested_role' => $request->role]);
            }

            // Create profile if additional data provided
            if ($request->filled('phone') || $request->filled('subjects')) {
                $user->profile()->create([
                    'phone' => $request->phone,
                    'subjects' => $request->subjects ?? [],
                ]);
                \Log::info('✅ [Backend User Creation Debug] Profile created');
            }

            $responseData = [
                'message' => 'İstifadəçi uğurla yaradıldı',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $request->role,
                    'institution' => $institution->name,
                ],
            ];
            
            \Log::info('✅ [Backend User Creation Debug] Success response prepared:', $responseData);
            
            return response()->json($responseData, 201);
        } catch (\Exception $e) {
            \Log::error('❌ [Backend User Creation Debug] Exception occurred:', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'İstifadəçi yaradıla bilmədi',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available schools for user assignment
     */
    public function getAvailableSchools(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
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
                'name' => $sector->name,
            ],
        ]);
    }

    /**
     * Get teachers with advanced filtering
     */
    public function getTeacherVerifications(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            // Start query
            $query = User::whereIn('institution_id', $schoolIds)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'müəllim');
                })
                ->with(['institution', 'teacherVerifications' => function ($q) {
                    $q->latest('verification_date');
                }]);

            // Apply filters
            $status = $request->input('status');
            if ($status && $status !== 'all') {
                if ($status === 'pending') {
                    $query->whereDoesntHave('teacherVerifications', function ($q) {
                        $q->where('verification_status', 'approved');
                    });
                } else {
                    $query->whereHas('teacherVerifications', function ($q) use ($status) {
                        $q->where('verification_status', $status);
                    });
                }
            }

            // Institution filter
            $institutionId = $request->input('institution_id');
            if ($institutionId && $institutionId !== 'all') {
                $query->where('institution_id', $institutionId);
            }

            // Date range filter
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            if ($dateFrom || $dateTo) {
                $query->whereHas('teacherVerifications', function ($q) use ($dateFrom, $dateTo) {
                    if ($dateFrom) {
                        $q->whereDate('verification_date', '>=', $dateFrom);
                    }
                    if ($dateTo) {
                        $q->whereDate('verification_date', '<=', $dateTo);
                    }
                });
            }

            // Search filter
            $search = $request->input('search');
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('username', 'like', "%{$search}%");
                });
            }

            // Pagination
            $perPage = $request->input('per_page', 20);
            $page = $request->input('page', 1);
            $teachers = $query->paginate($perPage, ['*'], 'page', $page);

            // Transform data
            $transformedTeachers = $teachers->getCollection()->map(function ($teacher) {
                $verification = $teacher->teacherVerifications->first();
                return [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'username' => $teacher->username,
                    'institution' => [
                        'id' => $teacher->institution->id,
                        'name' => $teacher->institution->name,
                    ],
                    'verification_status' => $verification ? $verification->verification_status : 'pending',
                    'verification_date' => $verification ? $verification->verification_date : null,
                    'verified_by' => $verification ? $verification->verifiedBy?->name : null,
                    'rejection_reason' => $verification ? $verification->rejection_reason : null,
                    'created_at' => $teacher->created_at,
                ];
            });

            // Get statistics
            $stats = $this->getVerificationStatistics($schoolIds);

            return response()->json([
                'success' => true,
                'data' => $transformedTeachers,
                'pagination' => [
                    'current_page' => $teachers->currentPage(),
                    'last_page' => $teachers->lastPage(),
                    'per_page' => $teachers->perPage(),
                    'total' => $teachers->total(),
                ],
                'statistics' => $stats,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Məlumatlar alınarkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get verification statistics
     */
    private function getVerificationStatistics(array $schoolIds): array
    {
        $totalTeachers = User::whereIn('institution_id', $schoolIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->count();

        // Get teacher IDs first to avoid nested whereHas issues
        $teacherIds = User::whereIn('institution_id', $schoolIds)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'müəllim');
            })
            ->pluck('id')
            ->toArray();

        $approvedCount = TeacherVerification::whereIn('teacher_id', $teacherIds)
            ->where('verification_status', 'approved')
            ->count();

        $rejectedCount = TeacherVerification::whereIn('teacher_id', $teacherIds)
            ->where('verification_status', 'rejected')
            ->count();

        $pendingCount = $totalTeachers - $approvedCount - $rejectedCount;

        return [
            'total_pending' => $pendingCount,
            'total_approved' => $approvedCount,
            'total_rejected' => $rejectedCount,
            'total_teachers' => $totalTeachers,
        ];
    }

    /**
     * Get teachers pending verification
     */
    public function getPendingVerifications(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            // Get sector schools
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            // Get teachers with pending verification
            $pendingTeachers = User::whereIn('institution_id', $schoolIds)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'müəllim');
                })
                ->whereDoesntHave('teacherVerifications', function ($q) {
                    $q->where('verification_status', 'approved');
                })
                ->with(['institution', 'teacherVerifications' => function ($q) {
                    $q->latest()->limit(1);
                }])
                ->where('is_active', true)
                ->get();

            $transformedTeachers = $pendingTeachers->map(function ($teacher) {
                $verification = $teacher->teacherVerifications->first();
                return [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'username' => $teacher->username,
                    'institution' => [
                        'id' => $teacher->institution->id,
                        'name' => $teacher->institution->name,
                    ],
                    'verification_status' => $verification ? $verification->verification_status : 'pending',
                    'verification_date' => $verification?->verification_date,
                    'verified_by' => $verification?->verifiedBy?->name,
                    'rejection_reason' => $verification?->rejection_reason,
                    'created_at' => $teacher->created_at->format('Y-m-d H:i'),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $transformedTeachers,
                'statistics' => [
                    'total_pending' => $transformedTeachers->where('verification_status', 'pending')->count(),
                    'total_approved' => $transformedTeachers->where('verification_status', 'approved')->count(),
                    'total_rejected' => $transformedTeachers->where('verification_status', 'rejected')->count(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Məlumatlar yüklənərkən xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk approve teachers
     */
    public function bulkApproveTeachers(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        $validated = $request->validate([
            'teacher_ids' => 'required|array',
            'teacher_ids.*' => 'integer|exists:users,id',
            'verified_data' => 'nullable|array',
        ]);

        try {
            $approvedCount = 0;
            $errors = [];

            foreach ($validated['teacher_ids'] as $teacherId) {
                // Verify teacher belongs to sector
                $teacher = User::where('id', $teacherId)
                    ->whereHas('institution', function ($q) use ($sector) {
                        $q->where('parent_id', $sector->id);
                    })
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'müəllim');
                    })
                    ->first();

                if (! $teacher) {
                    $errors[] = "Müəllim ID {$teacherId} sektorunuza aid deyil";
                    continue;
                }

                // Check if already verified
                $existingVerification = TeacherVerification::where('teacher_id', $teacherId)
                    ->where('verification_status', 'approved')
                    ->first();

                if ($existingVerification) {
                    $errors[] = "Müəllim {$teacher->name} artıq təsdiqlənib";
                    continue;
                }

                // Create or update verification
                TeacherVerification::updateOrCreate(
                    ['teacher_id' => $teacherId],
                    [
                        'verified_by' => $user->id,
                        'verification_status' => 'approved',
                        'verification_date' => now(),
                        'verified_data' => $validated['verified_data'] ?? null,
                        'original_data' => $teacher->toArray(),
                    ]
                );

                $approvedCount++;
            }

            return response()->json([
                'success' => true,
                'message' => "{$approvedCount} müəllim uğurla təsdiqləndi",
                'approved_count' => $approvedCount,
                'errors' => $errors,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kütləvi təsdiqləmə zamanı xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk reject teachers
     */
    public function bulkRejectTeachers(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        $validated = $request->validate([
            'teacher_ids' => 'required|array',
            'teacher_ids.*' => 'integer|exists:users,id',
            'rejection_reason' => 'required|string|max:500',
        ]);

        try {
            $rejectedCount = 0;
            $errors = [];

            foreach ($validated['teacher_ids'] as $teacherId) {
                // Verify teacher belongs to sector
                $teacher = User::where('id', $teacherId)
                    ->whereHas('institution', function ($q) use ($sector) {
                        $q->where('parent_id', $sector->id);
                    })
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'müəllim');
                    })
                    ->first();

                if (! $teacher) {
                    $errors[] = "Müəllim ID {$teacherId} sektorunuza aid deyil";
                    continue;
                }

                // Check if already verified
                $existingVerification = TeacherVerification::where('teacher_id', $teacherId)
                    ->where('verification_status', 'approved')
                    ->first();

                if ($existingVerification) {
                    $errors[] = "Müəllim {$teacher->name} artıq təsdiqlənib, rədd edilə bilməz";
                    continue;
                }

                // Create or update verification
                TeacherVerification::updateOrCreate(
                    ['teacher_id' => $teacherId],
                    [
                        'verified_by' => $user->id,
                        'verification_status' => 'rejected',
                        'verification_date' => now(),
                        'rejection_reason' => $validated['rejection_reason'],
                        'original_data' => $teacher->toArray(),
                    ]
                );

                $rejectedCount++;
            }

            return response()->json([
                'success' => true,
                'message' => "{$rejectedCount} müəllim uğurla rədd edildi",
                'rejected_count' => $rejectedCount,
                'errors' => $errors,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kütləvi rədd etmə zamanı xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get analytics data
     */
    public function getVerificationAnalytics(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sector = $user->institution;
        if (! $sector) {
            return response()->json(['message' => 'İstifadəçi sektora təyin edilməyib'], 400);
        }

        try {
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            // Get teacher IDs first to avoid nested whereHas issues
            $teacherIds = User::whereIn('institution_id', $schoolIds)
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'müəllim');
                })
                ->pluck('id')
                ->toArray();

            // Monthly trends (last 6 months)
            $monthlyTrends = TeacherVerification::whereIn('teacher_id', $teacherIds)
                ->where('verification_date', '>=', now()->subMonths(6))
                ->selectRaw('
                    EXTRACT(YEAR FROM verification_date) as year,
                    EXTRACT(MONTH FROM verification_date) as month,
                    verification_status,
                    COUNT(*) as count
                ')
                ->groupBy('year', 'month', 'verification_status')
                ->orderBy('year')
                ->orderBy('month')
                ->get();

            // Institution breakdown
            $institutionBreakdown = Institution::whereIn('id', $schoolIds)
                ->withCount(['users' => function ($q) {
                    $q->whereHas('roles', function ($role) {
                        $role->where('name', 'müəllim');
                    });
                }])
                ->withCount(['teacherVerifications' => function ($q) {
                    $q->where('verification_status', 'approved');
                }, 'teacherVerifications as rejected_count' => function ($q) {
                    $q->where('verification_status', 'rejected');
                }])
                ->get()
                ->map(function ($institution) {
                    $totalTeachers = $institution->users_count;
                    $approvedCount = $institution->teacher_verifications_count;
                    $rejectedCount = $institution->rejected_count;
                    $pendingCount = $totalTeachers - $approvedCount - $rejectedCount;

                    return [
                        'institution_id' => $institution->id,
                        'institution_name' => $institution->name,
                        'total_teachers' => $totalTeachers,
                        'approved_count' => $approvedCount,
                        'rejected_count' => $rejectedCount,
                        'pending_count' => $pendingCount,
                        'approval_rate' => $totalTeachers > 0 ? round(($approvedCount / $totalTeachers) * 100, 2) : 0,
                    ];
                });

            // Verification time metrics
            $avgVerificationTime = TeacherVerification::whereIn('teacher_id', $teacherIds)
                ->whereNotNull('verification_date')
                ->whereNotNull('created_at')
                ->selectRaw('AVG(EXTRACT(EPOCH FROM (verification_date - created_at))/86400) as avg_days')
                ->value('avg_days');

            return response()->json([
                'success' => true,
                'data' => [
                    'monthly_trends' => $monthlyTrends,
                    'institution_breakdown' => $institutionBreakdown,
                    'average_verification_days' => round($avgVerificationTime ?? 0, 1),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Analitik məlumatlar alınarkən xəta baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve teacher verification
     */
    public function approveTeacher(Request $request, $teacherId): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'verified_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        try {
            $teacher = User::findOrFail($teacherId);
            
            // Check if teacher is in sector
            $sector = $user->institution;
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            if (! in_array($teacher->institution_id, $schoolIds)) {
                return response()->json(['message' => 'Bu müəllim sizin sektorunuzda deyil'], 403);
            }

            // Create or update verification
            $verification = TeacherVerification::updateOrCreate(
                ['teacher_id' => $teacherId],
                [
                    'verification_status' => 'approved',
                    'verified_by' => $user->id,
                    'verification_date' => now(),
                    'verified_data' => $request->verified_data,
                    'rejection_reason' => null,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Müəllim məlumatları uğurla təsdiqləndi',
                'data' => $verification
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Təsdiqləmə zamanı xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject teacher verification
     */
    public function rejectTeacher(Request $request, $teacherId): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('sektoradmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        try {
            $teacher = User::findOrFail($teacherId);
            
            // Check if teacher is in sector
            $sector = $user->institution;
            $schoolIds = Institution::where('parent_id', $sector->id)
                ->where('level', 4)
                ->pluck('id')
                ->toArray();

            if (! in_array($teacher->institution_id, $schoolIds)) {
                return response()->json(['message' => 'Bu müəllim sizin sektorunuzda deyil'], 403);
            }

            // Create or update verification
            $verification = TeacherVerification::updateOrCreate(
                ['teacher_id' => $teacherId],
                [
                    'verification_status' => 'rejected',
                    'verified_by' => $user->id,
                    'verification_date' => now(),
                    'rejection_reason' => $request->rejection_reason,
                    'verified_data' => null,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Müəllim məlumatları rədd edildi',
                'data' => $verification
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Rədd etmə zamanı xəta baş verdi',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
