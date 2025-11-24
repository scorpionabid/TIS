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
        Schema::table('survey_responses', function (Blueprint $table) {
            // Composite index for survey + institution + status (most common query)
            $table->index(['survey_id', 'institution_id', 'status'], 'idx_survey_responses_survey_inst_status');

            // Index for approval filtering
            $table->index(['survey_id', 'status', 'submitted_at'], 'idx_survey_responses_approval_filter');

            // Index for institution-based filtering (600+ institutions)
            $table->index(['institution_id', 'status', 'submitted_at'], 'idx_survey_responses_inst_filter');

            // Index for date-based filtering
            $table->index(['submitted_at', 'status'], 'idx_survey_responses_date_status');

            // Index for respondent tracking
            $table->index(['respondent_id', 'survey_id'], 'idx_survey_responses_respondent');
        });

        Schema::table('data_approval_requests', function (Blueprint $table) {
            // Composite index for approval requests by type and status
            $table->index(['approvalable_type', 'approvalable_id', 'current_status'], 'idx_approval_requests_poly_status');

            // Index for institution-based approval filtering
            $table->index(['institution_id', 'current_status', 'current_approval_level'], 'idx_approval_requests_inst_level');

            // Index for workflow-based filtering
            $table->index(['workflow_id', 'current_status', 'submitted_at'], 'idx_approval_requests_workflow');

            // Index for deadline tracking
            $table->index(['current_status', 'deadline'], 'idx_approval_requests_deadline');

            // Index for submitted_by tracking
            $table->index(['submitted_by', 'current_status'], 'idx_approval_requests_submitter');
        });

        Schema::table('approval_actions', function (Blueprint $table) {
            // Index for approval request actions timeline
            $table->index(['approval_request_id', 'action_taken_at'], 'idx_approval_actions_timeline');

            // Index for approver actions tracking
            $table->index(['approver_id', 'action', 'action_taken_at'], 'idx_approval_actions_approver');

            // Index for approval level tracking
            $table->index(['approval_level', 'action', 'action_taken_at'], 'idx_approval_actions_level');
        });

        Schema::table('institutions', function (Blueprint $table) {
            // Index for hierarchy-based queries (region → sector → school)
            $table->index(['parent_id', 'type', 'level'], 'idx_institutions_hierarchy');

            // Index for type-based filtering
            $table->index(['type', 'level', 'id'], 'idx_institutions_type_level');

            // Index for name search (partial match support)
            $table->index(['name', 'type'], 'idx_institutions_name_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('survey_responses', function (Blueprint $table) {
            $table->dropIndex('idx_survey_responses_survey_inst_status');
            $table->dropIndex('idx_survey_responses_approval_filter');
            $table->dropIndex('idx_survey_responses_inst_filter');
            $table->dropIndex('idx_survey_responses_date_status');
            $table->dropIndex('idx_survey_responses_respondent');
        });

        Schema::table('data_approval_requests', function (Blueprint $table) {
            $table->dropIndex('idx_approval_requests_poly_status');
            $table->dropIndex('idx_approval_requests_inst_level');
            $table->dropIndex('idx_approval_requests_workflow');
            $table->dropIndex('idx_approval_requests_deadline');
            $table->dropIndex('idx_approval_requests_submitter');
        });

        Schema::table('approval_actions', function (Blueprint $table) {
            $table->dropIndex('idx_approval_actions_timeline');
            $table->dropIndex('idx_approval_actions_approver');
            $table->dropIndex('idx_approval_actions_level');
        });

        Schema::table('institutions', function (Blueprint $table) {
            $table->dropIndex('idx_institutions_hierarchy');
            $table->dropIndex('idx_institutions_type_level');
            $table->dropIndex('idx_institutions_name_type');
        });
    }
};
