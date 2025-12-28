<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Rating Results - Hesablanmış total score + breakdown + ranks
     */
    public function up(): void
    {
        Schema::create('rating_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->decimal('total_score', 8, 2)->comment('Total calculated score (0-100+bonus)');
            $table->json('breakdown')->nullable()->comment('Breakdown by components and years (JSON)');
            $table->integer('rank_school')->nullable()->comment('Rank within school');
            $table->integer('rank_district')->nullable()->comment('Rank within district');
            $table->integer('rank_region')->nullable()->comment('Rank within region');
            $table->integer('rank_subject')->nullable()->comment('Rank by subject');
            $table->timestamp('calculated_at')->nullable()->comment('When rating was calculated');
            $table->timestamps();

            // Unique: One rating per teacher per year
            $table->unique(['teacher_id', 'academic_year_id'], 'unique_teacher_year_rating');

            // Indexes
            $table->index('teacher_id');
            $table->index('academic_year_id');
            $table->index('total_score');
            $table->index(['teacher_id', 'total_score']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rating_results');
    }
};
