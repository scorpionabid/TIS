<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Users table optimizations
        Schema::table('users', function (Blueprint $table) {
            // Composite index for institution and role queries
            $table->index(['institution_id', 'role_id'], 'users_institution_role_idx');

            // Index for active user lookups
            $table->index(['is_active', 'last_login_at'], 'users_active_login_idx');

            // Index for email verification status
            $table->index(['email_verified_at'], 'users_email_verified_idx');

            // Department assignment index
            $table->index(['department_id'], 'users_department_idx');

            // Created at index for recent user queries
            $table->index(['created_at'], 'users_created_at_idx');
        });

        // Institutions table optimizations
        Schema::table('institutions', function (Blueprint $table) {
            // Parent-child hierarchy index
            $table->index(['parent_id'], 'institutions_parent_idx');

            // Type and status index
            $table->index(['type', 'is_active'], 'institutions_type_status_idx');

            // Regional hierarchy index (using region_code, not region_id)
            $table->index(['region_code'], 'institutions_region_code_idx');

            // Created at index
            $table->index(['created_at'], 'institutions_created_at_idx');
        });

        // Surveys and responses optimization
        Schema::table('surveys', function (Blueprint $table) {
            // Creator and status index (using creator_id, not created_by)
            $table->index(['creator_id', 'status'], 'surveys_creator_status_idx');

            // Date range queries
            $table->index(['start_date', 'end_date'], 'surveys_date_range_idx');

            // Creator index
            $table->index(['creator_id'], 'surveys_creator_idx');

            // Survey type and status
            $table->index(['survey_type', 'status'], 'surveys_type_status_idx');
        });

        Schema::table('survey_responses', function (Blueprint $table) {
            // Survey and respondent index (using respondent_id, not user_id)
            $table->index(['survey_id', 'respondent_id'], 'survey_responses_survey_respondent_idx');

            // Institution and survey index
            $table->index(['institution_id', 'survey_id'], 'survey_responses_institution_survey_idx');

            // Response date index
            $table->index(['created_at'], 'survey_responses_created_at_idx');

            // Status index
            $table->index(['status'], 'survey_responses_status_idx');

            // Department index
            $table->index(['department_id'], 'survey_responses_department_idx');
        });

        // Tasks optimization
        Schema::table('tasks', function (Blueprint $table) {
            // Assigned institution and status index
            $table->index(['assigned_institution_id', 'status'], 'tasks_institution_status_idx');

            // Deadline index (using deadline, not due_date)
            $table->index(['deadline'], 'tasks_deadline_idx');

            // Priority index
            $table->index(['priority'], 'tasks_priority_idx');

            // Assigned user index
            $table->index(['assigned_to'], 'tasks_assigned_to_idx');

            // Creator index
            $table->index(['created_by'], 'tasks_created_by_idx');

            // Category and status
            $table->index(['category', 'status'], 'tasks_category_status_idx');
        });

        // Documents optimization
        Schema::table('documents', function (Blueprint $table) {
            // Institution and category index
            $table->index(['institution_id', 'category'], 'documents_institution_category_idx');

            // File type and size index for filtering
            $table->index(['file_type', 'file_size'], 'documents_type_size_idx');

            // Uploaded by index
            $table->index(['uploaded_by'], 'documents_uploaded_by_idx');

            // Access level index
            $table->index(['access_level'], 'documents_access_level_idx');
        });

        // Notifications optimization
        Schema::table('notifications', function (Blueprint $table) {
            // Recipient, read status and date index
            $table->index(['recipient_id', 'is_read', 'created_at'], 'notifications_recipient_read_date_idx');

            // Notification type index
            $table->index(['type'], 'notifications_type_idx');
        });

        // Departments optimization
        Schema::table('departments', function (Blueprint $table) {
            // Institution and type index
            $table->index(['institution_id', 'type'], 'departments_institution_type_idx');

            // Parent department index
            $table->index(['parent_id'], 'departments_parent_idx');
        });

        // Activity logs optimization (if exists)
        if (Schema::hasTable('activity_logs')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                // User and date index
                $table->index(['user_id', 'created_at'], 'activity_logs_user_date_idx');

                // Action type index
                $table->index(['action'], 'activity_logs_action_idx');

                // Subject type and id index
                $table->index(['subject_type', 'subject_id'], 'activity_logs_subject_idx');
            });
        }

        // Assessment related optimizations
        if (Schema::hasTable('assessment_entries')) {
            Schema::table('assessment_entries', function (Blueprint $table) {
                // Student and assessment type index
                $table->index(['student_id', 'assessment_type_id'], 'assessment_entries_student_type_idx');

                // Institution and date index
                $table->index(['institution_id', 'assessment_date'], 'assessment_entries_institution_date_idx');
            });
        }

        if (Schema::hasTable('attendance_records')) {
            Schema::table('attendance_records', function (Blueprint $table) {
                // Student and date index
                $table->index(['student_id', 'date'], 'attendance_records_student_date_idx');

                // Institution and date index
                $table->index(['institution_id', 'date'], 'attendance_records_institution_date_idx');

                // Status index
                $table->index(['status'], 'attendance_records_status_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Users table indexes
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_institution_role_idx');
            $table->dropIndex('users_active_login_idx');
            $table->dropIndex('users_email_verified_idx');
            $table->dropIndex('users_department_idx');
            $table->dropIndex('users_created_at_idx');
        });

        // Institutions table indexes
        Schema::table('institutions', function (Blueprint $table) {
            $table->dropIndex('institutions_parent_idx');
            $table->dropIndex('institutions_type_status_idx');
            $table->dropIndex('institutions_region_code_idx');
            $table->dropIndex('institutions_created_at_idx');
        });

        // Surveys indexes
        Schema::table('surveys', function (Blueprint $table) {
            $table->dropIndex('surveys_creator_status_idx');
            $table->dropIndex('surveys_date_range_idx');
            $table->dropIndex('surveys_creator_idx');
            $table->dropIndex('surveys_type_status_idx');
        });

        Schema::table('survey_responses', function (Blueprint $table) {
            $table->dropIndex('survey_responses_survey_respondent_idx');
            $table->dropIndex('survey_responses_institution_survey_idx');
            $table->dropIndex('survey_responses_created_at_idx');
            $table->dropIndex('survey_responses_status_idx');
            $table->dropIndex('survey_responses_department_idx');
        });

        // Tasks indexes
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_institution_status_idx');
            $table->dropIndex('tasks_deadline_idx');
            $table->dropIndex('tasks_priority_idx');
            $table->dropIndex('tasks_assigned_to_idx');
            $table->dropIndex('tasks_created_by_idx');
            $table->dropIndex('tasks_category_status_idx');
        });

        // Documents indexes
        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex('documents_institution_category_idx');
            $table->dropIndex('documents_type_size_idx');
            $table->dropIndex('documents_uploaded_by_idx');
            $table->dropIndex('documents_access_level_idx');
        });

        // Notifications indexes
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_recipient_read_date_idx');
            $table->dropIndex('notifications_type_idx');
        });

        // Departments indexes
        Schema::table('departments', function (Blueprint $table) {
            $table->dropIndex('departments_institution_type_idx');
            $table->dropIndex('departments_parent_idx');
        });

        // Activity logs indexes (if exists)
        if (Schema::hasTable('activity_logs')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                $table->dropIndex('activity_logs_user_date_idx');
                $table->dropIndex('activity_logs_action_idx');
                $table->dropIndex('activity_logs_subject_idx');
            });
        }

        // Assessment related indexes
        if (Schema::hasTable('assessment_entries')) {
            Schema::table('assessment_entries', function (Blueprint $table) {
                $table->dropIndex('assessment_entries_student_type_idx');
                $table->dropIndex('assessment_entries_institution_date_idx');
            });
        }

        if (Schema::hasTable('attendance_records')) {
            Schema::table('attendance_records', function (Blueprint $table) {
                $table->dropIndex('attendance_records_student_date_idx');
                $table->dropIndex('attendance_records_institution_date_idx');
                $table->dropIndex('attendance_records_status_idx');
            });
        }
    }
};
