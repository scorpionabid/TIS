<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PasswordController extends Controller
{
    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
            'password_changed_at' => now()
        ]);

        // Revoke all tokens to force re-login
        $user->tokens()->delete();

        // Log password change
        ActivityLog::logActivity([
            'user_id' => $user->id,
            'activity_type' => 'password_change',
            'description' => 'Password changed successfully',
            'institution_id' => $user->institution_id
        ]);

        return response()->json([
            'message' => 'Password changed successfully. Please login again.'
        ]);
    }

    /**
     * Reset password (for admin use)
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::findOrFail($request->user_id);
        
        // Check if current user has permission to reset passwords
        if (!$request->user()->hasPermissionTo('reset_user_password')) {
            return response()->json([
                'message' => 'Unauthorized to reset passwords'
            ], 403);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
            'password_changed_at' => now(),
            'password_change_required' => true
        ]);

        // Revoke all tokens to force re-login
        $user->tokens()->delete();

        // Log password reset
        ActivityLog::logActivity([
            'user_id' => $request->user()->id,
            'activity_type' => 'password_reset',
            'description' => 'Password reset for user: ' . $user->username,
            'institution_id' => $user->institution_id
        ]);

        return response()->json([
            'message' => 'Password reset successfully. User must login again.'
        ]);
    }

    /**
     * Register new user
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'username' => 'required|string|min:3|max:50|unique:users',
            'email' => 'required|string|email|max:100|unique:users',
            'password' => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/|confirmed',
            'role_id' => 'required|exists:roles,id',
            'institution_id' => 'nullable|exists:institutions,id',
            'departments' => 'nullable|array',
            'departments.*' => 'string',
            
            // Profile data
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'patronymic' => 'nullable|string|max:100',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'national_id' => 'nullable|string|max:20',
            'contact_phone' => 'nullable|string|max:20',
        ]);

        try {
            DB::beginTransaction();

            $user = User::create([
                'username' => $request->username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role_id' => $request->role_id,
                'institution_id' => $request->institution_id,
                'departments' => $request->departments ?? [],
                'is_active' => true,
                'password_changed_at' => now(),
            ]);

            // Create profile if profile data provided
            if ($request->hasAny(['first_name', 'last_name', 'patronymic', 'birth_date', 'gender', 'national_id', 'contact_phone'])) {
                UserProfile::create([
                    'user_id' => $user->id,
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'patronymic' => $request->patronymic,
                    'birth_date' => $request->birth_date,
                    'gender' => $request->gender,
                    'national_id' => $request->national_id,
                    'contact_phone' => $request->contact_phone,
                ]);
            }

            $user->load(['role', 'institution', 'profile']);

            DB::commit();

            // Log user registration
            ActivityLog::logActivity([
                'user_id' => $user->id,
                'activity_type' => 'register',
                'description' => 'New user registered',
                'institution_id' => $user->institution_id
            ]);

            return response()->json([
                'message' => 'User registered successfully',
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role?->name,
                    'role_display_name' => $user->role?->display_name,
                    'institution' => [
                        'id' => $user->institution?->id,
                        'name' => $user->institution?->name,
                        'type' => $user->institution?->type
                    ],
                    'profile' => $user->profile ? [
                        'first_name' => $user->profile->first_name,
                        'last_name' => $user->profile->last_name,
                        'full_name' => $user->profile->full_name
                    ] : null
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Registration failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}