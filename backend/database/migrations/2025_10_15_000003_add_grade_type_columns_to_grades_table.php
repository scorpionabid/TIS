<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds new columns to support:
     * 1. Grade category (optional grouping)
     * 2. Education program type (Ümumi, Xüsusi, Məktəbdə fərdi, Evdə fərdi)
     * 3. Gender-based student count (male/female split)
     */
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Optional grade category for quick filtering (can also use tags)
            $table->string('grade_category', 50)->nullable()->after('specialty');

            // Education program type (ENUM-like with validation)
            $table->string('education_program', 50)->default('umumi')->after('grade_category');

            // Gender-based student counts
            $table->integer('male_student_count')->default(0)->after('student_count');
            $table->integer('female_student_count')->default(0)->after('male_student_count');

            // Indexes
            $table->index('grade_category');
            $table->index('education_program');
        });

        // Add CHECK constraint to ensure sum equals total
        // PostgreSQL syntax
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('
                ALTER TABLE grades
                ADD CONSTRAINT check_student_count_sum
                CHECK (student_count = male_student_count + female_student_count)
            ');
        }

        // SQLite doesn't enforce CHECK constraints the same way, but we add it for documentation
        // The application layer will enforce this validation
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop CHECK constraint first (PostgreSQL)
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE grades DROP CONSTRAINT IF EXISTS check_student_count_sum');
        }

        Schema::table('grades', function (Blueprint $table) {
            $table->dropIndex(['grade_category']);
            $table->dropIndex(['education_program']);
            $table->dropColumn([
                'grade_category',
                'education_program',
                'male_student_count',
                'female_student_count'
            ]);
        });
    }
};
