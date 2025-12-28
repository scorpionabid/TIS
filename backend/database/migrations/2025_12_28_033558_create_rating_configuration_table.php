<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Rating Configuration - RegionAdmin konfiqurasiya edir
     * Component weights, year weights (25/30/45), growth bonus rules
     */
    public function up(): void
    {
        Schema::create('rating_configuration', function (Blueprint $table) {
            $table->id();
            $table->string('component_name', 50)->unique()->comment('Component: academic, lesson_observation, olympiad, assessment, certificate, award');
            $table->decimal('weight', 5, 4)->default(0)->comment('Component weight (0-1, sum should be 1.0)');
            $table->json('year_weights')->nullable()->comment('Year weights JSON: {2022-2023: 0.25, 2023-2024: 0.30, 2024-2025: 0.45}');
            $table->json('growth_bonus_rules')->nullable()->comment('Growth bonus rules JSON');
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->onDelete('set null')->comment('Last updated by user');
            $table->timestamps();

            // Indexes
            $table->index('component_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rating_configuration');
    }
};
