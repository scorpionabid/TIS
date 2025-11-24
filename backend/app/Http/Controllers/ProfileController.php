<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends BaseController
{
    /**
     * Get current user profile
     */
    public function show(): JsonResponse
    {
        $user = Auth::user()->load(['role', 'institution', 'profile', 'department']);

        return $this->successResponse([
            'user' => $user,
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'avatar_url' => $user->profile?->avatar_path ? Storage::url($user->profile->avatar_path) : null,
        ], 'Profil məlumatları alındı');
    }

    /**
     * Update current user profile
     */
    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'username' => ['sometimes', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'profile' => 'sometimes|array',
            'profile.first_name' => 'sometimes|string|max:255',
            'profile.last_name' => 'sometimes|string|max:255',
            'profile.patronymic' => 'sometimes|nullable|string|max:255',
            'profile.phone' => 'sometimes|nullable|string|max:20',
            'profile.contact_phone' => 'sometimes|nullable|string|max:20',
            'profile.birth_date' => 'sometimes|nullable|date',
            'profile.gender' => 'sometimes|nullable|string|in:male,female',
            'profile.national_id' => 'sometimes|nullable|string|max:50',
            'profile.address' => 'sometimes|nullable|array',
            'profile.bio' => 'sometimes|nullable|string|max:1000',
            // Professional teacher fields
            'profile.subjects' => 'sometimes|nullable|array',
            'profile.specialty' => 'sometimes|nullable|string|max:255',
            'profile.experience_years' => 'sometimes|nullable|integer|min:0',
            'profile.miq_score' => 'sometimes|nullable|numeric|min:0|max:999.99',
            'profile.certification_score' => 'sometimes|nullable|numeric|min:0|max:999.99',
            'profile.last_certification_date' => 'sometimes|nullable|date',
            'profile.qualifications' => 'sometimes|nullable|array',
            'profile.training_courses' => 'sometimes|nullable|array',
            'profile.degree_level' => 'sometimes|nullable|string|max:50',
            'profile.graduation_university' => 'sometimes|nullable|string|max:255',
            'profile.graduation_year' => 'sometimes|nullable|integer|min:1950|max:' . date('Y'),
            'profile.university_gpa' => 'sometimes|nullable|numeric|min:0|max:4.00',
            // Student academic fields
            'profile.student_miq_score' => 'sometimes|nullable|numeric|min:0|max:999.99',
            'profile.academic_achievements' => 'sometimes|nullable|array',
            'profile.extracurricular_activities' => 'sometimes|nullable|array',
            'profile.health_info' => 'sometimes|nullable|array',
            'profile.previous_school' => 'sometimes|nullable|string|max:255',
            'profile.parent_occupation' => 'sometimes|nullable|array',
            'profile.family_income' => 'sometimes|nullable|numeric|min:0',
            'profile.special_needs' => 'sometimes|nullable|array',
            'profile.notes' => 'sometimes|nullable|string|max:2000',
            'preferences' => 'sometimes|array',
        ]);

        // Update user basic info
        if (isset($validated['username']) || isset($validated['email'])) {
            $user->update(collect($validated)->only(['username', 'email'])->toArray());
        }

        // Update profile
        if (isset($validated['profile'])) {
            if ($user->profile) {
                $user->profile->update($validated['profile']);
            } else {
                $user->profile()->create($validated['profile']);
            }
        }

        // Update preferences
        if (isset($validated['preferences'])) {
            $currentPreferences = $user->preferences ?? [];
            $user->update([
                'preferences' => array_merge($currentPreferences, $validated['preferences']),
            ]);
        }

        return $this->successResponse(
            $user->fresh(['role', 'institution', 'profile', 'department']),
            'Profil yeniləndi'
        );
    }

    /**
     * Upload profile avatar
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,gif|max:2048',
        ]);

        $user = Auth::user();

        // Delete old avatar if exists
        if ($user->profile?->avatar_path) {
            Storage::delete($user->profile->avatar_path);
        }

        // Store new avatar
        $path = $request->file('avatar')->store('avatars', 'public');

        // Update profile
        if ($user->profile) {
            $user->profile->update(['avatar_path' => $path]);
        } else {
            $user->profile()->create(['avatar_path' => $path]);
        }

        return $this->successResponse([
            'avatar_url' => Storage::url($path),
            'avatar_path' => $path,
        ], 'Avatar yeniləndi');
    }

    /**
     * Remove profile avatar
     */
    public function removeAvatar(): JsonResponse
    {
        $user = Auth::user();

        if ($user->profile?->avatar_path) {
            Storage::delete($user->profile->avatar_path);
            $user->profile->update(['avatar_path' => null]);
        }

        return $this->successResponse(null, 'Avatar silindi');
    }

    /**
     * Get user activity history
     */
    public function getActivity(Request $request): JsonResponse
    {
        $user = Auth::user();
        $perPage = $request->get('per_page', 15);

        $activities = $user->activities()
            ->with('subject')
            ->latest()
            ->paginate($perPage);

        return $this->paginatedResponse($activities, 'Aktivlik tarixçəsi');
    }

    /**
     * Update password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = Auth::user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return $this->errorResponse('Mövcud parol yanlışdır', 422);
        }

        $user->update([
            'password' => Hash::make($validated['new_password']),
            'password_changed_at' => now(),
        ]);

        return $this->successResponse(null, 'Parol yeniləndi');
    }
}
