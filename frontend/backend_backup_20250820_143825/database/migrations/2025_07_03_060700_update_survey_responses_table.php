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
        Schema::table('survey_responses', function (Blueprint $table) {
            // Add missing columns according to documentation
            $table->foreignId('department_id')->nullable()->constrained('departments')->after('institution_id');
            $table->string('respondent_role', 50)->nullable()->after('respondent_id');
            $table->boolean('is_complete')->default(false)->after('progress_percentage');
            $table->string('ip_address', 45)->nullable()->after('is_complete');
            $table->text('user_agent')->nullable()->after('ip_address');
            $table->timestamp('started_at')->nullable()->after('user_agent');
            $table->json('metadata')->default('{}')->after('rejection_reason');
            
            // Remove columns that don't match the design
            $table->dropColumn(['attachments', 'workflow_history']);
            
            // Update department to be nullable string instead of foreign key
            // (keeping the department column as is since it's already string)
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('survey_responses', function (Blueprint $table) {
            // Reverse the changes
            $table->dropColumn(['department_id', 'respondent_role', 'is_complete', 'ip_address', 'user_agent', 'started_at', 'metadata']);
            
            // Add back removed columns
            $table->json('attachments')->default('[]');
            $table->json('workflow_history')->default('[]');
        });
        
    }
};