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
        Schema::table('assessment_type_institutions', function (Blueprint $table) {
            $table->foreignId('assessment_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->date('assigned_date')->default(now());
            $table->date('due_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('notification_settings')->nullable();
            $table->foreignId('assigned_by')->constrained('users')->onDelete('cascade');
            $table->text('notes')->nullable();
            
            // Unique constraint
            $table->unique(['assessment_type_id', 'institution_id'], 'unique_assessment_institution');
            
            // Indexes
            $table->index(['institution_id', 'is_active']);
            $table->index(['assessment_type_id', 'due_date']);
            $table->index('assigned_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessment_type_institutions', function (Blueprint $table) {
            $table->dropForeign(['assessment_type_id']);
            $table->dropForeign(['institution_id']);
            $table->dropForeign(['assigned_by']);
            $table->dropUnique('unique_assessment_institution');
            $table->dropIndex(['institution_id', 'is_active']);
            $table->dropIndex(['assessment_type_id', 'due_date']);
            $table->dropIndex(['assigned_date']);
            $table->dropColumn([
                'assessment_type_id', 
                'institution_id', 
                'assigned_date', 
                'due_date', 
                'is_active', 
                'notification_settings', 
                'assigned_by', 
                'notes'
            ]);
        });
    }
};