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
        Schema::create('rating_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');

            // Weight configuration
            $table->decimal('task_weight', 3, 2)->default(0.40); // Task completion weight
            $table->decimal('survey_weight', 3, 2)->default(0.60); // Survey responses weight
            $table->decimal('manual_weight', 3, 2)->default(0.00); // Manual adjustment weight

            // Calculation method
            $table->string('calculation_method')->default('automatic'); // automatic, manual, hybrid

            // Configuration data
            $table->json('config')->nullable(); // Additional configuration settings

            // Timestamps
            $table->timestamps();

            // Indexes
            $table->unique(['institution_id', 'academic_year_id']);
            $table->index(['calculation_method']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rating_configs');
    }
};
