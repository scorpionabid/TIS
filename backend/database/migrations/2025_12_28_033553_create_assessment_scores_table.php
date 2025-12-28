<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Assessment Scores - Sertifikasiya/MİQ/Diaqnostik (ən son nəticə)
     */
    public function up(): void
    {
        Schema::create('assessment_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->enum('assessment_type', ['sertifikasiya', 'MIQ', 'diaqnostik'])->comment('Assessment type');
            $table->date('assessment_date')->comment('Assessment date');
            $table->decimal('score', 8, 2)->comment('Raw score');
            $table->decimal('max_score', 8, 2)->default(100)->comment('Maximum possible score');
            $table->decimal('normalized_score', 5, 2)->nullable()->comment('Normalized to 0-100');
            $table->timestamps();

            // Indexes
            $table->index('teacher_id');
            $table->index(['teacher_id', 'assessment_type']);
            $table->index('assessment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_scores');
    }
};
