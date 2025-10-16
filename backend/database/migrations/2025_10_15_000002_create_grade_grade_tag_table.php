<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates pivot table for many-to-many relationship between grades and tags.
     * A grade can have multiple tags (e.g., "Lisey" + "Texniki" + "Rəqəmsal bacarıq").
     */
    public function up(): void
    {
        Schema::create('grade_grade_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_id')->constrained('grades')->onDelete('cascade');
            $table->foreignId('grade_tag_id')->constrained('grade_tags')->onDelete('cascade');
            $table->timestamps();

            // Composite unique constraint - prevent duplicate tag assignments
            $table->unique(['grade_id', 'grade_tag_id'], 'grade_tag_unique');

            // Indexes for performance
            $table->index('grade_id');
            $table->index('grade_tag_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grade_grade_tag');
    }
};
