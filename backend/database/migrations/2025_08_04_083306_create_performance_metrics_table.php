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
        Schema::create('performance_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('teacher_evaluations')->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            
            // Metric identification
            $table->string('metric_type'); // student_performance, attendance, lesson_quality, engagement, innovation, etc.
            $table->string('metric_name');
            
            // Metric values
            $table->decimal('metric_value', 10, 2);
            $table->decimal('target_value', 10, 2);
            $table->string('unit_of_measure', 50);
            
            // Measurement details
            $table->string('measurement_period', 100)->nullable();
            $table->string('data_source', 200)->nullable();
            $table->string('calculation_method', 200)->nullable();
            $table->decimal('weight', 5, 2)->nullable(); // Weight in overall evaluation
            $table->decimal('score', 5, 2)->nullable(); // Calculated score based on metric
            
            // Analysis data
            $table->json('benchmark_comparison')->nullable(); // Comparison with benchmarks
            $table->json('trend_analysis')->nullable(); // Historical trend data
            $table->string('achievement_level')->nullable(); // exceeds, meets, approaches, below, significantly_below
            
            // Additional information
            $table->text('notes')->nullable();
            $table->json('supporting_evidence')->nullable(); // Documents, links, etc.
            $table->json('improvement_suggestions')->nullable(); // Suggestions for improvement
            $table->json('metadata')->nullable(); // Additional metadata
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['evaluation_id', 'metric_type']);
            $table->index(['teacher_id', 'metric_type']);
            $table->index(['metric_type', 'achievement_level']);
            $table->index(['created_at', 'metric_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('performance_metrics');
    }
};
