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
        Schema::create('schedule_generation_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('institution_id');
            $table->json('working_days')->default('[1,2,3,4,5]'); // Monday-Friday default
            $table->integer('daily_periods')->default(8); // 8 periods per day
            $table->integer('period_duration')->default(45); // 45 minutes per period
            $table->json('break_periods')->default('[3,6]'); // After 3rd and 6th period
            $table->integer('lunch_break_period')->nullable(); // After which period
            $table->time('first_period_start')->default('08:00');
            $table->integer('break_duration')->default(10); // 10 minute breaks
            $table->integer('lunch_duration')->default(60); // 60 minute lunch
            $table->json('generation_preferences')->nullable(); // JSON preferences
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('institution_id')->references('id')->on('institutions')->onDelete('cascade');
            $table->index('institution_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_generation_settings');
    }
};
