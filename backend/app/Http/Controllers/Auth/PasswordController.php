<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\SecurityEvent;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
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
     * Request password reset
     */
    public function requestReset(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        // Rate limiting (5 requests per hour per email)
        $key = 'password_reset:' . $request->email;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $availableIn = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Çox sayda cəhd. {$availableIn} saniyə sonra cəhd edin.",
                'retry_after' => $availableIn
            ], 429);
        }

        $user = User::where('email', $request->email)->first();

        // Check if user is active
        if (!$user->is_active) {
            RateLimiter::hit($key);
            return response()->json([
                'message' => 'Hesabınız deaktiv edilib. İnzibatçı ilə əlaqə saxlayın.'
            ], 403);
        }

        // Generate secure token
        $token = Str::random(60);
        $hashedToken = Hash::make($token);

        // Store in database (Laravel default table)
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => $hashedToken,
                'created_at' => now()
            ]
        );

        // Send notification using existing system
        $this->sendPasswordResetEmail($user, $token);

        // Log security event
        SecurityEvent::logEvent([
            'event_type' => 'password_reset_request',
            'severity' => 'info',
            'user_id' => $user->id,
            'description' => 'Password reset requested',
            'institution_id' => $user->institution_id,
            'event_data' => ['email' => $user->email]
        ]);

        // Update rate limiting
        RateLimiter::hit($key);

        return response()->json([
            'message' => 'Şifrə sıfırlama linki email ünvanınıza göndərildi.'
        ]);
    }

    /**
     * Reset password with token
     */
    public function resetWithToken(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/|confirmed',
        ]);

        // Check if token exists and is valid (1 hour expiry)
        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('created_at', '>', now()->subHour())
            ->first();

        if (!$resetRecord || !Hash::check($request->token, $resetRecord->token)) {
            return response()->json([
                'message' => 'Keçərsiz və ya vaxtı keçmiş token.'
            ], 400);
        }

        $user = User::where('email', $request->email)->first();

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
            'password_change_required' => false,
        ]);

        // Revoke all tokens to force re-login
        $user->tokens()->delete();

        // Delete reset token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Log successful reset
        ActivityLog::logActivity([
            'user_id' => $user->id,
            'activity_type' => 'password_reset_complete',
            'description' => 'Password reset completed successfully',
            'institution_id' => $user->institution_id
        ]);

        // Send confirmation email
        $this->sendPasswordChangeConfirmation($user);

        return response()->json([
            'message' => 'Şifrə uğurla yeniləndi. Yenidən daxil olun.'
        ]);
    }

    /**
     * Send password reset email
     */
    private function sendPasswordResetEmail(User $user, string $token): void
    {
        $resetUrl = config('app.frontend_url', 'http://localhost:3000') . "/password-reset?token={$token}&email=" . urlencode($user->email);

        // Create notification data for custom template
        $notificationData = [
            'user_name' => $user->profile?->first_name ?? $user->username ?? 'İstifadəçi',
            'title' => 'Şifrə Sıfırlama Tələbi',
            'message' => "Şifrənizi sıfırlamaq üçün aşağıdakı linkə keçin: {$resetUrl}",
            'metadata' => [
                'reset_url' => $resetUrl,
                'expires_at' => now()->addHour()->toISOString(),
                'user_email' => $user->email,
                'institution_name' => $user->institution?->name ?? 'Müəssisə məlumatı yoxdur'
            ]
        ];

        // Send using NotificationEmail with custom template
        \Mail::to($user->email, $user->username)
            ->send(
                (new \App\Mail\NotificationEmail($notificationData, 'ATİS - Şifrə Sıfırlama Tələbi'))
                    ->setView('emails.password-reset')
            );
    }

    /**
     * Send password change confirmation email
     */
    private function sendPasswordChangeConfirmation(User $user): void
    {
        app(NotificationService::class)->send([
            'user_id' => $user->id,
            'title' => 'Şifrə Uğurla Dəyişdirildi',
            'message' => 'Sizin ATİS hesabınızın şifrəsi uğurla dəyişdirildi. Əgər bu əməliyyatı siz həyata keçirmədinizsə, təcili olaraq sistem inzibatçısı ilə əlaqə saxlayın.',
            'type' => 'password_change_confirmation',
            'channel' => 'email',
            'priority' => 'high'
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