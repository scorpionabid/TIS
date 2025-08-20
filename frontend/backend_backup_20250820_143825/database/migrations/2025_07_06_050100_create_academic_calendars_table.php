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
        Schema::create('academic_calendars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            
            // Calendar identification
            $table->string('name')->comment('e.g., "2024-2025 School Calendar"');
            $table->enum('calendar_type', [
                'school',       // Regular school calendar
                'exam',         // Examination periods
                'holiday',      // Holiday periods
                'event',        // Special events
                'training'      // Teacher training periods
            ])->default('school');
            
            // Date ranges
            $table->date('start_date');
            $table->date('end_date');
            $table->date('first_semester_start')->nullable();
            $table->date('first_semester_end')->nullable();
            $table->date('second_semester_start')->nullable();
            $table->date('second_semester_end')->nullable();
            
            // Working days configuration
            $table->json('working_days')->default('[1,2,3,4,5]')->comment('Days of week: 1=Monday, 7=Sunday');
            $table->json('working_hours')->nullable()->comment('Daily working hours configuration');
            
            // Holiday and special dates
            $table->json('holidays')->nullable()->comment('Array of holiday dates and descriptions');
            $table->json('special_events')->nullable()->comment('Special events and their dates');
            $table->json('exam_periods')->nullable()->comment('Examination period definitions');
            
            // Calendar rules and constraints
            $table->integer('min_teaching_days')->default(180)->comment('Minimum required teaching days');
            $table->integer('max_daily_periods')->default(8)->comment('Maximum periods per day');
            $table->json('calendar_rules')->nullable()->comment('Additional calendar rules');
            
            // Status and approval
            $table->enum('status', [
                'draft',
                'pending_approval',
                'approved',
                'active',
                'archived'
            ])->default('draft');
            
            $table->boolean('is_default')->default(false)->comment('Default calendar for institution');
            
            // Audit fields
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            // Additional metadata
            $table->json('metadata')->nullable()->comment('Additional calendar configuration');
            $table->text('notes')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['academic_year_id', 'institution_id']);
            $table->index(['calendar_type', 'status']);
            $table->index(['start_date', 'end_date']);
            $table->index(['is_default', 'status']);
            
            // Ensure only one default calendar per institution per year
            $table->unique(
                ['academic_year_id', 'institution_id', 'is_default'], 
                'unique_default_calendar'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('academic_calendars');
    }
};