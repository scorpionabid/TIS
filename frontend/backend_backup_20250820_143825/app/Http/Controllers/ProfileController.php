<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Models\User;

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
            'profile.phone' => 'sometimes|nullable|string|max:20',
            'profile.bio' => 'sometimes|nullable|string|max:1000',
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
                'preferences' => array_merge($currentPreferences, $validated['preferences'])
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
            'avatar' => 'required|image|mimes:jpg,jpeg,png,gif|max:2048'
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
        
        if (!Hash::check($validated['current_password'], $user->password)) {
            return $this->errorResponse('Mövcud parol yanlışdır', 422);
        }

        $user->update([
            'password' => Hash::make($validated['new_password']),
            'password_changed_at' => now(),
        ]);

        return $this->successResponse(null, 'Parol yeniləndi');
    }
}