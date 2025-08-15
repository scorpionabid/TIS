<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Models\UserProfile;

/**
 * UserPreferencesController
 * 
 * Handles user preferences for theme, language, layout, and other UI settings
 */
class UserPreferencesController extends Controller
{
    /**
     * Get user preferences
     * 
     * @return JsonResponse
     */
    public function getPreferences(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Get or create user profile
            $profile = $user->profile ?? UserProfile::create([
                'user_id' => $user->id,
                'preferences' => $this->getDefaultPreferences()
            ]);

            $preferences = $profile->preferences ?? $this->getDefaultPreferences();

            return response()->json([
                'success' => true,
                'data' => [
                    'preferences' => $preferences,
                    'user_id' => $user->id,
                    'last_updated' => $profile->updated_at
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Error getting user preferences: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get user preferences',
                'error' => app()->isLocal() ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update user preferences
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Validate request
            $validator = Validator::make($request->all(), [
                'theme' => 'sometimes|in:light,dark,auto',
                'language' => 'sometimes|in:az,en',
                'sidebar' => 'sometimes|array',
                'sidebar.collapsed' => 'sometimes|boolean',
                'sidebar.favoriteItems' => 'sometimes|array',
                'dashboard' => 'sometimes|array',
                'dashboard.widgets' => 'sometimes|array',
                'dashboard.layout' => 'sometimes|in:grid,list,compact',
                'notifications' => 'sometimes|array',
                'notifications.email' => 'sometimes|boolean',
                'notifications.browser' => 'sometimes|boolean',
                'notifications.sound' => 'sometimes|boolean',
                'accessibility' => 'sometimes|array',
                'accessibility.reducedMotion' => 'sometimes|boolean',
                'accessibility.highContrast' => 'sometimes|boolean',
                'accessibility.fontSize' => 'sometimes|in:small,medium,large'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get or create user profile
            $profile = $user->profile ?? UserProfile::create([
                'user_id' => $user->id,
                'preferences' => $this->getDefaultPreferences()
            ]);

            // Merge new preferences with existing ones
            $currentPreferences = $profile->preferences ?? $this->getDefaultPreferences();
            $newPreferences = array_merge($currentPreferences, $request->only([
                'theme', 'language', 'sidebar', 'dashboard', 'notifications', 'accessibility'
            ]));

            // Update profile
            $profile->update([
                'preferences' => $newPreferences
            ]);

            // Log preference change
            \Log::info('User preferences updated', [
                'user_id' => $user->id,
                'updated_fields' => array_keys($request->only([
                    'theme', 'language', 'sidebar', 'dashboard', 'notifications', 'accessibility'
                ])),
                'timestamp' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Preferences updated successfully',
                'data' => [
                    'preferences' => $newPreferences,
                    'last_updated' => $profile->updated_at
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Error updating user preferences: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user preferences',
                'error' => app()->isLocal() ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update specific theme preference
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function updateTheme(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'theme' => 'required|in:light,dark,auto'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid theme value',
                'errors' => $validator->errors()
            ], 422);
        }

        return $this->updatePreferences($request);
    }

    /**
     * Update specific language preference
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function updateLanguage(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'language' => 'required|in:az,en'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid language value',
                'errors' => $validator->errors()
            ], 422);
        }

        // Set application locale
        app()->setLocale($request->language);

        return $this->updatePreferences($request);
    }

    /**
     * Update layout preferences
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function updateLayout(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'sidebar' => 'sometimes|array',
            'sidebar.collapsed' => 'sometimes|boolean',
            'sidebar.favoriteItems' => 'sometimes|array',
            'dashboard' => 'sometimes|array',
            'dashboard.widgets' => 'sometimes|array',
            'dashboard.layout' => 'sometimes|in:grid,list,compact'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid layout preferences',
                'errors' => $validator->errors()
            ], 422);
        }

        return $this->updatePreferences($request);
    }

    /**
     * Reset preferences to default
     * 
     * @return JsonResponse
     */
    public function resetPreferences(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Get or create user profile
            $profile = $user->profile ?? UserProfile::create([
                'user_id' => $user->id,
                'preferences' => $this->getDefaultPreferences()
            ]);

            // Reset to default preferences
            $defaultPreferences = $this->getDefaultPreferences();
            $profile->update([
                'preferences' => $defaultPreferences
            ]);

            // Log preference reset
            \Log::info('User preferences reset to default', [
                'user_id' => $user->id,
                'timestamp' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Preferences reset to default successfully',
                'data' => [
                    'preferences' => $defaultPreferences,
                    'last_updated' => $profile->updated_at
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Error resetting user preferences: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset user preferences',
                'error' => app()->isLocal() ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get UI settings (theme, language, layout)
     * 
     * @return JsonResponse
     */
    public function getUISettings(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $profile = $user->profile;
            $preferences = $profile ? $profile->preferences : $this->getDefaultPreferences();

            // Extract UI-specific settings
            $uiSettings = [
                'theme' => $preferences['theme'] ?? 'auto',
                'language' => $preferences['language'] ?? 'az',
                'sidebar' => $preferences['sidebar'] ?? [
                    'collapsed' => false,
                    'favoriteItems' => []
                ],
                'dashboard' => $preferences['dashboard'] ?? [
                    'widgets' => ['stats', 'recent-activity', 'quick-actions'],
                    'layout' => 'grid'
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $uiSettings
            ]);

        } catch (\Exception $e) {
            \Log::error('Error getting UI settings: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get UI settings',
                'error' => app()->isLocal() ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get default preferences structure
     * 
     * @return array
     */
    private function getDefaultPreferences(): array
    {
        return [
            'theme' => 'auto',
            'language' => 'az',
            'sidebar' => [
                'collapsed' => false,
                'favoriteItems' => []
            ],
            'dashboard' => [
                'widgets' => ['stats', 'recent-activity', 'quick-actions'],
                'layout' => 'grid'
            ],
            'notifications' => [
                'email' => true,
                'browser' => true,
                'sound' => false
            ],
            'accessibility' => [
                'reducedMotion' => false,
                'highContrast' => false,
                'fontSize' => 'medium'
            ]
        ];
    }
}