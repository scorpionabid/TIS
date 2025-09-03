<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add indexes for survey_responses table
        Schema::table('survey_responses', function (Blueprint $table) {
            // Composite index for approval queries
            if (!$this->indexExists('survey_responses', 'idx_survey_approval_main')) {
                $table->index(['survey_id', 'status', 'institution_id'], 'idx_survey_approval_main');
            }
            
            // Index for submission date filtering
            if (!$this->indexExists('survey_responses', 'idx_survey_submitted_at')) {
                $table->index(['submitted_at'], 'idx_survey_submitted_at');
            }
            
            // Index for respondent queries
            if (!$this->indexExists('survey_responses', 'idx_survey_respondent_status')) {
                $table->index(['respondent_id', 'status'], 'idx_survey_respondent_status');
            }
        });

        // Add indexes for data_approval_requests table if it exists
        if (Schema::hasTable('data_approval_requests')) {
            Schema::table('data_approval_requests', function (Blueprint $table) {
                if (!$this->indexExists('data_approval_requests', 'idx_approval_status_level')) {
                    $table->index(['current_status', 'current_approval_level'], 'idx_approval_status_level');
                }
                
                if (!$this->indexExists('data_approval_requests', 'idx_approval_institution')) {
                    $table->index(['institution_id', 'current_status'], 'idx_approval_institution');
                }
                
                if (!$this->indexExists('data_approval_requests', 'idx_approval_submitter')) {
                    $table->index(['submitted_by', 'current_status'], 'idx_approval_submitter');
                }
            });
        }

        // Add indexes for approval_actions table if it exists
        if (Schema::hasTable('approval_actions')) {
            Schema::table('approval_actions', function (Blueprint $table) {
                if (!$this->indexExists('approval_actions', 'idx_actions_request_date')) {
                    $table->index(['approval_request_id', 'action_taken_at'], 'idx_actions_request_date');
                }
                
                if (!$this->indexExists('approval_actions', 'idx_actions_approver')) {
                    $table->index(['approver_id', 'action'], 'idx_actions_approver');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('survey_responses', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'idx_survey_approval_main');
            $this->dropIndexIfExists($table, 'idx_survey_submitted_at');
            $this->dropIndexIfExists($table, 'idx_survey_respondent_status');
        });

        if (Schema::hasTable('data_approval_requests')) {
            Schema::table('data_approval_requests', function (Blueprint $table) {
                $this->dropIndexIfExists($table, 'idx_approval_status_level');
                $this->dropIndexIfExists($table, 'idx_approval_institution');
                $this->dropIndexIfExists($table, 'idx_approval_submitter');
            });
        }

        if (Schema::hasTable('approval_actions')) {
            Schema::table('approval_actions', function (Blueprint $table) {
                $this->dropIndexIfExists($table, 'idx_actions_request_date');
                $this->dropIndexIfExists($table, 'idx_actions_approver');
            });
        }
    }

    /**
     * Check if index exists
     */
    private function indexExists(string $table, string $index): bool
    {
        $connection = Schema::getConnection();
        
        if ($connection->getDriverName() === 'sqlite') {
            $indexes = $connection->select("PRAGMA index_list({$table})");
            foreach ($indexes as $indexInfo) {
                if ($indexInfo->name === $index) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Drop index if exists
     */
    private function dropIndexIfExists(Blueprint $table, string $index): void
    {
        if ($this->indexExists($table->getTable(), $index)) {
            $table->dropIndex($index);
        }
    }
};
