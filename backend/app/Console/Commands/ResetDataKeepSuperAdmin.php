<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ResetDataKeepSuperAdmin extends Command
{
    protected $signature = 'db:reset-keep-superadmin {--confirm : Skip confirmation prompt}';
    protected $description = 'Reset all database data except SuperAdmin user';

    public function handle()
    {
        if (!$this->option('confirm')) {
            if (!$this->confirm('This will delete ALL data except SuperAdmin user. Continue?')) {
                $this->info('Operation cancelled.');
                return;
            }
        }

        $this->info('Starting database reset while preserving SuperAdmin...');

        // Find SuperAdmin user
        $superAdmin = User::where('email', 'superadmin@atis.az')->first();
        if (!$superAdmin) {
            $this->error('SuperAdmin user not found!');
            return 1;
        }

        $this->info("Found SuperAdmin: {$superAdmin->name} ({$superAdmin->email})");

        DB::transaction(function () use ($superAdmin) {
            // Disable foreign key constraints for SQLite
            if (config('database.default') === 'sqlite') {
                DB::statement('PRAGMA foreign_keys=OFF;');
            }

            // Disable MySQL foreign key checks
            if (config('database.default') === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            }

            // Tables to reset (order matters due to foreign keys)
            $tablesToReset = [
                // User-related tables (keep SuperAdmin)
                'user_devices' => "user_id != {$superAdmin->id}",
                'user_sessions' => "user_id != {$superAdmin->id}",
                'session_activities' => "user_id != {$superAdmin->id}",
                'user_storage_quotas' => "user_id != {$superAdmin->id}",
                'user_profiles' => "user_id != {$superAdmin->id}",
                'personal_access_tokens' => "tokenable_id != {$superAdmin->id}",
                'model_has_roles' => "model_id != {$superAdmin->id}",

                // Survey and response data
                'survey_question_responses',
                'survey_responses',
                'survey_questions',
                'surveys',
                'survey_templates',
                'survey_versions',
                'survey_audit_logs',

                // Assessment data
                'assessment_entries',
                'assessment_participants',
                'academic_assessments',
                'assessment_analytics',
                'assessment_excel_imports',
                'bulk_assessment_sessions',
                'psychology_assessments',
                'psychology_notes',
                'psychology_sessions',
                'teacher_evaluations',
                'performance_metrics',
                'teacher_professional_developments',

                // Student data
                'students',
                'student_enrollments',
                'subject_enrollments',
                'attendance_records',
                'daily_attendance_summary',
                'absence_requests',
                'attendance_patterns',
                'attendance_reports',
                'school_attendance',
                'class_bulk_attendance',

                // Task data
                'task_comments',
                'task_progress_logs',
                'task_status_changes',
                'task_assignee_changes',
                'task_bulk_operations',
                'tasks',

                // Document data
                'document_downloads',
                'document_shares',
                'documents',

                // Schedule data
                'schedule_sessions',
                'schedules',
                'schedule_templates',
                'schedule_template_usages',
                'schedule_generation_settings',
                'teacher_availability',

                // Notification data
                'notifications',

                // Audit logs
                'institution_audit_logs',
                'audit_logs',
                'activity_logs',
                'security_events',
                'security_alerts',
                'account_lockouts',
                'access_tracking',
                'security_incidents',
                'approval_audit_logs',

                // Institution data
                'institutions',

                // Inventory data
                'maintenance_records',
                'inventory_transactions',
                'inventory_items',

                // Approval workflow data
                'approval_delegations',
                'approval_workflow_templates',
                'survey_response_approvals',

                // Other users (except SuperAdmin)
                'users' => "id != {$superAdmin->id}",

                // System data that can be reset
                'reports',
                'report_results',
                'report_schedules',
                'uploads',
                'statistics',
                'system_configs' => "category != 'core'", // Keep core system configs
            ];

            foreach ($tablesToReset as $table => $condition) {
                if (is_numeric($table)) {
                    $table = $condition;
                    $condition = null;
                }

                if (Schema::hasTable($table)) {
                    if ($condition) {
                        $deleted = DB::table($table)->whereRaw($condition)->delete();
                        $this->info("Reset table {$table}: {$deleted} records deleted");
                    } else {
                        $count = DB::table($table)->count();
                        DB::table($table)->truncate();
                        $this->info("Reset table {$table}: {$count} records deleted");
                    }
                } else {
                    $this->warn("Table {$table} does not exist, skipping...");
                }
            }

            // Re-enable foreign key constraints
            if (config('database.default') === 'sqlite') {
                DB::statement('PRAGMA foreign_keys=ON;');
            }

            // Re-enable MySQL foreign key checks
            if (config('database.default') === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            }
        });

        $this->info('Database reset completed successfully!');
        $this->info('SuperAdmin user preserved: ' . $superAdmin->email);
        $this->info('You may want to run seeders to populate basic data:');
        $this->info('  php artisan db:seed --class=InstitutionTypeSeeder');
        $this->info('  php artisan db:seed --class=InstitutionHierarchySeeder');

        return 0;
    }
}