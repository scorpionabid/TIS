<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audit log FK-larını düzəldir.
 *
 * Əvvəl hamısı CASCADE idi — bu compliance riski yaradırdı:
 * session/column/student/user silinəndə audit trail məhv olurdu.
 *
 * Yeni qaydalar:
 *  - grade_book_session_id → RESTRICT  : audit loqu olan sessiyanı silmək olmaz
 *  - grade_book_column_id  → SET NULL  : sütun silinə bilər, log qalır (column_id=NULL)
 *  - student_id            → SET NULL  : şagird silinə bilər, log qalır (student_id=NULL)
 *  - user_id               → SET NULL  : istifadəçi silinə bilər, log qalır (user_id=NULL)
 */
return new class extends Migration
{
    public function up(): void
    {
        // student_id və grade_book_column_id nullable edilir (SET NULL üçün şərt)
        Schema::table('grade_book_audit_logs', function (Blueprint $table) {
            $table->foreignId('student_id')->nullable()->change();
            $table->foreignId('grade_book_column_id')->nullable()->change();
        });

        // Köhnə CASCADE FK-ları drop et
        Schema::table('grade_book_audit_logs', function (Blueprint $table) {
            $table->dropForeign(['grade_book_session_id']);
            $table->dropForeign(['student_id']);
            $table->dropForeign(['grade_book_column_id']);
            $table->dropForeign(['user_id']);
        });

        // Yeni FK-ları əlavə et
        Schema::table('grade_book_audit_logs', function (Blueprint $table) {
            // Session silinməsi QADAĞANDIR — audit trail məhv olmamalıdır
            $table->foreign('grade_book_session_id')
                ->references('id')->on('grade_book_sessions')
                ->restrictOnDelete();

            // Sütun/şagird/istifadəçi silinəndə NULL qoyulur, log saxlanılır
            $table->foreign('grade_book_column_id')
                ->references('id')->on('grade_book_columns')
                ->nullOnDelete();

            $table->foreign('student_id')
                ->references('id')->on('students')
                ->nullOnDelete();

            $table->foreign('user_id')
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('grade_book_audit_logs', function (Blueprint $table) {
            $table->dropForeign(['grade_book_session_id']);
            $table->dropForeign(['student_id']);
            $table->dropForeign(['grade_book_column_id']);
            $table->dropForeign(['user_id']);
        });

        // Köhnə CASCADE FK-lara qayıt
        Schema::table('grade_book_audit_logs', function (Blueprint $table) {
            $table->foreignId('student_id')->nullable(false)->change();
            $table->foreignId('grade_book_column_id')->nullable(false)->change();

            $table->foreign('grade_book_session_id')
                ->references('id')->on('grade_book_sessions')
                ->cascadeOnDelete();

            $table->foreign('student_id')
                ->references('id')->on('students')
                ->cascadeOnDelete();

            $table->foreign('grade_book_column_id')
                ->references('id')->on('grade_book_columns')
                ->cascadeOnDelete();

            $table->foreign('user_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();
        });
    }
};
