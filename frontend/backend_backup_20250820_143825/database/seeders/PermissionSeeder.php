<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()['cache']->forget('spatie.permission.cache');

        // Create permissions for both web and api guards
        $permissions = [
            // User Management
            'users.create',
            'users.read',
            'users.update',
            'users.delete',

            // Institution Management  
            'institutions.create',
            'institutions.read',
            'institutions.update',

            // Survey Management
            'surveys.create',
            'surveys.read',
            'surveys.update',
            'surveys.delete',
            'surveys.publish',
            'surveys.manage',
            'surveys.respond',
            'surveys.approve',

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

            // Task Management
            'tasks.create',
            'tasks.read',
            'tasks.update',
            'tasks.delete',

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

            // Student Management - Phase 1 API
            'students.create',
            'students.read',
            'students.update',
            'students.delete',
            'students.manage',
            'students.export',

            // Classes Management - Phase 2 API
            'classes.create',
            'classes.read',
            'classes.update',
            'classes.delete',
            'classes.manage',
            'classes.assign',

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

            // Approval Management
            'approvals.create',
            'approvals.read',
            'approvals.update',
            'approvals.delete',
            'approvals.approve',
            'approvals.reject',

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

            // Inventory Management - Phase 3 API
            'inventory.create',
            'inventory.read',
            'inventory.update',
            'inventory.delete',
            'inventory.manage',
            'inventory.assign',
            'inventory.maintenance',

            // Teacher Performance Management - Phase 3 API
            'view teacher_performance',
            'create teacher_performance',
            'edit teacher_performance',
            'delete teacher_performance',
            'manage teacher_performance',
            'approve teacher_performance',
        ];

        foreach ($permissions as $permissionName) {
            // Create for web guard
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web'
            ]);
            
            // Create for api guard
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'api'
            ]);
        }

        // Assign permissions to roles for both guards
        $rolePermissions = [
            'superadmin' => [
                'users.create', 'users.read', 'users.update', 'users.delete',
                'institutions.create', 'institutions.read', 'institutions.update', 'institutions.delete',
                'surveys.create', 'surveys.read', 'surveys.update', 'surveys.delete', 'surveys.publish', 'surveys.manage',
                'roles.read', 'roles.create', 'roles.update', 'roles.delete',
                'schedules.create', 'schedules.read', 'schedules.update', 'schedules.delete', 'schedules.approve',
                'attendance.manage', 'attendance.create', 'attendance.read', 'attendance.update', 'attendance.delete', 'attendance.approve',
                'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.share',
                'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete',
                'reports.read', 'reports.create', 'reports.export',
                'assessments.create', 'assessments.read', 'assessments.update', 'assessments.delete', 'assessments.approve', 'assessments.manage', 'assessments.export',
                'assessment-types.create', 'assessment-types.read', 'assessment-types.update', 'assessment-types.delete', 'assessment-types.manage',
                'approvals.create', 'approvals.read', 'approvals.update', 'approvals.delete', 'approvals.approve', 'approvals.reject',
                'rooms.create', 'rooms.read', 'rooms.update', 'rooms.delete', 'rooms.manage', 'rooms.assign',
                'grades.create', 'grades.read', 'grades.update', 'grades.delete', 'grades.manage', 'grades.assign',
                'events.create', 'events.read', 'events.update', 'events.delete', 'events.manage', 'events.approve', 'events.register', 'events.cancel',
                'psychology.create', 'psychology.read', 'psychology.update', 'psychology.delete', 'psychology.manage', 'psychology.assess',
                'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete', 'inventory.manage', 'inventory.assign', 'inventory.maintenance',
                'view teacher_performance', 'create teacher_performance', 'edit teacher_performance', 'delete teacher_performance', 'manage teacher_performance', 'approve teacher_performance',
                'system.config', 'analytics.view'
            ],
            'regionadmin' => [
                'users.read', 'users.create', 'users.update', 'users.delete',
                'institutions.create', 'institutions.read', 'institutions.update',
                'surveys.create', 'surveys.read', 'surveys.update', 'surveys.publish', 'surveys.approve',
                'schedules.read', 'schedules.update', 'grades.read', 'attendance.manage', 'attendance.read', 'attendance.update', 'attendance.approve',
                'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.share',
                'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete',
                'reports.read', 'reports.create', 'reports.export',
                'assessments.create', 'assessments.read', 'assessments.update', 'assessments.approve', 'assessments.export',
                'assessment-types.create', 'assessment-types.read', 'assessment-types.update', 'assessment-types.delete', 'assessment-types.manage',
                'rooms.create', 'rooms.read', 'rooms.update', 'rooms.manage', 'rooms.assign',
                'grades.create', 'grades.read', 'grades.update', 'grades.manage', 'grades.assign',
                'events.create', 'events.read', 'events.update', 'events.manage', 'events.approve', 'events.register', 'events.cancel',
                'psychology.read', 'psychology.manage',
                'inventory.create', 'inventory.read', 'inventory.update', 'inventory.manage', 'inventory.assign', 'inventory.maintenance',
                'view teacher_performance', 'create teacher_performance', 'edit teacher_performance', 'manage teacher_performance', 'approve teacher_performance',
                'analytics.view'
            ],
            'schooladmin' => [
                'users.read', 'users.create', 'users.update',
                'institutions.read',
                'surveys.create', 'surveys.read', 'surveys.update',
                'schedules.create', 'schedules.read', 'schedules.update',
                'grades.create', 'grades.read', 'grades.update', 'grades.manage', 'grades.assign', 'attendance.manage', 'attendance.create', 'attendance.read', 'attendance.update',
                'documents.create', 'documents.read', 'documents.update', 'documents.share',
                'tasks.read', 'tasks.update',
                'assessments.create', 'assessments.read', 'assessments.update',
                'rooms.create', 'rooms.read', 'rooms.update', 'rooms.manage', 'rooms.assign',
                'events.create', 'events.read', 'events.update', 'events.manage', 'events.approve', 'events.register', 'events.cancel',
                'psychology.read', 'psychology.manage',
                'inventory.create', 'inventory.read', 'inventory.update', 'inventory.manage', 'inventory.assign', 'inventory.maintenance',
                'view teacher_performance', 'create teacher_performance', 'edit teacher_performance', 'manage teacher_performance',
                'reports.read'
            ],
            'sektoradmin' => [
                'users.read', 'users.create', 'users.update',
                'institutions.read',
                'surveys.create', 'surveys.read', 'surveys.update',
                'schedules.read', 'schedules.update', 'grades.read', 'attendance.read', 'attendance.update',
                'documents.create', 'documents.read', 'documents.update', 'documents.share',
                'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete',
                'assessments.read', 'assessments.update',
                'rooms.read', 'rooms.update',
                'grades.read', 'grades.update',
                'events.read', 'events.register',
                'reports.read'
            ],
            'müəllim' => [
                'surveys.read', 'surveys.respond',
                'schedules.read', 'grades.create', 'grades.read', 'attendance.manage', 'attendance.create', 'attendance.read', 'attendance.update',
                'documents.read', 'documents.create', 'documents.share',
                'tasks.read', 'tasks.update',
                'assessments.read',
                'rooms.read',
                'grades.read',
                'events.read', 'events.register',
                'view teacher_performance'
            ],
            'ubr' => [
                'surveys.read', 'surveys.respond',
                'schedules.read', 'grades.read', 'attendance.read',
                'documents.read', 'documents.create', 'documents.share',
                'tasks.read', 'tasks.update',
                'assessments.read',
                'rooms.read',
                'grades.read',
                'events.create', 'events.read', 'events.update', 'events.manage', 'events.register', 'events.cancel'
            ],
            'psixoloq' => [
                'surveys.read', 'surveys.respond',
                'schedules.read', 'grades.read', 'attendance.read',
                'documents.read', 'documents.create', 'documents.share',
                'tasks.read', 'tasks.update',
                'assessments.read',
                'psychology.create', 'psychology.read', 'psychology.update', 'psychology.manage', 'psychology.assess'
            ],
        ];

        foreach (['web', 'api'] as $guard) {
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
}