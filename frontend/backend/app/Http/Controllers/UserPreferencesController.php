<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Traits\ValidationRules;
use App\Http\Traits\ResponseHelpers;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class UserPreferencesController extends BaseController
{
    use ValidationRules, ResponseHelpers;

    /**
     * Get user preferences
     */
    public function getPreferences(): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $user = Auth::user();
            
            $preferences = [
                'theme' => $user->preferences['theme'] ?? 'light',
                'language' => $user->preferences['language'] ?? 'az',
                'layout' => $user->preferences['layout'] ?? 'default',
                'notifications' => $user->preferences['notifications'] ?? [
                    'email' => true,
                    'browser' => true,
                    'tasks' => true,
                    'surveys' => true
                ],
                'dashboard' => $user->preferences['dashboard'] ?? [
                    'widgets' => ['tasks', 'surveys', 'documents'],
                    'refresh_interval' => 300
                ]
            ];
            
            return $this->successResponse($preferences, 'User preferences retrieved successfully');
        }, 'user_preferences.get');
    }

    /**
     * Update user preferences
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'theme' => 'nullable|string|in:light,dark,auto',
                'language' => 'nullable|string|in:az,en,tr',
                'layout' => 'nullable|string|in:default,compact,wide',
                'notifications' => 'nullable|array',
                'notifications.email' => 'nullable|boolean',
                'notifications.browser' => 'nullable|boolean',
                'notifications.tasks' => 'nullable|boolean',
                'notifications.surveys' => 'nullable|boolean',
                'dashboard' => 'nullable|array',
                'dashboard.widgets' => 'nullable|array',
                'dashboard.refresh_interval' => 'nullable|integer|min:60|max:3600'
            ]);

            $user = Auth::user();
            $currentPreferences = $user->preferences ?? [];
            
            // Merge with existing preferences
            $updatedPreferences = array_merge($currentPreferences, $validated);
            
            $user->update(['preferences' => $updatedPreferences]);
            
            // Clear user cache
            Cache::forget("user_preferences_{$user->id}");
            
            return $this->successResponse($updatedPreferences, 'User preferences updated successfully');
        }, 'user_preferences.update');
    }

    /**
     * Reset user preferences to default
     */
    public function resetPreferences(): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $user = Auth::user();
            
            $defaultPreferences = [
                'theme' => 'light',
                'language' => 'az',
                'layout' => 'default',
                'notifications' => [
                    'email' => true,
                    'browser' => true,
                    'tasks' => true,
                    'surveys' => true
                ],
                'dashboard' => [
                    'widgets' => ['tasks', 'surveys', 'documents'],
                    'refresh_interval' => 300
                ]
            ];
            
            $user->update(['preferences' => $defaultPreferences]);
            
            // Clear user cache
            Cache::forget("user_preferences_{$user->id}");
            
            return $this->successResponse($defaultPreferences, 'User preferences reset to default successfully');
        }, 'user_preferences.reset');
    }

    /**
     * Update theme preference
     */
    public function updateTheme(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'theme' => 'required|string|in:light,dark,auto'
            ]);

            $user = Auth::user();
            $preferences = $user->preferences ?? [];
            $preferences['theme'] = $validated['theme'];
            
            $user->update(['preferences' => $preferences]);
            
            // Clear user cache
            Cache::forget("user_preferences_{$user->id}");
            
            return $this->successResponse(['theme' => $validated['theme']], 'Theme updated successfully');
        }, 'user_preferences.update_theme');
    }

    /**
     * Update language preference
     */
    public function updateLanguage(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'language' => 'required|string|in:az,en,tr'
            ]);

            $user = Auth::user();
            $preferences = $user->preferences ?? [];
            $preferences['language'] = $validated['language'];
            
            $user->update(['preferences' => $preferences]);
            
            // Clear user cache
            Cache::forget("user_preferences_{$user->id}");
            
            return $this->successResponse(['language' => $validated['language']], 'Language updated successfully');
        }, 'user_preferences.update_language');
    }

    /**
     * Update layout preference
     */
    public function updateLayout(Request $request): JsonResponse
    {
        return $this->executeWithErrorHandling(function () use ($request) {
            $validated = $request->validate([
                'layout' => 'required|string|in:default,compact,wide'
            ]);

            $user = Auth::user();
            $preferences = $user->preferences ?? [];
            $preferences['layout'] = $validated['layout'];
            
            $user->update(['preferences' => $preferences]);
            
            // Clear user cache
            Cache::forget("user_preferences_{$user->id}");
            
            return $this->successResponse(['layout' => $validated['layout']], 'Layout updated successfully');
        }, 'user_preferences.update_layout');
    }

    /**
     * Get UI settings (combined preferences for frontend)
     */
    public function getUISettings(): JsonResponse
    {
        return $this->executeWithErrorHandling(function () {
            $user = Auth::user();
            
            $uiSettings = [
                'theme' => $user->preferences['theme'] ?? 'light',
                'language' => $user->preferences['language'] ?? 'az',
                'layout' => $user->preferences['layout'] ?? 'default',
                'sidebar_collapsed' => $user->preferences['sidebar_collapsed'] ?? false,
                'show_tooltips' => $user->preferences['show_tooltips'] ?? true,
                'animations_enabled' => $user->preferences['animations_enabled'] ?? true,
                'sound_enabled' => $user->preferences['sound_enabled'] ?? false
            ];
            
            return $this->successResponse($uiSettings, 'UI settings retrieved successfully');
        }, 'user_preferences.get_ui_settings');
    }
}