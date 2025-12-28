<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Class Academic Results - Sinif üzrə orta bal (0-100)
     * Multiple classes per year -> average is calculated
     */
    public function up(): void
    {
        Schema::create('class_academic_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->integer('grade')->comment('Grade: 1-11');
            $table->decimal('avg_score', 5, 2)->comment('Average score 0-100');
            $table->timestamps();

            // Unique: One result per teacher+year+grade
            $table->unique(['teacher_id', 'academic_year_id', 'grade'], 'unique_class_result');

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
        Schema::dropIfExists('class_academic_results');
    }
};
