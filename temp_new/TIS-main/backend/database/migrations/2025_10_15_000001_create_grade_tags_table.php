<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates grade_tags table for flexible categorization of grade types.
     * Supports 70+ variations like "Lisey Texniki", "Gimnaziya Humanitar", etc.
     */
    public function up(): void
    {
        Schema::create('grade_tags', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100); // e.g., "Lisey", "Texniki", "Avar dili"
            $table->string('name_en', 100)->nullable(); // English translation for future use
            $table->string('category', 50); // 'school_type', 'language', 'specialization', etc.
            $table->text('description')->nullable();
            $table->string('color', 20)->nullable(); // UI color code (e.g., 'blue', '#4F46E5')
            $table->string('icon', 50)->nullable(); // Icon name for UI
            $table->integer('sort_order')->default(0); // Display ordering
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->default('{}'); // Flexible additional data
            $table->timestamps();

            // Indexes
            $table->index('category');
            $table->index('is_active');
            $table->index('sort_order');
            $table->unique(['name', 'category']); // Same name allowed in different categories
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grade_tags');
    }
};
