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
        Schema::create('schedule_template_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('schedule_templates')->onDelete('cascade');
            $table->foreignId('schedule_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->json('usage_context')->nullable();
            $table->decimal('performance_rating', 3, 2)->nullable();
            $table->integer('generation_time')->nullable(); // seconds
            $table->integer('conflicts_resolved')->default(0);
            $table->json('user_feedback')->nullable();
            $table->json('success_metrics')->nullable();
            $table->timestamp('used_at');
            $table->timestamps();

            $table->index(['template_id', 'performance_rating']);
            $table->index(['institution_id', 'used_at']);
            $table->index('performance_rating');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_template_usages');
    }
};
