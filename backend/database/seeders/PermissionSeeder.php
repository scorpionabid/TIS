<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()['cache']->forget('spatie.permission.cache');

        $guard = 'sanctum';

        // Create permissions for sanctum guard
        $permissions = [
            // User Management
            'users.create',
            'users.read',
            'users.update',
            'users.delete',
            'users.write',
            'users.import',
            'users.export',
            'users.bulk',
            'users.test',

            // Institution Management
            'institutions.create',
            'institutions.read',
            'institutions.update',
            'institutions.write',
            'institutions.hierarchy',

            // Survey Management
            'surveys.create',
            'surveys.read',
            'surveys.update',
            'surveys.delete',
            'surveys.write',
            'surveys.publish',
            'surveys.manage',
            'surveys.respond',
            'surveys.approve',
            'surveys.target',

            // Survey Response Management
            'survey_responses.read',
            'survey_responses.write',
            'survey_responses.approve',
            'survey_responses.bulk_approve',

            // Role Management
            'roles.read',
            'roles.create',
            'roles.update',
            'roles.delete',

            // Academic Management
            'schedules.create',
            'schedules.read',
            'grades.create',
            'grades.read',
            'grades.update',
            'grades.delete',
            'grades.manage',
            'grades.assign',
            'attendance.manage',

            // Document Management
            'documents.create',
            'documents.read',
            'documents.update',
            'documents.delete',
            'documents.share',
            'documents.bulk',
            'documents.analytics',
            'documents.tracking',

            // Task Management
            'tasks.create',
            'tasks.read',
            'tasks.update',
            'tasks.delete',
            'tasks.bulk',
            'tasks.analytics',
            'tasks.assign', // NEW: for RegionOperator mapping

            // Reports Management
            'reports.read',
            'reports.create',
            'reports.export',

            // System Management
            'system.config',
            'analytics.view',

            // Institutions Extended
            'institutions.delete',

            // Assessment Management (KSQ/BSQ)
            'assessments.create',
            'assessments.read',
            'assessments.update',
            'assessments.delete',
            'assessments.approve',
            'assessments.manage',
            'assessments.export',

            // Assessment Types Management
            'assessment-types.create',
            'assessment-types.read',
            'assessment-types.update',
            'assessment-types.delete',
            'assessment-types.manage',

            // Attendance Management
            'attendance.create',
            'attendance.read',
            'attendance.update',
            'attendance.delete',

            // School Attendance aggregate management
            'school_attendance.read',
            'school_attendance.write',
            'school_attendance.bulk',
            'school_attendance.export',

            // Student Management - Phase 1 API
            'students.create',
            'students.read',
            'students.update',
            'students.delete',
            'students.write',
            'students.manage',
            'students.export',
            'students.import',
            'students.bulk',
            'students.grades',
            'students.attendance',
            'students.schedule',
            'students.enroll',
            'students.transfer',
            'students.graduate',
            'students.analytics',
            'students.reports',

            // Classes Management - Phase 2 API
            'classes.create',
            'classes.read',
            'classes.update',
            'classes.delete',
            'classes.write',
            'classes.manage',
            'classes.assign',
            'classes.students',
            'classes.teachers',
            'classes.schedule',
            'classes.attendance',
            'classes.grades',
            'classes.bulk',
            'classes.analytics',

            // Subjects Management - Phase 3 API
            'subjects.create',
            'subjects.read',
            'subjects.update',
            'subjects.delete',
            'subjects.manage',
            'subjects.assign',

            // Schedule Management
            'schedules.update',
            'schedules.delete',
            'schedules.approve',

            // Approval Management - Enhanced
            'approvals.create',
            'approvals.read',
            'approvals.update',
            'approvals.delete',
            'approvals.approve',
            'approvals.reject',
            'approvals.return',
            'approvals.bulk_approve',
            'approvals.bulk_reject',
            'approvals.analytics',
            'approvals.reports',
            'approvals.delegate',
            'approvals.workflow_manage',
            'approvals.template_manage',

            // Task Approval Specific
            'tasks.approve',
            'tasks.reject',
            'tasks.approve_bulk',

            // Event Approval Specific
            'events.approve',
            'events.reject',
            'events.approve_bulk',

            // Room Management - Phase 2 API
            'rooms.create',
            'rooms.read',
            'rooms.update',
            'rooms.delete',
            'rooms.manage',
            'rooms.assign',

            // Grade Management permissions already defined above - removing duplicates

            // Event Management - Phase 3 API (UBR role focused)
            'events.create',
            'events.read',
            'events.update',
            'events.delete',
            'events.manage',
            'events.approve',
            'events.register',
            'events.cancel',

            // Psychology Support - Phase 3 API
            'psychology.create',
            'psychology.read',
            'psychology.update',
            'psychology.delete',
            'psychology.manage',
            'psychology.assess',
            'psychology.write',
            'psychology.schedule',
            'psychology.reports',
            'psychology.analytics',
            'psychology.recommend',
            'psychology.templates',
            'psychology.interventions',
            'psychology.progress',
            'psychology.referrals',
            'psychology.statistics',
            'psychology.export',

            // Inventory Management - Phase 3 API
            'inventory.create',
            'inventory.read',
            'inventory.update',
            'inventory.delete',
            'inventory.manage',
            'inventory.assign',
            'inventory.maintenance',
            'inventory.transactions',
            'inventory.analytics',

            // Teacher Performance Management - Phase 3 API
            'view teacher_performance',
            'create teacher_performance',
            'edit teacher_performance',
            'delete teacher_performance',
            'manage teacher_performance',
            'approve teacher_performance',

            // Department Management
            'departments.create',
            'departments.read',
            'departments.update',
            'departments.delete',
            'departments.write',
            'departments.manage',

            // Teaching Load Management - Phase 3 API
            'teaching_loads.create',
            'teaching_loads.read',
            'teaching_loads.update',
            'teaching_loads.delete',
            'teaching_loads.write',
            'teaching_loads.bulk',
            'teaching_loads.analytics',

            // Institution Types Management
            'institution-types.read',
            'institution-types.manage',

            // Link Share Management
            'links.create',
            'links.read',
            'links.update',
            'links.delete',
            'links.share',
            'links.bulk',
            'links.analytics',
            'links.tracking',

            // Teacher Management
            'teachers.create',
            'teachers.read',
            'teachers.update',
            'teachers.delete',
            'teachers.write',
            'teachers.manage',
            'teachers.assign',
            'teachers.bulk',
            'teachers.analytics',
            'teachers.performance',
        ];

        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => $guard,
            ]);
        }

        // Assign permissions to roles for sanctum guard
        $rolePermissions = [
            'superadmin' => [
                'users.create', 'users.read', 'users.update', 'users.delete', 'users.write', 'users.import', 'users.export', 'users.bulk', 'users.test',
                'institutions.create', 'institutions.read', 'institutions.update', 'institutions.delete', 'institutions.write', 'institutions.hierarchy',
                'surveys.create', 'surveys.read', 'surveys.update', 'surveys.delete', 'surveys.write', 'surveys.publish', 'surveys.manage', 'surveys.respond', 'surveys.approve', 'surveys.target', 'survey_responses.read', 'survey_responses.write', 'survey_responses.approve', 'survey_responses.bulk_approve',
                'roles.read', 'roles.create', 'roles.update', 'roles.delete',
                'schedules.create', 'schedules.read', 'schedules.update', 'schedules.delete', 'schedules.approve',
                'attendance.manage', 'attendance.create', 'attendance.read', 'attendance.update', 'attendance.delete', 'attendance.approve',
                'school_attendance.read', 'school_attendance.write', 'school_attendance.bulk', 'school_attendance.export',
                'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.share', 'documents.bulk', 'documents.analytics', 'documents.tracking',
                'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete', 'tasks.bulk', 'tasks.analytics',
                'reports.read', 'reports.create', 'reports.export',
                'assessments.create', 'assessments.read', 'assessments.update', 'assessments.delete', 'assessments.approve', 'assessments.manage', 'assessments.export',
                'assessment-types.create', 'assessment-types.read', 'assessment-types.update', 'assessment-types.delete', 'assessment-types.manage',
                'subjects.create', 'subjects.read', 'subjects.update', 'subjects.delete', 'subjects.manage', 'subjects.assign',
                'students.create', 'students.read', 'students.update', 'students.delete', 'students.write', 'students.manage', 'students.export', 'students.import', 'students.bulk', 'students.grades', 'students.attendance', 'students.schedule', 'students.enroll', 'students.transfer', 'students.graduate', 'students.analytics', 'students.reports',
                'classes.create', 'classes.read', 'classes.update', 'classes.delete', 'classes.write', 'classes.manage', 'classes.assign', 'classes.students', 'classes.teachers', 'classes.schedule', 'classes.attendance', 'classes.grades', 'classes.bulk', 'classes.analytics',
                'approvals.create', 'approvals.read', 'approvals.update', 'approvals.delete', 'approvals.approve', 'approvals.reject', 'approvals.return', 'approvals.bulk_approve', 'approvals.bulk_reject', 'approvals.analytics', 'approvals.reports', 'approvals.delegate', 'approvals.workflow_manage', 'approvals.template_manage',
                'tasks.approve', 'tasks.reject', 'tasks.approve_bulk', 'events.approve', 'events.reject', 'events.approve_bulk',
                'rooms.create', 'rooms.read', 'rooms.update', 'rooms.delete', 'rooms.manage', 'rooms.assign',
                'grades.create', 'grades.read', 'grades.update', 'grades.delete', 'grades.manage', 'grades.assign',
                'events.create', 'events.read', 'events.update', 'events.delete', 'events.manage', 'events.approve', 'events.register', 'events.cancel',
                'psychology.create', 'psychology.read', 'psychology.update', 'psychology.delete', 'psychology.manage', 'psychology.assess', 'psychology.write', 'psychology.schedule', 'psychology.reports', 'psychology.analytics', 'psychology.recommend', 'psychology.templates', 'psychology.interventions', 'psychology.progress', 'psychology.referrals', 'psychology.statistics', 'psychology.export',
                'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete', 'inventory.manage', 'inventory.assign', 'inventory.maintenance', 'inventory.transactions', 'inventory.analytics',
                'view teacher_performance', 'create teacher_performance', 'edit teacher_performance', 'delete teacher_performance', 'manage teacher_performance', 'approve teacher_performance',
                'departments.create', 'departments.read', 'departments.update', 'departments.delete', 'departments.write', 'departments.manage',
                'teaching_loads.create', 'teaching_loads.read', 'teaching_loads.update', 'teaching_loads.delete', 'teaching_loads.write', 'teaching_loads.bulk', 'teaching_loads.analytics',
                'teachers.create', 'teachers.read', 'teachers.update', 'teachers.delete', 'teachers.write', 'teachers.manage', 'teachers.assign', 'teachers.bulk', 'teachers.analytics', 'teachers.performance',
                'links.create', 'links.read', 'links.update', 'links.delete', 'links.share', 'links.bulk', 'links.analytics', 'links.tracking',
                'institution-types.read', 'institution-types.manage',
                'system.config', 'analytics.view',
            ],
            'regionadmin' => [
                'users.read', 'users.create', 'users.update', 'users.delete',
                'institutions.create', 'institutions.read', 'institutions.update', 'institutions.write', 'institutions.hierarchy',
                'surveys.create', 'surveys.read', 'surveys.update', 'surveys.delete', 'surveys.write', 'surveys.publish', 'surveys.manage', 'surveys.target', 'surveys.approve', 'survey_responses.read', 'survey_responses.write', 'survey_responses.approve', 'survey_responses.bulk_approve',
                'schedules.read', 'schedules.update', 'grades.read', 'attendance.manage', 'attendance.read', 'attendance.update', 'attendance.approve',
                'school_attendance.read', 'school_attendance.write', 'school_attendance.export',
                'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.share', 'documents.bulk', 'documents.analytics', 'documents.tracking',
                'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete', 'tasks.bulk', 'tasks.analytics',
                'reports.read', 'reports.create', 'reports.export',
                'assessments.create', 'assessments.read', 'assessments.update', 'assessments.approve', 'assessments.export',
                'assessment-types.create', 'assessment-types.read', 'assessment-types.update', 'assessment-types.delete', 'assessment-types.manage',
                'subjects.create', 'subjects.read', 'subjects.update', 'subjects.delete', 'subjects.manage', 'subjects.assign',
                'rooms.create', 'rooms.read', 'rooms.update', 'rooms.manage', 'rooms.assign',
                'grades.create', 'grades.read', 'grades.update', 'grades.manage', 'grades.assign',
                'events.create', 'events.read', 'events.update', 'events.manage', 'events.approve', 'events.register', 'events.cancel',
                'psychology.read', 'psychology.manage',
                'inventory.create', 'inventory.read', 'inventory.update', 'inventory.manage', 'inventory.assign', 'inventory.maintenance',
                'teachers.read', 'teachers.update', 'teachers.delete', 'teachers.manage',
                'view teacher_performance', 'create teacher_performance', 'edit teacher_performance', 'manage teacher_performance', 'approve teacher_performance',
                'departments.create', 'departments.read', 'departments.update', 'departments.delete', 'departments.manage', 'departments.write',
                'approvals.create', 'approvals.read', 'approvals.approve', 'approvals.reject', 'approvals.return', 'approvals.bulk_approve', 'approvals.bulk_reject', 'approvals.analytics', 'approvals.delegate',
                'tasks.approve', 'tasks.reject', 'events.approve', 'events.reject',
                'links.create', 'links.read', 'links.update', 'links.delete', 'links.share', 'links.bulk', 'links.analytics', 'links.tracking',
                'institution-types.read',
                'analytics.view',
            ],
            'schooladmin' => [
                'users.read', 'users.create', 'users.update',
                'institutions.read',
                'surveys.read', 'surveys.respond', 'survey_responses.read', 'survey_responses.write',
                'schedules.create', 'schedules.read', 'schedules.update',
                'grades.create', 'grades.read', 'grades.update', 'grades.manage', 'grades.assign', 'attendance.manage', 'attendance.create', 'attendance.read', 'attendance.update',
                'school_attendance.read', 'school_attendance.write', 'school_attendance.export',
                'documents.create', 'documents.read',
                'tasks.read', 'tasks.update',
                'assessments.create', 'assessments.read', 'assessments.update',
                'assessment-types.read',
                'subjects.read',
                'teachers.read', 'teachers.write', 'teachers.update', 'teachers.manage', 'teachers.assign',
                'teaching_loads.create', 'teaching_loads.read', 'teaching_loads.update', 'teaching_loads.delete', 'teaching_loads.write', 'teaching_loads.analytics',
                'rooms.create', 'rooms.read', 'rooms.update', 'rooms.manage', 'rooms.assign',
                'events.create', 'events.read', 'events.update', 'events.manage', 'events.approve', 'events.register', 'events.cancel',
                'psychology.read', 'psychology.manage',
                'inventory.create', 'inventory.read', 'inventory.update', 'inventory.manage', 'inventory.assign', 'inventory.maintenance',
                'view teacher_performance', 'create teacher_performance', 'edit teacher_performance', 'manage teacher_performance',
                'links.read',
                'reports.read',
            ],
            'regionoperator' => [
                'surveys.read',
                'surveys.respond',
                'survey_responses.read',
                'survey_responses.write',
                'documents.read',
                'tasks.read',
                'departments.read',
                'reports.read',
                'institutions.read',
                'links.read',
            ],
            'sektoradmin' => [
                'users.read', 'users.create', 'users.update',
                'institutions.read', 'institutions.hierarchy',
                'surveys.read', 'surveys.respond', 'survey_responses.read', 'survey_responses.write', 'survey_responses.approve', 'survey_responses.bulk_approve',
                'schedules.read', 'schedules.update', 'grades.read', 'attendance.read', 'attendance.update',
                'school_attendance.read',
                'documents.create', 'documents.read',
                'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete', 'tasks.bulk', 'tasks.analytics',
                'assessments.read', 'assessments.update',
                'subjects.read',
                'rooms.read', 'rooms.update',
                'grades.read', 'grades.update',
                'events.read', 'events.register',
                'approvals.read', 'approvals.approve', 'approvals.reject', 'approvals.return',
                'tasks.approve', 'tasks.reject', 'events.approve', 'events.reject',
                'departments.read',
                'students.read',
                'classes.read',
                'teaching_loads.read',
                'links.read',
                'reports.read',
            ],
            'muavin' => [
                'schedules.create', 'schedules.read', 'schedules.update',
                'classes.create', 'classes.read', 'classes.update', 'classes.manage', 'classes.assign',
                'subjects.create', 'subjects.read', 'subjects.update', 'subjects.manage', 'subjects.assign',
                'rooms.read', 'rooms.update', 'rooms.assign',
                'grades.read', 'grades.update',
                'attendance.read', 'attendance.update', 'school_attendance.read',
                'documents.read', 'documents.create', 'documents.update',
                'assessments.read', 'assessments.update',
                'tasks.read', 'tasks.update',
                'view teacher_performance', 'edit teacher_performance',
                'links.read',
                'reports.read',
            ],
            'ubr' => [
                'events.create', 'events.read', 'events.update', 'events.manage', 'events.register', 'events.cancel',
                'schedules.read',
                'grades.read', 'attendance.read',
                'school_attendance.read',
                'documents.read', 'documents.create', 'documents.share',
                'tasks.read', 'tasks.update',
                'assessments.read',
                'rooms.read',
                'surveys.read', 'surveys.respond',
                'links.read',
                'reports.read',
            ],
            'tesarrufat' => [
                'inventory.create', 'inventory.read', 'inventory.update', 'inventory.manage',
                'inventory.assign', 'inventory.maintenance',
                'rooms.read', 'rooms.update', 'rooms.manage',
                'documents.read', 'documents.create', 'documents.update',
                'tasks.read', 'tasks.update',
                'links.read',
                'reports.read',
                'surveys.read', 'surveys.respond',
            ],
            'psixoloq' => [
                'psychology.create', 'psychology.read', 'psychology.update', 'psychology.manage', 'psychology.assess',
                'students.read', 'students.update',
                'grades.read', 'attendance.read',
                'documents.read', 'documents.create', 'documents.share',
                'tasks.read', 'tasks.update',
                'assessments.read',
                'surveys.read', 'surveys.respond',
                'links.read',
                'reports.read',
            ],
            'müəllim' => [
                'surveys.read', 'surveys.respond',
                'schedules.read', 'grades.create', 'grades.read', 'grades.update',
                'attendance.manage', 'attendance.create', 'attendance.read', 'attendance.update',
                'documents.read', 'documents.create', 'documents.share',
                'tasks.read', 'tasks.update',
                'assessments.read', 'assessments.create', 'assessments.update',
                'assessment-types.read',
                'students.read',
                'classes.read',
                'rooms.read',
                'events.read', 'events.register',
                'links.read',
                'view teacher_performance',
            ],
        ];

        foreach ($rolePermissions as $roleName => $permissions) {
            $role = Role::where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $permissionObjects = Permission::whereIn('name', $permissions)
                    ->where('guard_name', $guard)
                    ->get();
                $role->syncPermissions($permissionObjects);
            }
        }
    }
}
