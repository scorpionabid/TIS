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
        Schema::create('region_performance_cache', function (Blueprint $table) {
            $table->id();
            $table->foreignId('region_id')->constrained('institutions')->onDelete('cascade');
            $table->string('cache_key')->unique();
            $table->date('data_date');
            $table->integer('total_institutions');
            $table->integer('total_assessments');
            $table->decimal('average_score', 5, 2);
            $table->decimal('trend_percentage', 5, 2)->default(0);
            $table->json('performance_distribution'); // excellent, good, average, poor counts
            $table->json('top_performers'); // top 10 institutions
            $table->json('low_performers'); // bottom 10 institutions
            $table->json('monthly_trends'); // last 12 months data
            $table->json('subject_performance'); // performance by subject
            $table->json('district_breakdown')->nullable(); // performance by district
            $table->timestamp('expires_at');
            $table->timestamps();

            // Indexes
            $table->index(['region_id', 'data_date']);
            $table->index('cache_key');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('region_performance_cache');
    }
};