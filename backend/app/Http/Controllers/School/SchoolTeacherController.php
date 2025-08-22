<?php

namespace App\Http\Controllers\School;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class SchoolTeacherController extends Controller
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
        if (!$school && !$user->hasRole('superadmin')) {
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
            'message' => count($teachers) . ' müəllim tapıldı'
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

            if (!$school) {
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
                'data' => $teacherData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Müəllim məlumatları əldə edilərkən səhv baş verdi: ' . $e->getMessage()
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
            $school = $user->institution;

            if (!$school) {
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
                'profile.first_name' => 'nullable|string|max:100',
                'profile.last_name' => 'nullable|string|max:100',
                'profile.contact_phone' => 'nullable|string|max:20',
                'profile.birth_date' => 'nullable|date',
                'profile.hire_date' => 'nullable|date',
                'profile.address' => 'nullable|string|max:500',
                'profile.emergency_contact' => 'nullable|string|max:255',
                'profile.qualifications' => 'nullable|array',
                'profile.subjects' => 'nullable|array',
                'profile.salary' => 'nullable|numeric|min:0',
                'profile.notes' => 'nullable|string',
            ]);

            // Verify department belongs to the school if provided
            if ($request->department_id) {
                $department = Department::where('id', $request->department_id)
                    ->where('institution_id', $school->id)
                    ->first();
                
                if (!$department) {
                    return response()->json(['error' => 'Şöbə sizin məktəbə aid deyil'], 400);
                }
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

            // Assign role
            $role = Role::where('name', $request->role)->first();
            if ($role) {
                $teacher->assignRole($role);
            }

            // Create profile if profile data provided
            if ($request->has('profile') && is_array($request->profile)) {
                UserProfile::create(array_merge($request->profile, [
                    'user_id' => $teacher->id,
                ]));
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
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Müəllim yaradılarkən səhv baş verdi: ' . $e->getMessage()
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

            if (!$school) {
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
                'profile.qualifications' => 'nullable|array',
                'profile.subjects' => 'nullable|array',
                'profile.salary' => 'nullable|numeric|min:0',
                'profile.notes' => 'nullable|string',
            ]);

            // Verify department belongs to the school if provided
            if ($request->department_id) {
                $department = Department::where('id', $request->department_id)
                    ->where('institution_id', $school->id)
                    ->first();
                
                if (!$department) {
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

            // Update or create profile
            if ($request->has('profile') && is_array($request->profile)) {
                UserProfile::updateOrCreate(
                    ['user_id' => $teacher->id],
                    $request->profile
                );
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
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Müəllim yenilənərkən səhv baş verdi: ' . $e->getMessage()
            ], 500);
        }
    }
}