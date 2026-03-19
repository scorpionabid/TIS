<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The enhance_grades_table_for_unified_system migration (2025-01-15) runs
 * BEFORE create_grades_table (2025-07-03) in migrate:fresh order and is
 * therefore skipped (hasTable check). This migration adds the missing columns
 * that were supposed to be added by the earlier migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            if (! Schema::hasColumn('grades', 'description')) {
                $table->text('description')->nullable();
            }
            if (! Schema::hasColumn('grades', 'teacher_assigned_at')) {
                $table->timestamp('teacher_assigned_at')->nullable();
            }
            if (! Schema::hasColumn('grades', 'teacher_removed_at')) {
                $table->timestamp('teacher_removed_at')->nullable();
            }
            if (! Schema::hasColumn('grades', 'deactivated_at')) {
                $table->timestamp('deactivated_at')->nullable();
            }
            if (! Schema::hasColumn('grades', 'deactivated_by')) {
                $table->unsignedBigInteger('deactivated_by')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropColumnIfExists(['description', 'teacher_assigned_at', 'teacher_removed_at', 'deactivated_at', 'deactivated_by']);
        });
    }
};
