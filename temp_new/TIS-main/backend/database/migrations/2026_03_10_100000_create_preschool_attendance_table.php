<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preschool_attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_id')->constrained('grades')->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->date('attendance_date');
            $table->unsignedInteger('total_enrolled')->default(0);
            $table->unsignedInteger('present_count')->default(0);
            $table->unsignedInteger('absent_count')->default(0);
            $table->decimal('attendance_rate', 5, 2)->default(0);
            $table->text('notes')->nullable();
            $table->boolean('is_locked')->default(false);
            $table->timestamps();

            $table->unique(['grade_id', 'attendance_date'], 'pa_grade_date_unique');
            $table->index(['institution_id', 'attendance_date'], 'pa_inst_date_idx');
            $table->index('attendance_date', 'pa_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('preschool_attendance');
    }
};
