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
        Schema::create('assessment_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('category', ['ksq', 'bsq', 'custom'])->default('custom');
            $table->boolean('is_active')->default(true);
            $table->json('criteria')->nullable(); // Qiymətləndirmə meyarları
            $table->integer('max_score')->default(100);
            $table->string('scoring_method')->default('percentage'); // percentage, points, grades
            $table->json('grade_levels')->nullable(); // Hansı sinifler üçün
            $table->json('subjects')->nullable(); // Hansı fənlər üçün
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('institution_id')->nullable(); // null = sistem geneli
            $table->timestamps();

            // Foreign keys
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('institution_id')->references('id')->on('institutions')->onDelete('cascade');

            // Indexes
            $table->index(['category', 'is_active']);
            $table->index(['institution_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_types');
    }
};