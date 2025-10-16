<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Fix: Add class_level to unique constraint
     * Old constraint: unique(['name', 'academic_year_id', 'institution_id'])
     * New constraint: unique(['name', 'class_level', 'academic_year_id', 'institution_id'])
     *
     * This allows:
     * - 1-A and 2-A in same institution/year ✅
     * - 1-A and 1-B in same institution/year ✅
     * - But prevents duplicate 1-A in same institution/year ❌
     */
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Drop old unique constraint
            $table->dropUnique(['name', 'academic_year_id', 'institution_id']);

            // Add new unique constraint with class_level
            $table->unique(['name', 'class_level', 'academic_year_id', 'institution_id'], 'grades_unique_per_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Drop new constraint
            $table->dropUnique('grades_unique_per_level');

            // Restore old constraint
            $table->unique(['name', 'academic_year_id', 'institution_id']);
        });
    }
};
