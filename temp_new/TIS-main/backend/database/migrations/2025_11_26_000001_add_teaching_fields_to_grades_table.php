<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds teaching-related fields to grades table:
     * - teaching_language: Language of instruction (Azerbaijani, Russian, Georgian, English)
     * - teaching_week: Teaching week type (5-day or 6-day week)
     */
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Teaching language: azərbaycan (default), rus, gürcü, ingilis
            $table->string('teaching_language', 20)
                ->default('azərbaycan')
                ->nullable()
                ->after('education_program')
                ->comment('Tədris dili: azərbaycan, rus, gürcü, ingilis');

            // Teaching week: 6_günlük (default), 5_günlük
            $table->string('teaching_week', 10)
                ->default('6_günlük')
                ->nullable()
                ->after('teaching_language')
                ->comment('Tədris həftəsi: 5_günlük, 6_günlük');

            // Add index for filtering by teaching language
            $table->index('teaching_language');
            $table->index('teaching_week');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropIndex(['teaching_language']);
            $table->dropIndex(['teaching_week']);
            $table->dropColumn(['teaching_language', 'teaching_week']);
        });
    }
};
