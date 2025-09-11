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
        Schema::table('teaching_loads', function (Blueprint $table) {
            $table->boolean('is_scheduled')->default(false);
            $table->unsignedBigInteger('last_schedule_id')->nullable();
            $table->timestamp('last_scheduled_at')->nullable();
            $table->json('scheduling_constraints')->nullable(); // Teacher preferences, time constraints
            $table->integer('preferred_consecutive_hours')->default(2);
            $table->json('preferred_time_slots')->nullable(); // JSON array of preferred times
            $table->json('unavailable_periods')->nullable(); // JSON array of unavailable periods
            
            $table->foreign('last_schedule_id')->references('id')->on('schedules')->onDelete('set null');
            $table->index(['is_scheduled', 'last_schedule_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teaching_loads', function (Blueprint $table) {
            $table->dropForeign(['last_schedule_id']);
            $table->dropIndex(['is_scheduled', 'last_schedule_id']);
            $table->dropColumn([
                'is_scheduled',
                'last_schedule_id', 
                'last_scheduled_at',
                'scheduling_constraints',
                'preferred_consecutive_hours',
                'preferred_time_slots',
                'unavailable_periods'
            ]);
        });
    }
};
