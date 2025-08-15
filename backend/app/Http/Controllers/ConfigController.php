<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Task;
use App\Models\Survey;
use App\Models\SurveyQuestion;

class ConfigController extends BaseController
{
    /**
     * Get application configuration for frontend
     */
    public function getAppConfig(): JsonResponse
    {
        $config = [
            'app' => [
                'name' => config('app.name'),
                'version' => config('app.version', '1.0.0'),
                'locale' => config('app.locale'),
                'fallback_locale' => config('app.fallback_locale'),
                'timezone' => config('app.timezone'),
                'debug' => config('app.debug'),
            ],
            'features' => [
                'file_uploads' => true,
                'real_time_notifications' => true,
                'bulk_operations' => true,
                'advanced_search' => true,
                'data_export' => true,
                'multi_language' => false, // Currently disabled
                'theme_switching' => true,
            ],
            'limits' => [
                'max_file_upload_size' => '10MB',
                'max_bulk_operation_items' => 100,
                'pagination_per_page_default' => 15,
                'pagination_per_page_max' => 100,
                'search_results_max' => 50,
            ],
            'ui' => [
                'theme' => 'light', // Default theme
                'sidebar_collapsed' => false,
                'show_avatars' => true,
                'date_format' => 'Y-m-d',
                'datetime_format' => 'Y-m-d H:i:s',
                'currency' => 'AZN',
            ]
        ];

        return $this->successResponse($config, 'Application configuration');
    }

    /**
     * Get system constants for frontend
     */
    public function getConstants(): JsonResponse
    {
        $constants = [
            'roles' => Role::select('id', 'name', 'display_name', 'description')->get(),
            'permissions' => Permission::select('id', 'name', 'display_name', 'description')->get(),
            'task_categories' => Task::CATEGORIES,
            'task_priorities' => Task::PRIORITIES, 
            'task_statuses' => Task::STATUSES,
            'task_target_scopes' => Task::TARGET_SCOPES,
            'survey_categories' => Survey::CATEGORIES,
            'survey_frequencies' => Survey::FREQUENCIES,
            'survey_approval_statuses' => Survey::APPROVAL_STATUSES,
            'survey_question_types' => SurveyQuestion::TYPES,
            'user_statuses' => [
                'active' => 'Aktiv',
                'inactive' => 'Qeyri-aktiv',
                'suspended' => 'Suspendləşdirilmiş',
            ],
            'institution_types' => [
                'ministry' => 'Nazirlik',
                'region' => 'Regional İdarə', 
                'sektor' => 'Sektor İdarəsi',
                'school' => 'Məktəb',
            ],
            'document_types' => [
                'pdf' => 'PDF Document',
                'doc' => 'Word Document', 
                'docx' => 'Word Document',
                'xls' => 'Excel Spreadsheet',
                'xlsx' => 'Excel Spreadsheet',
                'png' => 'PNG Image',
                'jpg' => 'JPEG Image',
                'jpeg' => 'JPEG Image',
                'gif' => 'GIF Image',
            ]
        ];

        return $this->successResponse($constants, 'System constants');
    }

    /**
     * Get navigation menu structure for user's role
     */
    public function getNavigation(): JsonResponse
    {
        $user = auth()->user();
        if (!$user) {
            return $this->errorResponse('Unauthorized', 401);
        }

        $role = $user->roles->first();
        $navigation = $this->buildNavigationForRole($role->name);

        return $this->successResponse($navigation, 'Navigation structure');
    }

    /**
     * Build navigation structure based on user role
     */
    private function buildNavigationForRole(string $roleName): array
    {
        $baseNavigation = [
            [
                'id' => 'dashboard',
                'label' => 'Ana Səhifə',
                'icon' => 'dashboard',
                'route' => '/dashboard',
                'roles' => ['all']
            ],
        ];

        $roleSpecificNavigation = [
            'superadmin' => [
                ['id' => 'users', 'label' => 'İstifadəçilər', 'icon' => 'users', 'route' => '/users'],
                ['id' => 'institutions', 'label' => 'İnstitusiyalar', 'icon' => 'building', 'route' => '/institutions'],
                ['id' => 'roles', 'label' => 'Rollar', 'icon' => 'shield', 'route' => '/roles'],
                ['id' => 'system', 'label' => 'Sistem', 'icon' => 'settings', 'route' => '/system'],
            ],
            'regionadmin' => [
                ['id' => 'institutions', 'label' => 'İnstitusiyalar', 'icon' => 'building', 'route' => '/institutions'],
                ['id' => 'users', 'label' => 'İstifadəçilər', 'icon' => 'users', 'route' => '/users'],
                ['id' => 'reports', 'label' => 'Hesabatlar', 'icon' => 'chart', 'route' => '/reports'],
            ],
            'sektoradmin' => [
                ['id' => 'schools', 'label' => 'Məktəblər', 'icon' => 'school', 'route' => '/schools'],
                ['id' => 'users', 'label' => 'İstifadəçilər', 'icon' => 'users', 'route' => '/users'],
                ['id' => 'reports', 'label' => 'Hesabatlar', 'icon' => 'chart', 'route' => '/reports'],
            ],
            'schooladmin' => [
                ['id' => 'students', 'label' => 'Şagirdlər', 'icon' => 'academic-cap', 'route' => '/students'],
                ['id' => 'teachers', 'label' => 'Müəllimlər', 'icon' => 'users', 'route' => '/teachers'],
                ['id' => 'classes', 'label' => 'Siniflər', 'icon' => 'collection', 'route' => '/classes'],
                ['id' => 'schedule', 'label' => 'Cədvəl', 'icon' => 'calendar', 'route' => '/schedule'],
            ],
            'teacher' => [
                ['id' => 'classes', 'label' => 'Siniflərim', 'icon' => 'collection', 'route' => '/my-classes'],
                ['id' => 'students', 'label' => 'Şagirdlər', 'icon' => 'academic-cap', 'route' => '/students'],
                ['id' => 'schedule', 'label' => 'Cədvəlim', 'icon' => 'calendar', 'route' => '/my-schedule'],
            ]
        ];

        // Common navigation for all roles
        $commonNavigation = [
            ['id' => 'surveys', 'label' => 'Sorğular', 'icon' => 'clipboard-list', 'route' => '/surveys'],
            ['id' => 'tasks', 'label' => 'Tapşırıqlar', 'icon' => 'check-circle', 'route' => '/tasks'],
            ['id' => 'documents', 'label' => 'Sənədlər', 'icon' => 'document-text', 'route' => '/documents'],
            ['id' => 'notifications', 'label' => 'Bildirişlər', 'icon' => 'bell', 'route' => '/notifications'],
            ['id' => 'profile', 'label' => 'Profil', 'icon' => 'user', 'route' => '/profile'],
        ];

        $navigation = array_merge(
            $baseNavigation,
            $roleSpecificNavigation[$roleName] ?? [],
            $commonNavigation
        );

        return $navigation;
    }
}