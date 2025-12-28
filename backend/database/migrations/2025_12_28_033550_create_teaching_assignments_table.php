<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Teaching Assignments - Eyni ildə müəllimin bir neçə sinfi ola bilər
     */
    public function up(): void
    {
        Schema::create('teaching_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->integer('grade')->comment('Grade: 1-11');
            $table->string('parallel_group', 10)->nullable()->comment('Parallel group: A, B, C, etc.');
            $table->timestamps();

            // Unique constraint: Same teacher can't have same grade+parallel in same year
            $table->unique(['teacher_id', 'academic_year_id', 'grade', 'parallel_group'], 'unique_teaching_assignment');

            // Indexes
            $table->index('teacher_id');
            $table->index('academic_year_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teaching_assignments');
    }
};
