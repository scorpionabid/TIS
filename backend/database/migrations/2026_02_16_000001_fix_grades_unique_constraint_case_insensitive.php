<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fix: Grades UNIQUE constraint-i case-insensitive et.
     *
     * Problem: "a" və "A" fərqli sinif kimi yaranır.
     * Həll: LOWER(name) ilə unique index yaradılır.
     * Əlavə: Mövcud data UPPER ilə normalize edilir.
     */
    public function up(): void
    {
        // Əvvəlcə mövcud datanı normalize et
        DB::statement("UPDATE grades SET name = UPPER(TRIM(name)) WHERE name != UPPER(TRIM(name))");

        // Köhnə case-sensitive constraint-i sil
        Schema::table('grades', function ($table) {
            $table->dropUnique('grades_unique_per_level');
        });

        // Yeni case-insensitive unique index yarat
        DB::statement('
            CREATE UNIQUE INDEX grades_unique_per_level
            ON grades (LOWER(name), class_level, academic_year_id, institution_id)
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS grades_unique_per_level');

        Schema::table('grades', function ($table) {
            $table->unique(['name', 'class_level', 'academic_year_id', 'institution_id'], 'grades_unique_per_level');
        });
    }
};
