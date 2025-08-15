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
        Schema::create('indicators', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->string('category', 100);
            $table->string('data_type', 50); // 'integer', 'decimal', 'percentage', 'text', etc.
            $table->string('unit', 50)->nullable(); // 'students', 'hours', 'points', etc.
            $table->text('calculation_method')->nullable();
            $table->string('data_source', 100)->nullable();
            $table->string('frequency', 50)->nullable(); // 'daily', 'monthly', 'quarterly', 'annual'
            $table->json('benchmark')->nullable(); // Benchmark values for comparison
            $table->json('metadata')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('code');
            $table->index('category');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('indicators');
    }
};