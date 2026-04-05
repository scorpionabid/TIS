<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 4 cədvələ teacher_profile_id FK əlavə edilir:
     * - teacher_certifications
     * - teacher_professional_developments
     * - teacher_availability
     * - teacher_evaluations
     *
     * Məqsəd: Bu cədvəllər əvvəllər yalnız users(id)-ə bağlı idi.
     * teacher_profiles(id)-ə FK əlavə etmək data bütövlüyünü təmin edir.
     */
    public function up(): void
    {
        // 1. teacher_certifications
        Schema::table('teacher_certifications', function (Blueprint $table) {
            $table->foreignId('teacher_profile_id')
                ->nullable()
                ->after('teacher_id')
                ->constrained('teacher_profiles')
                ->nullOnDelete();
        });

        // 2. teacher_professional_developments
        Schema::table('teacher_professional_developments', function (Blueprint $table) {
            $table->foreignId('teacher_profile_id')
                ->nullable()
                ->after('teacher_id')
                ->constrained('teacher_profiles')
                ->nullOnDelete();
        });

        // 3. teacher_availability
        Schema::table('teacher_availability', function (Blueprint $table) {
            $table->foreignId('teacher_profile_id')
                ->nullable()
                ->after('teacher_id')
                ->constrained('teacher_profiles')
                ->nullOnDelete();
        });

        // 4. teacher_evaluations
        Schema::table('teacher_evaluations', function (Blueprint $table) {
            $table->foreignId('teacher_profile_id')
                ->nullable()
                ->after('teacher_id')
                ->constrained('teacher_profiles')
                ->nullOnDelete();
        });
    }

    /**
     * Rollback: əlavə edilən teacher_profile_id sütunlarını sil.
     */
    public function down(): void
    {
        Schema::table('teacher_certifications', function (Blueprint $table) {
            $table->dropForeign(['teacher_profile_id']);
            $table->dropColumn('teacher_profile_id');
        });

        Schema::table('teacher_professional_developments', function (Blueprint $table) {
            $table->dropForeign(['teacher_profile_id']);
            $table->dropColumn('teacher_profile_id');
        });

        Schema::table('teacher_availability', function (Blueprint $table) {
            $table->dropForeign(['teacher_profile_id']);
            $table->dropColumn('teacher_profile_id');
        });

        Schema::table('teacher_evaluations', function (Blueprint $table) {
            $table->dropForeign(['teacher_profile_id']);
            $table->dropColumn('teacher_profile_id');
        });
    }
};
