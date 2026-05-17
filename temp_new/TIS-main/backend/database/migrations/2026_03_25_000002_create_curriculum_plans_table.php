<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('curriculum_plans', function (Blueprint $col) {
            $col->id();
            $col->foreignId('institution_id')->constrained()->onDelete('cascade');
            $col->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $col->integer('class_level'); // 0-11
            $col->foreignId('subject_id')->constrained()->onDelete('cascade');
            $col->string('education_type'); // umumi, ferdi, evde, xususi
            $col->decimal('hours', 4, 1)->default(0);
            $col->boolean('is_extra')->default(false); // For Dərsdənkənar etc.
            $col->timestamps();

            // Unique constraint to prevent duplicate entries for the same subject/level/year/type
            $col->unique(['institution_id', 'academic_year_id', 'class_level', 'subject_id', 'education_type', 'is_extra'], 'curriculum_plan_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('curriculum_plans');
    }
};
