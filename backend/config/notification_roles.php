<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Notification Target Roles Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration defines role groups for notification targeting
    | throughout the ATİS system. Centralizes role management and prevents
    | hardcoded role definitions in multiple services.
    |
    */

    /**
     * Default target roles for general notifications
     * Used when no specific roles are provided
     */
    'default_target_roles' => [
        'schooladmin',
        'məktəbadmin',
        'müəllim',
        'teacher'
    ],

    /**
     * Administrative roles with notification management capabilities
     */
    'admin_roles' => [
        'superadmin',
        'regionadmin',
        'sektoradmin'
    ],

    /**
     * School-level roles for institutional notifications
     */
    'school_roles' => [
        'schooladmin',
        'məktəbadmin',
        'müəllim',
        'teacher',
        'təhsilçi'
    ],

    /**
     * Task management notification roles
     */
    'task_notification_roles' => [
        'schooladmin',
        'məktəbadmin',
        'müəllim'
    ],

    /**
     * Survey notification roles
     */
    'survey_notification_roles' => [
        'superadmin',
        'sektoradmin',
        'schooladmin',
        'məktəbadmin',
        'müəllim',
        'teacher',
        'təhsilçi'
    ],

    /**
     * Document sharing notification roles
     */
    'document_notification_roles' => [
        'schooladmin',
        'məktəbadmin',
        'müəllim',
        'teacher'
    ],

    /**
     * Resource (document/link) notification roles
     */
    'resource_notification_roles' => [
        'sektoradmin',
        'schooladmin',
        'məktəbadmin',
        'müəllim',
        'teacher'
    ],

    /**
     * Task assignment notification roles (comprehensive list)
     */
    'task_assignment_notification_roles' => [
        'superadmin',
        'regionadmin',
        'sektoradmin',
        'schooladmin',
        'məktəbadmin',
        'müəllim',
        'teacher',
        'təhsilçi'
    ],

    /**
     * All valid system roles (for validation)
     */
    'all_valid_roles' => [
        'superadmin',
        'regionadmin',
        'sektoradmin',
        'schooladmin',
        'məktəbadmin',
        'müəllim',
        'teacher',
        'təhsilçi',
        'student',
        'şagird'
    ],

    /**
     * Role hierarchy mapping for notifications
     * Higher level roles can receive notifications intended for lower levels
     */
    'role_hierarchy' => [
        'superadmin' => ['regionadmin', 'sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim', 'teacher', 'təhsilçi'],
        'regionadmin' => ['sektoradmin', 'schooladmin', 'məktəbadmin', 'müəllim', 'teacher'],
        'sektoradmin' => ['schooladmin', 'məktəbadmin', 'müəllim', 'teacher'],
        'schooladmin' => ['məktəbadmin', 'müəllim', 'teacher', 'təhsilçi'],
        'məktəbadmin' => ['müəllim', 'teacher', 'təhsilçi']
    ],

    /**
     * Notification priority mapping by role
     */
    'role_priority_mapping' => [
        'superadmin' => 'high',
        'regionadmin' => 'high',
        'sektoradmin' => 'medium',
        'schooladmin' => 'normal',
        'məktəbadmin' => 'normal',
        'müəllim' => 'normal',
        'teacher' => 'normal',
        'təhsilçi' => 'low'
    ]

];
