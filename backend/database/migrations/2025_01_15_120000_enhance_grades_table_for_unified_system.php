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
        // Only run if grades table exists
        if (Schema::hasTable('grades')) {
            Schema::table('grades', function (Blueprint $table) {
                // Add description field for grade details
                if (!Schema::hasColumn('grades', 'description')) {
                    $table->text('description')->nullable()->after('specialty');
                }
                
                // Add teacher assignment tracking
                if (!Schema::hasColumn('grades', 'teacher_assigned_at')) {
                    $table->timestamp('teacher_assigned_at')->nullable()->after('homeroom_teacher_id');
                }
                if (!Schema::hasColumn('grades', 'teacher_removed_at')) {
                    $table->timestamp('teacher_removed_at')->nullable()->after('teacher_assigned_at');
                }
                
                // Add deactivation tracking
                if (!Schema::hasColumn('grades', 'deactivated_at')) {
                    $table->timestamp('deactivated_at')->nullable()->after('is_active');
                }
                if (!Schema::hasColumn('grades', 'deactivated_by')) {
                    $table->unsignedBigInteger('deactivated_by')->nullable()->after('deactivated_at');
                }
            });
            
            // Add foreign key and indexes separately to avoid conflicts
            Schema::table('grades', function (Blueprint $table) {
                // Add foreign key for deactivated_by if it doesn't exist
                $foreignKeys = \DB::select("
                    SELECT COUNT(*) as count 
                    FROM information_schema.key_column_usage 
                    WHERE constraint_name = 'grades_deactivated_by_foreign' 
                    AND table_name = 'grades'
                ");
                
                if (empty($foreignKeys) || $foreignKeys[0]->count == 0) {
                    try {
                        $table->foreign('deactivated_by')->references('id')->on('users');
                    } catch (\Exception $e) {
                        // Foreign key already exists or creation failed
                    }
                }
                
                // Add indexes for better performance (check if they exist first)
                try {
                    $table->index(['institution_id', 'academic_year_id', 'is_active'], 'grades_institution_year_active_idx');
                } catch (\Exception $e) {
                    // Index might already exist
                }
                
                try {
                    $table->index(['class_level', 'is_active'], 'grades_level_active_idx');
                } catch (\Exception $e) {
                    // Index might already exist
                }
                
                try {
                    $table->index(['homeroom_teacher_id'], 'grades_teacher_idx');
                } catch (\Exception $e) {
                    // Index might already exist
                }
                
                try {
                    $table->index(['room_id'], 'grades_room_idx');
                } catch (\Exception $e) {
                    // Index might already exist
                }
                
                try {
                    $table->index(['deactivated_at', 'deactivated_by'], 'grades_deactivation_idx');
                } catch (\Exception $e) {
                    // Index might already exist
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Drop foreign keys first
            $table->dropForeign(['deactivated_by']);
            
            // Drop indexes
            $table->dropIndex('grades_institution_year_active_idx');
            $table->dropIndex('grades_level_active_idx');
            $table->dropIndex('grades_teacher_idx');
            $table->dropIndex('grades_room_idx');
            $table->dropIndex('grades_deactivation_idx');
            
            // Drop columns
            $table->dropColumn([
                'description',
                'teacher_assigned_at',
                'teacher_removed_at',
                'deactivated_at',
                'deactivated_by',
            ]);
        });
    }
};