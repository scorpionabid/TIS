<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\BaseController;
use App\Models\Department;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SchoolTeacherController extends BaseController
{
    /**
     * Get all teachers for the school (REST index method)
     */
    public function index(Request $request): JsonResponse
    {
        return $this->getTeachers($request);
    }

    /**
     * Get all teachers for the school
     */
    public function getTeachers(Request $request): JsonResponse
    {
        $user = Auth::user();
        $school = $user->institution;

        // SuperAdmin can access all schools
        if (! $school && ! $user->hasRole('superadmin')) {
            return response()->json(['error' => 'User is not associated with a school'], 400);
        }

        // Get users with teacher roles in this school with their profiles
        $query = User::query();

        // If school is provided, filter by school, otherwise get all (for SuperAdmin)
        if ($school) {
            $query->where('institution_id', $school->id);
        }

        $teachers = $query
            ->whereHas('roles', function ($query) {
                $query->whereIn('name', ['müəllim', 'muavin', 'ubr', 'psixoloq', 'tesarrufat']);
            })
            ->where('is_active', true)
            ->with(['roles', 'department', 'institution'])
            ->get()
            ->map(function ($teacher) {
                // Get profile if exists
                $profile = UserProfile::where('user_id', $teacher->id)->first();

                return [
                    'id' => $teacher->id,
                    'employee_id' => $teacher->username, // Using username as employee_id
                    'first_name' => $profile->first_name ?? '',
                    'last_name' => $profile->last_name ?? '',
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'phone' => $profile->contact_phone ?? '',
                    'department' => $teacher->department->name ?? '',
                    'institution' => $teacher->institution->name ?? '',
                    'position' => $teacher->roles->first()->name ?? '',
                    'hire_date' => $profile->hire_date ?? null,
                    'birth_date' => $profile->birth_date ?? null,
                    'address' => $profile->address ?? '',
                    'emergency_contact' => $profile->emergency_contact ?? '',
                    'qualifications' => $profile->qualifications ?? [],
                    'subjects' => $profile->subjects ?? [],
                    'salary' => $profile->salary ?? null,
                    'is_active' => $teacher->is_active,
                    'last_login_at' => $teacher->last_login_at,
                    'created_at' => $teacher->created_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $teachers,
            'message' => count($teachers) . ' müəllim tapıldı',
        ]);
    }

    /**
     * Get specific teacher details
     */
    public function getTeacher(Request $request, int $teacherId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (! $school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $teacher = User::where('id', $teacherId)
                ->where('institution_id', $school->id)
                ->whereHas('roles', function ($query) {
                    $query->whereIn('name', ['müəllim', 'muavin', 'ubr', 'psixoloq', 'tesarrufat']);
                })
                ->with(['roles', 'department', 'devices'])
                ->firstOrFail();

            $profile = UserProfile::where('user_id', $teacher->id)->first();

            $teacherData = [
                'id' => $teacher->id,
                'employee_id' => $teacher->username,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'profile' => $profile ? [
                    'first_name' => $profile->first_name,
                    'last_name' => $profile->last_name,
                    'contact_phone' => $profile->contact_phone,
                    'birth_date' => $profile->birth_date,
                    'hire_date' => $profile->hire_date,
                    'address' => $profile->address,
                    'emergency_contact' => $profile->emergency_contact,
                    'qualifications' => $profile->qualifications ?? [],
                    'subjects' => $profile->subjects ?? [],
                    'salary' => $profile->salary,
                    'notes' => $profile->notes,
                ] : null,
                'department' => $teacher->department ? [
                    'id' => $teacher->department->id,
                    'name' => $teacher->department->name,
                    'description' => $teacher->department->description,
                ] : null,
                'roles' => $teacher->roles->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'display_name' => $role->display_name ?? $role->name,
                    ];
                }),
                'devices' => $teacher->devices->map(function ($device) {
                    return [
                        'id' => $device->id,
                        'device_name' => $device->device_name,
                        'device_type' => $device->device_type,
                        'last_login_at' => $device->last_login_at,
                        'is_active' => $device->is_active,
                    ];
                }),
                'is_active' => $teacher->is_active,
                'email_verified_at' => $teacher->email_verified_at,
                'last_login_at' => $teacher->last_login_at,
                'created_at' => $teacher->created_at,
                'updated_at' => $teacher->updated_at,
            ];

            return response()->json([
                'success' => true,
                'data' => $teacherData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Müəllim məlumatları əldə edilərkən səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new teacher
     */
    public function createTeacher(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Permission check temporarily disabled for debugging
            // TODO: Re-enable after fixing
            /*
            if (!$user || !$user->can('teachers.write')) {
                return response()->json(['error' => 'Unauthorized - Missing teachers.write permission'], 403);
            }
            */

            $school = $user->institution;

            if (! $school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'username' => 'required|string|unique:users,username|max:50',
                'password' => 'required|string|min:8',
                'role' => 'required|string|in:müəllim,muavin,ubr,psixoloq,tesarrufat',
                'department_id' => 'nullable|exists:departments,id',
                'profile' => 'nullable|array',

                // Basic info - REQUIRED fields
                'profile.first_name' => 'required|string|max:100',
                'profile.last_name' => 'required|string|max:100',
                'profile.patronymic' => 'required|string|max:100',

                'profile.contact_phone' => 'nullable|string|max:20',
                'profile.birth_date' => 'nullable|date',
                'profile.hire_date' => 'nullable|date',
                'profile.address' => 'nullable|string|max:500',
                'profile.emergency_contact' => 'nullable|string|max:255',
                'profile.qualifications' => 'nullable', // Can be array or JSON string
                'profile.subjects' => 'nullable', // Optional - will be managed in curriculum tab
                'profile.salary' => 'nullable|numeric|min:0',
                'profile.notes' => 'nullable|string',

                // Position & Employment - REQUIRED fields
                'profile.position_type' => 'required|string|in:direktor,direktor_muavini_tedris,direktor_muavini_inzibati,terbiye_isi_uzre_direktor_muavini,metodik_birlesme_rəhbəri,muəllim_sinif_rəhbəri,muəllim,psixoloq,kitabxanaçı,laborant,tibb_işçisi,təsərrüfat_işçisi',
                'profile.employment_status' => 'nullable|string|in:full_time,part_time,contract,temporary,substitute',
                'profile.workplace_type' => 'required|string|in:primary,secondary',
                'profile.contract_start_date' => 'nullable|date',
                'profile.contract_end_date' => 'nullable|date|after:profile.contract_start_date',
                'profile.specialty_score' => 'nullable|numeric|min:0|max:100',
                'profile.has_additional_workplaces' => 'nullable|boolean',

                // Professional development fields - REQUIRED specialty
                'profile.specialty' => 'required|string|max:255',
                'profile.specialty_level' => 'nullable|string|in:bakalavr,magistr,doktorantura,elmi_ishci',
                'profile.experience_years' => 'nullable|integer|min:0',

                // Assessment fields - REQUIRED
                'profile.assessment_type' => 'required|string|in:sertifikasiya,miq_100,miq_60,diaqnostik',
                'profile.assessment_score' => 'required_with:profile.assessment_type|nullable|numeric|min:0|max:100',

                // Old certification fields (optional)
                'profile.miq_score' => 'nullable|numeric|min:0|max:100',
                'profile.certification_score' => 'nullable|numeric|min:0|max:100',
                'profile.performance_rating' => 'nullable|numeric|min:0|max:5',
                'profile.last_evaluation_date' => 'nullable|date',
            ]);

            // Verify department belongs to the school if provided
            if ($request->department_id) {
                $department = Department::where('id', $request->department_id)
                    ->where('institution_id', $school->id)
                    ->first();

                if (! $department) {
                    return response()->json(['error' => 'Şöbə sizin məktəbə aid deyil'], 400);
                }
            }

            // Normalize array fields (subjects, qualifications) if they come as JSON strings
            $profileData = $request->profile ?? [];
            if (isset($profileData['subjects']) && is_string($profileData['subjects'])) {
                $profileData['subjects'] = json_decode($profileData['subjects'], true) ?? [];
            }
            if (isset($profileData['qualifications']) && is_string($profileData['qualifications'])) {
                $profileData['qualifications'] = json_decode($profileData['qualifications'], true) ?? [];
            }

            // Set primary_institution_id based on workplace_type
            $workplaceType = $profileData['workplace_type'] ?? 'primary';
            if ($workplaceType === 'primary') {
                $profileData['primary_institution_id'] = $school->id;
            }

            // Create user
            $teacher = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'username' => $request->username,
                'password' => Hash::make($request->password),
                'institution_id' => $school->id,
                'department_id' => $request->department_id,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            // Assign role - explicitly use sanctum guard
            \Log::info('CreateTeacher - Before role assignment', [
                'request_role' => $request->role,
                'teacher_id' => $teacher->id,
            ]);

            $role = Role::where('name', $request->role)
                ->where('guard_name', 'sanctum')
                ->first();

            \Log::info('CreateTeacher - Role query result', [
                'role_found' => $role ? 'YES' : 'NO',
                'role_id' => $role?->id,
                'role_name' => $role?->name,
                'role_guard' => $role?->guard_name,
            ]);

            if ($role) {
                try {
                    $teacher->assignRole($role);
                    \Log::info('CreateTeacher - Role assigned successfully', [
                        'teacher_id' => $teacher->id,
                        'role_name' => $role->name,
                    ]);
                } catch (\Exception $e) {
                    \Log::error('CreateTeacher - Role assignment failed', [
                        'teacher_id' => $teacher->id,
                        'role_name' => $role->name,
                        'error' => $e->getMessage(),
                    ]);
                }
            } else {
                \Log::warning('CreateTeacher - Role not found', [
                    'requested_role' => $request->role,
                ]);
            }

            // Create profile - always create for teachers (even if minimal data)
            \Log::info('CreateTeacher - Before profile creation', [
                'profileData_empty' => empty($profileData),
                'profileData_keys' => array_keys($profileData ?? []),
                'profileData_count' => count($profileData ?? []),
            ]);

            try {
                // Prepare minimum required profile data
                $finalProfileData = array_merge([
                    'user_id' => $teacher->id,
                    // These fields come from main request if not in profile
                    'first_name' => $profileData['first_name'] ?? null,
                    'last_name' => $profileData['last_name'] ?? null,
                    'contact_phone' => $profileData['contact_phone'] ?? null,
                ], $profileData);

                // Remove null values
                $finalProfileData = array_filter($finalProfileData, function ($value) {
                    return $value !== null && $value !== '';
                });

                \Log::info('CreateTeacher - Final profile data', [
                    'finalProfileData' => $finalProfileData,
                ]);

                $profile = UserProfile::create($finalProfileData);
                \Log::info('CreateTeacher - Profile created successfully', [
                    'teacher_id' => $teacher->id,
                    'profile_id' => $profile->id,
                ]);
            } catch (\Exception $e) {
                \Log::error('CreateTeacher - Profile creation failed', [
                    'teacher_id' => $teacher->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'profileData' => $profileData,
                ]);
                // Don't fail the whole operation if profile creation fails
            }

            // If workplace_type is secondary, create workplace record
            if ($workplaceType === 'secondary') {
                \App\Models\TeacherWorkplace::create([
                    'user_id' => $teacher->id,
                    'institution_id' => $school->id,
                    'workplace_priority' => 'secondary',
                    'is_active' => true,
                    'work_status' => 'active',
                ]);
            }

            $teacher->load(['roles', 'department']);

            return response()->json([
                'success' => true,
                'message' => 'Müəllim uğurla yaradıldı',
                'data' => [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'username' => $teacher->username,
                    'role' => $teacher->roles->first()?->name,
                    'department' => $teacher->department?->name,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Müəllim yaradılarkən səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an existing teacher
     */
    public function updateTeacher(Request $request, int $teacherId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (! $school) {
                return response()->json(['error' => 'User is not associated with a school'], 400);
            }

            $teacher = User::where('id', $teacherId)
                ->where('institution_id', $school->id)
                ->whereHas('roles', function ($query) {
                    $query->whereIn('name', ['müəllim', 'muavin', 'ubr', 'psixoloq', 'tesarrufat']);
                })
                ->firstOrFail();

            $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|email|unique:users,email,' . $teacherId,
                'username' => 'sometimes|required|string|unique:users,username,' . $teacherId . '|max:50',
                'password' => 'nullable|string|min:8',
                'role' => 'sometimes|string|in:müəllim,muavin,ubr,psixoloq,tesarrufat',
                'department_id' => 'nullable|exists:departments,id',
                'is_active' => 'sometimes|boolean',
                'profile' => 'nullable|array',
                'profile.first_name' => 'nullable|string|max:100',
                'profile.last_name' => 'nullable|string|max:100',
                'profile.contact_phone' => 'nullable|string|max:20',
                'profile.birth_date' => 'nullable|date',
                'profile.hire_date' => 'nullable|date',
                'profile.address' => 'nullable|string|max:500',
                'profile.emergency_contact' => 'nullable|string|max:255',
                'profile.qualifications' => 'nullable', // Can be array or JSON string
                'profile.subjects' => 'nullable', // Can be array or JSON string
                'profile.salary' => 'nullable|numeric|min:0',
                'profile.notes' => 'nullable|string',
                // New teacher fields
                'profile.position_type' => 'nullable|string|in:direktor,direktor_muavini_tedris,direktor_muavini_inzibati,terbiye_isi_uzre_direktor_muavini,metodik_birlesme_rəhbəri,muəllim_sinif_rəhbəri,muəllim,psixoloq,kitabxanaçı,laborant,tibb_işçisi,təsərrüfat_işçisi',
                'profile.employment_status' => 'nullable|string|in:full_time,part_time,contract,temporary,substitute',
                'profile.workplace_type' => 'nullable|string|in:primary,secondary',
                'profile.contract_start_date' => 'nullable|date',
                'profile.contract_end_date' => 'nullable|date|after:profile.contract_start_date',
                'profile.specialty_score' => 'nullable|numeric|min:0|max:100',
                'profile.specialty' => 'nullable|string|max:255',
                'profile.experience_years' => 'nullable|integer|min:0|max:50',
                'profile.miq_score' => 'nullable|numeric|min:0|max:999.99',
                'profile.certification_score' => 'nullable|numeric|min:0|max:999.99',
                'profile.last_certification_date' => 'nullable|date',
            ]);

            // Verify department belongs to the school if provided
            if ($request->department_id) {
                $department = Department::where('id', $request->department_id)
                    ->where('institution_id', $school->id)
                    ->first();

                if (! $department) {
                    return response()->json(['error' => 'Şöbə sizin məktəbə aid deyil'], 400);
                }
            }

            // Update user basic info
            $updateData = $request->only(['name', 'email', 'username', 'department_id', 'is_active']);
            if ($request->password) {
                $updateData['password'] = Hash::make($request->password);
            }
            $teacher->update($updateData);

            // Update role if provided
            if ($request->role) {
                $teacher->syncRoles([$request->role]);
            }

            // Update or create profile (normalize array fields)
            if ($request->has('profile') && is_array($request->profile)) {
                $profileData = $request->profile;

                // Normalize array fields
                if (isset($profileData['subjects']) && is_string($profileData['subjects'])) {
                    $profileData['subjects'] = json_decode($profileData['subjects'], true) ?? [];
                }
                if (isset($profileData['qualifications']) && is_string($profileData['qualifications'])) {
                    $profileData['qualifications'] = json_decode($profileData['qualifications'], true) ?? [];
                }

                // Set primary_institution_id based on workplace_type
                $workplaceType = $profileData['workplace_type'] ?? null;
                if ($workplaceType === 'primary') {
                    $profileData['primary_institution_id'] = $school->id;
                }

                UserProfile::updateOrCreate(
                    ['user_id' => $teacher->id],
                    $profileData
                );

                // Handle secondary workplace
                if ($workplaceType === 'secondary') {
                    \App\Models\TeacherWorkplace::updateOrCreate(
                        [
                            'user_id' => $teacher->id,
                            'institution_id' => $school->id,
                        ],
                        [
                            'workplace_priority' => 'secondary',
                            'is_active' => true,
                            'work_status' => 'active',
                        ]
                    );
                }
            }

            $teacher->load(['roles', 'department']);

            return response()->json([
                'success' => true,
                'message' => 'Müəllim məlumatları yeniləndi',
                'data' => [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'username' => $teacher->username,
                    'role' => $teacher->roles->first()?->name,
                    'department' => $teacher->department?->name,
                    'is_active' => $teacher->is_active,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Müəllim yenilənərkən səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show a specific teacher (REST show method)
     */
    public function show(Request $request, $teacher): JsonResponse
    {
        return $this->getTeacher($request, $teacher);
    }

    /**
     * Delete a teacher (REST destroy method)
     */
    public function destroy(Request $request, int $teacherId): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (! $school && ! $user->hasRole('superadmin')) {
                return response()->json(['error' => 'İcazə yoxdur'], 403);
            }

            // Find teacher
            $query = User::where('id', $teacherId)
                ->whereHas('roles', function ($query) {
                    $query->whereIn('name', ['müəllim', 'muavin', 'ubr', 'psixoloq', 'tesarrufat']);
                });

            // SchoolAdmin can only delete from their institution
            if (! $user->hasRole('superadmin')) {
                $query->where('institution_id', $school->id);
            }

            $teacher = $query->firstOrFail();

            // Soft delete the teacher
            $teacher->delete();

            return response()->json([
                'success' => true,
                'message' => 'Müəllim uğurla silindi',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Müəllim tapılmadı və ya sizə aid deyil',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Müəllim silinərkən səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available teachers for grade assignment
     */
    public function getAvailable(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $institutionId = $request->get('institution_id');
            $role = $request->get('role', 'müəllim');
            $excludeGradeId = $request->get('exclude_grade_id');

            // If user is not superadmin, use their institution
            if (! $user->hasRole('superadmin')) {
                $institutionId = $user->institution_id;
            }

            if (! $institutionId) {
                return response()->json(['error' => 'Institution ID is required'], 400);
            }

            // Base query for teachers
            $query = User::query()
                ->where('institution_id', $institutionId)
                ->where('is_active', true)
                ->whereHas('roles', function ($roleQuery) use ($role) {
                    $roleQuery->where('name', $role);
                })
                ->with(['roles', 'profile']);

            // If excluding specific grade, get teachers not assigned to that grade
            if ($excludeGradeId) {
                $query->whereDoesntHave('grades', function ($gradeQuery) use ($excludeGradeId) {
                    $gradeQuery->where('id', $excludeGradeId);
                });
            }

            $teachers = $query->get()->map(function ($teacher) {
                return [
                    'id' => $teacher->id,
                    'full_name' => $teacher->profile->full_name ?? $teacher->name,
                    'email' => $teacher->email,
                    'is_available' => true, // For now, assume all are available
                    'current_grade' => $teacher->grades()->first()?->name ?? null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $teachers->toArray(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Available teachers yüklənərkən səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export teachers to Excel/CSV
     */
    public function exportTeachers(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (! $school && ! $user->hasRole('superadmin')) {
                return response()->json(['error' => 'İcazə yoxdur'], 403);
            }

            // Get teachers based on role
            $query = User::with(['roles', 'profile', 'department'])
                ->whereHas('roles', function ($query) {
                    $query->whereIn('name', ['müəllim', 'muavin', 'ubr', 'psixoloq', 'tesarrufat']);
                });

            if (! $user->hasRole('superadmin')) {
                $query->where('institution_id', $school->id);
            }

            $teachers = $query->get();

            // Prepare export data
            $exportData = $teachers->map(function ($teacher) {
                $profile = $teacher->profile;

                return [
                    'ID' => $teacher->id,
                    'Ad' => $profile->first_name ?? '',
                    'Soyad' => $profile->last_name ?? '',
                    'Email' => $teacher->email,
                    'Rol' => $teacher->roles->first()?->display_name ?? '',
                    'Vəzifə' => $profile->position_type ?? '',
                    'İş Statusu' => $profile->employment_status ?? '',
                    'Telefon' => $profile->contact_phone ?? '',
                    'İxtisas' => $profile->specialty ?? '',
                    'Təcrübə (il)' => $profile->experience_years ?? 0,
                    'MİQ Balı' => $profile->miq_score ?? 0,
                    'Sertifikasiya Balı' => $profile->certification_score ?? 0,
                    'İşə Qəbul Tarixi' => $profile->hire_date ?? '',
                    'Müqavilə Başlama' => $profile->contract_start_date ?? '',
                    'Müqavilə Bitmə' => $profile->contract_end_date ?? '',
                    'Status' => $teacher->is_active ? 'Aktiv' : 'Passiv',
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $exportData,
                'count' => $exportData->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'İxrac zamanı səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get export template
     */
    public function getImportTemplate(): JsonResponse
    {
        $template = [
            [
                'Ad' => 'Məsələn: Əli',
                'Soyad' => 'Məsələn: Məmmədov',
                'Email' => 'ali.mammadov@edu.gov.az',
                'İstifadəçi Adı' => 'ali.mammadov',
                'Şifrə' => 'Passw0rd!',
                'Rol' => 'müəllim',
                'Telefon' => '+994501234567',
                'Vəzifə' => 'muəllim',
                'İş Statusu' => 'full_time',
                'İxtisas' => 'Riyaziyyat müəllimi',
                'Təcrübə (il)' => '5',
            ],
        ];

        return response()->json([
            'success' => true,
            'template' => $template,
            'headers' => array_keys($template[0]),
        ]);
    }

    /**
     * Import teachers from Excel/CSV
     */
    public function importTeachers(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $school = $user->institution;

            if (! $school && ! $user->hasRole('superadmin')) {
                return response()->json(['error' => 'İcazə yoxdur'], 403);
            }

            $request->validate([
                'teachers' => 'required|array',
                'teachers.*.first_name' => 'required|string|max:100',
                'teachers.*.last_name' => 'required|string|max:100',
                'teachers.*.email' => 'required|email|unique:users,email',
                'teachers.*.username' => 'required|string|unique:users,username',
                'teachers.*.password' => 'required|string|min:8',
                'teachers.*.role' => 'required|string|in:müəllim,muavin,ubr,psixoloq,tesarrufat',
            ]);

            $imported = 0;
            $errors = [];

            foreach ($request->teachers as $index => $teacherData) {
                try {
                    // Create user
                    $teacher = User::create([
                        'name' => $teacherData['first_name'] . ' ' . $teacherData['last_name'],
                        'email' => $teacherData['email'],
                        'username' => $teacherData['username'],
                        'password' => Hash::make($teacherData['password']),
                        'institution_id' => $school->id,
                        'is_active' => true,
                        'email_verified_at' => now(),
                    ]);

                    // Assign role
                    $role = Role::where('name', $teacherData['role'])->first();
                    if ($role) {
                        $teacher->assignRole($role);
                    }

                    // Create profile
                    $profileData = [
                        'user_id' => $teacher->id,
                        'first_name' => $teacherData['first_name'],
                        'last_name' => $teacherData['last_name'],
                    ];

                    // Add optional fields
                    if (isset($teacherData['contact_phone'])) {
                        $profileData['contact_phone'] = $teacherData['contact_phone'];
                    }
                    if (isset($teacherData['position_type'])) {
                        $profileData['position_type'] = $teacherData['position_type'];
                    }
                    if (isset($teacherData['employment_status'])) {
                        $profileData['employment_status'] = $teacherData['employment_status'];
                    }
                    if (isset($teacherData['specialty'])) {
                        $profileData['specialty'] = $teacherData['specialty'];
                    }
                    if (isset($teacherData['experience_years'])) {
                        $profileData['experience_years'] = $teacherData['experience_years'];
                    }

                    UserProfile::create($profileData);

                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = 'Sətir ' . ($index + 1) . ': ' . $e->getMessage();
                }
            }

            return response()->json([
                'success' => true,
                'message' => "$imported müəllim uğurla idxal edildi",
                'imported' => $imported,
                'errors' => $errors,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validasiya xətası',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'İdxal zamanı səhv baş verdi: ' . $e->getMessage(),
            ], 500);
        }
    }
}
