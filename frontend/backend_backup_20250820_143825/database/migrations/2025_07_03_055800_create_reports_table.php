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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->foreignId('creator_id')->constrained('users');
            $table->string('report_type', 50); // 'survey_analysis', 'academic_performance', etc.
            $table->json('query_parameters'); // Filter and parameters for generating the report
            $table->json('data_sources'); // Reference to source data
            $table->json('visualization_config')->nullable(); // Chart and visual configuration
            $table->string('access_level', 20)->default('private'); // 'private', 'institution', 'department', 'public'
            $table->string('format', 20)->default('web'); // 'web', 'pdf', 'excel', 'api'
            $table->string('schedule', 100)->nullable(); // Cron expression for scheduled reports
            $table->timestamp('last_generated_at')->nullable();
            $table->timestamp('expiration_date')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->json('metadata')->default('{}');
            $table->timestamps();

            $table->index('creator_id');
            $table->index('report_type');
            $table->index('access_level');
            $table->index('last_generated_at');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};