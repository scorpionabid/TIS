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
        Schema::create('time_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            
            // Time slot identification
            $table->string('name')->comment('e.g., "1st Period", "Recess", "Lunch"');
            $table->string('code', 10)->nullable()->comment('Short code like "P1", "REC", "LUN"');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('duration_minutes');
            
            // Slot classification
            $table->enum('slot_type', [
                'class',        // Regular class period
                'break',        // Short break between classes
                'lunch',        // Lunch break
                'assembly',     // Morning assembly/gathering
                'activity',     // Extracurricular activities
                'exam',         // Exam periods
                'preparation'   // Teacher preparation time
            ])->default('class');
            
            // Day and scheduling
            $table->json('applicable_days')->comment('Array of days: [1,2,3,4,5] for Mon-Fri');
            $table->integer('order_index')->default(0)->comment('Order within the day');
            
            // Configuration
            $table->boolean('is_active')->default(true);
            $table->boolean('is_teaching_period')->default(true)->comment('Can classes be scheduled in this slot?');
            $table->boolean('allow_conflicts')->default(false)->comment('Allow overlapping sessions?');
            
            // Metadata for additional configuration
            $table->json('metadata')->nullable()->comment('Additional slot configuration');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['institution_id', 'is_active']);
            $table->index(['start_time', 'end_time']);
            $table->index(['slot_type', 'is_active']);
            $table->index(['order_index']);
            
            // Unique constraint for same institution time periods
            $table->unique(['institution_id', 'start_time', 'end_time'], 'unique_institution_time_slot');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_slots');
    }
};