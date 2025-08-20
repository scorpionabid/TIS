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
        Schema::table('surveys', function (Blueprint $table) {
            // Update table to match the documented structure
            $table->string('survey_type', 50)->default('form')->after('status'); // 'form', 'poll', 'assessment', 'feedback'
            $table->boolean('is_anonymous')->default(false)->after('survey_type');
            $table->boolean('allow_multiple_responses')->default(false)->after('is_anonymous');
            $table->renameColumn('questions', 'structure');
            $table->timestamp('start_date')->nullable()->after('structure');
            $table->timestamp('end_date')->nullable()->after('start_date');
            $table->timestamp('archived_at')->nullable()->after('published_at');
            $table->integer('response_count')->default(0)->after('archived_at');
            $table->integer('completion_threshold')->nullable()->after('response_count'); // percentage required for completion
            $table->renameColumn('settings', 'metadata');
            
            // Remove columns that don't match the design (skip template_id due to foreign key constraint)
            $table->dropColumn(['deadline', 'requires_approval', 'allow_partial_save', 'max_responses_per_institution']);
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('surveys', function (Blueprint $table) {
            // Reverse the changes
            $table->dropColumn(['survey_type', 'is_anonymous', 'allow_multiple_responses', 'start_date', 'end_date', 'archived_at', 'response_count', 'completion_threshold']);
            $table->renameColumn('structure', 'questions');
            $table->renameColumn('metadata', 'settings');
            
            // Add back the removed columns
            $table->timestamp('deadline')->nullable();
            $table->boolean('requires_approval')->default(false);
            $table->boolean('allow_partial_save')->default(true);
            $table->integer('max_responses_per_institution')->default(1);
            $table->foreignId('template_id')->nullable()->constrained('survey_templates');
        });
        
    }
};