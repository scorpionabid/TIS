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
        Schema::create('schedule_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('institution_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->enum('template_type', ['system', 'institution', 'generated', 'imported'])->default('institution');
            $table->boolean('is_public')->default(false);
            $table->boolean('is_default')->default(false);
            $table->integer('usage_count')->default(0);
            $table->decimal('success_rate', 3, 2)->default(0.50);
            $table->json('template_data');
            $table->json('generation_settings')->nullable();
            $table->json('constraints')->nullable();
            $table->json('tags')->nullable();
            $table->enum('difficulty_level', ['easy', 'medium', 'hard', 'expert'])->default('medium');
            $table->integer('estimated_generation_time')->default(60); // seconds
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['institution_id', 'template_type']);
            $table->index(['is_public', 'success_rate']);
            $table->index('template_type');
            $table->index('difficulty_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_templates');
    }
};