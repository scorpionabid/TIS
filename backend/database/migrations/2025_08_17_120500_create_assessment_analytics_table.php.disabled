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
        Schema::create('assessment_analytics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->foreignId('assessment_type_id')->nullable()->constrained()->onDelete('cascade');
            $table->date('analysis_date');
            $table->enum('scope', ['institution', 'region', 'district', 'subject', 'grade'])->default('institution');
            $table->string('scope_value')->nullable(); // region_id, district_name, subject_name, grade_level
            $table->integer('total_assessments');
            $table->integer('total_students');
            $table->decimal('average_score', 5, 2);
            $table->decimal('median_score', 5, 2)->nullable();
            $table->decimal('highest_score', 5, 2)->nullable();
            $table->decimal('lowest_score', 5, 2)->nullable();
            $table->decimal('standard_deviation', 5, 2)->nullable();
            $table->json('score_distribution'); // ranges and counts
            $table->json('performance_grades'); // excellent, good, average, poor counts
            $table->json('trend_data')->nullable(); // comparison with previous periods
            $table->json('benchmark_comparison')->nullable(); // comparison with regional/national averages
            $table->timestamps();

            // Indexes
            $table->index(['institution_id', 'analysis_date']);
            $table->index(['assessment_type_id', 'analysis_date']);
            $table->index(['scope', 'scope_value', 'analysis_date']);
            $table->unique(['institution_id', 'assessment_type_id', 'analysis_date', 'scope', 'scope_value'], 'unique_analytics_record');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_analytics');
    }
};