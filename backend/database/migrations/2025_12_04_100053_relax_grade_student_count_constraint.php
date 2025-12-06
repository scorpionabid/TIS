<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE grades DROP CONSTRAINT IF EXISTS check_student_count_sum');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE grades DROP CONSTRAINT IF EXISTS check_student_count_sum');

        DB::statement('
            ALTER TABLE grades
            ADD CONSTRAINT check_student_count_sum
            CHECK (
                COALESCE(student_count, 0) =
                COALESCE(male_student_count, 0) + COALESCE(female_student_count, 0)
            )
        ');
    }
};
