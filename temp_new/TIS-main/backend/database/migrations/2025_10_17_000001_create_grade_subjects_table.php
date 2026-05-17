<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates grade_subjects table for curriculum management.
     * Links subjects to grades with teaching load and activity types.
     */
    public function up(): void
    {
        Schema::create('grade_subjects', function (Blueprint $table) {
            $table->id();

            // Foreign keys
            $table->foreignId('grade_id')
                ->constrained('grades')
                ->onDelete('cascade');
            $table->foreignId('subject_id')
                ->constrained('subjects')
                ->onDelete('cascade');

            // Həftəlik dərs yükü (weekly teaching load)
            $table->integer('weekly_hours')->default(1); // 1-10 saat

            // Fəaliyyət növləri (Activity types - checkboxes)
            $table->boolean('is_teaching_activity')->default(true);   // Tədris fəaliyyəti
            $table->boolean('is_extracurricular')->default(false);    // Dərsdənkənar məşğələ
            $table->boolean('is_club')->default(false);               // Dərnək

            // Qrup bölünməsi (Group splitting)
            $table->boolean('is_split_groups')->default(false);       // Qrupa bölünür?
            $table->integer('group_count')->default(1);               // Qrup sayı (1-4)
            $table->integer('calculated_hours')->default(1);          // weekly_hours × group_count

            // Əlavə məlumat (Additional info)
            $table->foreignId('teacher_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null'); // Təyin edilmiş müəllim
            $table->text('notes')->nullable(); // Qeydlər

            $table->timestamps();

            // Unique constraint - bir fənn bir sinifdə 1 dəfə
            $table->unique(['grade_id', 'subject_id'], 'grade_subject_unique');

            // Indexes
            $table->index('grade_id');
            $table->index('subject_id');
            $table->index('teacher_id');
            $table->index('is_teaching_activity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grade_subjects');
    }
};
