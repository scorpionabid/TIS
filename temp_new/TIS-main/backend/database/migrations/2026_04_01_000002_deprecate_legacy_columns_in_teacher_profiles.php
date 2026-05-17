<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * teacher_profiles cədvəlindəki köhnə (legacy) varchar sütunları deprecate et.
     *
     * KÖHNƏ → YENİ:
     *   school  (varchar)  → institution_id (FK: institutions.id)
     *   subject (varchar)  → subject_id     (FK: subjects.id)
     *
     * Mövcud məlumatlar saxlanılır (nullable olaraq qalır).
     * Yeni məlumat bu sütunlara yazılmamalıdır — `institution_id` / `subject_id` istifadə edin.
     */
    public function up(): void
    {
        Schema::table('teacher_profiles', function (Blueprint $table) {
            // Köhnə sütunları nullable et (mövcud data itməsin)
            // NOT: Sütunlar tam silinmir, çünki köhnə kod hələ istifadə edir.
            // TODO: Növbəti versiyada bu sütunlar tam silinəcək.
            $table->string('school', 191)->nullable()->change();
            $table->string('subject', 191)->nullable()->change();
        });
    }

    /**
     * Rollback: dəyişikliyi geri al.
     */
    public function down(): void
    {
        Schema::table('teacher_profiles', function (Blueprint $table) {
            $table->string('school', 191)->nullable()->change();
            $table->string('subject', 191)->nullable()->change();
        });
    }
};
