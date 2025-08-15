<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('surveys', function (Blueprint $table) {
            $table->id();
            $table->string('title', 300);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->json('target_institutions')->default('[]');
            $table->json('target_departments')->default('[]');
            $table->json('questions')->default('{}');
            $table->json('settings')->default('{}');
            $table->timestamp('deadline')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_approval')->default(false);
            $table->boolean('allow_partial_save')->default(true);
            $table->integer('max_responses_per_institution')->default(1);
            $table->foreignId('template_id')->nullable()->constrained('survey_templates');
            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surveys');
    }
};