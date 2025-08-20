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
        Schema::create('report_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('report_type', ['overview', 'institutional', 'survey', 'user_activity']);
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'quarterly']);
            $table->enum('format', ['csv', 'json', 'pdf']);
            $table->json('recipients'); // Email addresses
            $table->json('filters')->nullable(); // Report filters
            $table->time('time'); // Time to run
            $table->tinyInteger('day_of_week')->nullable(); // 0-6, Sunday = 0
            $table->tinyInteger('day_of_month')->nullable(); // 1-31
            $table->timestamp('next_run')->nullable();
            $table->timestamp('last_run')->nullable();
            $table->enum('status', ['active', 'paused', 'disabled'])->default('active');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['status', 'next_run']);
            $table->index('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_schedules');
    }
};
