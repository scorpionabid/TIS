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
        Schema::create('ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            
            // Period and scoring
            $table->string('period', 50); // monthly, quarterly, yearly
            $table->decimal('overall_score', 5, 2)->nullable();
            $table->decimal('task_score', 5, 2)->nullable(); // Task completion score
            $table->decimal('survey_score', 5, 2)->nullable(); // Survey responses score
            $table->decimal('manual_score', 5, 2)->nullable(); // Manual adjustment score
            
            // Status and metadata
            $table->string('status')->default('draft'); // draft, published, archived
            $table->json('metadata')->nullable(); // Additional rating data
            
            // Timestamps
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['user_id', 'academic_year_id']);
            $table->index(['institution_id', 'period']);
            $table->index(['status', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
