<?php

/**
 * Permission Configuration
 *
 * Defines permission dependencies and conflicts for validation.
 * Used by PermissionValidationService to ensure permission integrity.
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Permission Dependencies
    |--------------------------------------------------------------------------
    |
    | Define which permissions require other permissions to function properly.
    | Format: 'permission' => ['required_permission1', 'required_permission2']
    |
    | Example: 'surveys.update' requires 'surveys.read' to function
    |
    */
    'dependencies' => [
        // Survey permissions
        'surveys.update' => ['surveys.read'],
        'surveys.delete' => ['surveys.read'],
        'surveys.create' => ['surveys.read'],

        // Survey response permissions
        'survey_responses.write' => ['survey_responses.read'],
        'survey_responses.delete' => ['survey_responses.read'],

        // User management permissions
        'users.update' => ['users.read'],
        'users.delete' => ['users.read'],
        'users.create' => ['users.read'],

        // Institution permissions
        'institutions.update' => ['institutions.read'],
        'institutions.delete' => ['institutions.read'],
        'institutions.create' => ['institutions.read'],

        // Document permissions
        'documents.update' => ['documents.read'],
        'documents.delete' => ['documents.read'],
        'documents.share' => ['documents.read'],
        'documents.create' => ['documents.read'],

        // Task permissions
        'tasks.update' => ['tasks.read'],
        'tasks.delete' => ['tasks.read'],
        'tasks.assign' => ['tasks.read'],
        'tasks.create' => ['tasks.read'],

        // Assessment permissions
        'assessments.update' => ['assessments.read'],
        'assessments.delete' => ['assessments.read'],
        'assessments.create' => ['assessments.read'],

        // Student permissions
        'students.update' => ['students.read'],
        'students.delete' => ['students.read'],
        'students.create' => ['students.read'],

        // Teacher permissions
        'teachers.update' => ['teachers.read'],
        'teachers.delete' => ['teachers.read'],
        'teachers.create' => ['teachers.read'],

        // Class permissions
        'classes.update' => ['classes.read'],
        'classes.delete' => ['classes.read'],
        'classes.assign' => ['classes.read'],
        'classes.create' => ['classes.read'],

        // Attendance permissions
        'attendance.update' => ['attendance.read'],
        'attendance.delete' => ['attendance.read'],
        'attendance.create' => ['attendance.read'],

        // Approval permissions
        'approvals.approve' => ['approvals.read'],
        'approvals.reject' => ['approvals.read'],
        'approvals.return' => ['approvals.read'],

        // Inventory permissions
        'inventory.update' => ['inventory.read'],
        'inventory.delete' => ['inventory.read'],
        'inventory.assign' => ['inventory.read'],
        'inventory.create' => ['inventory.read'],

        // Psychology permissions
        'psychology.update' => ['psychology.read'],
        'psychology.delete' => ['psychology.read'],
        'psychology.create' => ['psychology.read'],

        // Report permissions
        'reports.export' => ['reports.read'],
        'reports.generate' => ['reports.read'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Conflicting Permissions
    |--------------------------------------------------------------------------
    |
    | Define permissions that cannot coexist (mutually exclusive).
    | Format: 'permission' => ['conflicting_permission1', 'conflicting_permission2']
    |
    | Example: Read-only mode conflicts with write/update/delete permissions
    |
    */
    'conflicting' => [
        // Example: If we had readonly modes
        // 'surveys.readonly' => ['surveys.update', 'surveys.delete', 'surveys.create'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Permission Groups
    |--------------------------------------------------------------------------
    |
    | Logical groupings of permissions for easier bulk assignment.
    | Used in permission templates and UI.
    |
    */
    'groups' => [
        'surveys_full' => [
            'surveys.read',
            'surveys.create',
            'surveys.update',
            'surveys.delete',
            'survey_responses.read',
            'survey_responses.write',
        ],
        'surveys_readonly' => [
            'surveys.read',
            'survey_responses.read',
        ],
        'documents_full' => [
            'documents.read',
            'documents.create',
            'documents.update',
            'documents.delete',
            'documents.share',
        ],
        'documents_readonly' => [
            'documents.read',
        ],
        'tasks_full' => [
            'tasks.read',
            'tasks.create',
            'tasks.update',
            'tasks.delete',
            'tasks.assign',
        ],
        'tasks_readonly' => [
            'tasks.read',
        ],
    ],
];
