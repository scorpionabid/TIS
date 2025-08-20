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
        Schema::create('daily_attendance_summary', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('grade_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_term_id')->nullable()->constrained()->onDelete('cascade');
            
            // Date information
            $table->date('attendance_date');
            $table->enum('day_type', [
                'regular',          // Regular school day
                'holiday',          // National/religious holiday
                'weekend',          // Weekend day
                'exam_day',         // Exam day
                'activity_day',     // Special activity day
                'half_day',         // Half day session
                'snow_day',         // Weather closure
                'emergency_closure' // Emergency closure
            ])->default('regular');
            
            // Overall attendance status for the day
            $table->enum('daily_status', [
                'full_present',     // Present for entire day
                'partial_present',  // Present for some periods
                'full_absent',      // Absent entire day
                'excused_absent',   // Excused absence entire day
                'late_arrival',     // Arrived late but stayed
                'early_departure',  // Left early
                'suspended',        // Student suspended
                'not_scheduled'     // No classes scheduled
            ]);
            
            // Time tracking
            $table->time('first_period_start')->nullable();
            $table->time('last_period_end')->nullable();
            $table->time('actual_arrival_time')->nullable();
            $table->time('actual_departure_time')->nullable();
            
            // Statistics
            $table->integer('total_periods_scheduled')->default(0);
            $table->integer('periods_present')->default(0);
            $table->integer('periods_absent')->default(0);
            $table->integer('periods_late')->default(0);
            $table->integer('periods_excused')->default(0);
            
            // Calculated percentages
            $table->decimal('daily_attendance_rate', 5, 2)->default(0.00)->comment('Percentage present for the day');
            $table->integer('total_minutes_scheduled')->default(0);
            $table->integer('minutes_present')->default(0);
            $table->integer('minutes_late')->default(0);
            $table->integer('minutes_absent')->default(0);
            
            // Absence tracking
            $table->text('absence_reason')->nullable();
            $table->boolean('absence_authorized')->default(false);
            $table->foreignId('authorized_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('authorized_at')->nullable();
            
            // Parent communication
            $table->boolean('parent_notified')->default(false);
            $table->timestamp('parent_notified_at')->nullable();
            $table->json('notification_details')->nullable()->comment('SMS, email, call logs');
            $table->boolean('parent_acknowledged')->default(false);
            $table->timestamp('parent_acknowledged_at')->nullable();
            
            // Academic impact
            $table->json('affected_subjects')->nullable()->comment('List of subjects affected by absence');
            $table->boolean('makeup_required')->default(false);
            $table->json('makeup_assignments')->nullable()->comment('Required makeup work');
            
            // Administrative details
            $table->text('daily_notes')->nullable()->comment('Teacher or admin notes');
            $table->json('discipline_incidents')->nullable()->comment('Any behavioral issues');
            $table->foreignId('reported_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('summary_generated_at')->useCurrent();
            
            // Health and safety
            $table->decimal('temperature_check', 4, 1)->nullable()->comment('Daily temperature if required');
            $table->boolean('health_screening_passed')->default(true);
            $table->json('health_notes')->nullable()->comment('Any health observations');
            
            // Transportation
            $table->enum('transportation_status', [
                'normal',           // Normal transportation
                'bus_late',         // Bus delay
                'bus_missed',       // Missed school bus
                'parent_pickup',    // Parent pickup/dropoff
                'walking',          // Student walked
                'bicycle',          // Student cycled
                'absent'            // Student absent
            ])->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['student_id', 'attendance_date']);
            $table->index(['grade_id', 'attendance_date']);
            $table->index(['daily_status', 'attendance_date']);
            $table->index(['academic_year_id', 'academic_term_id']);
            $table->index(['attendance_date', 'day_type']);
            $table->index(['absence_authorized', 'attendance_date']);
            $table->index(['parent_notified', 'attendance_date']);
            
            // Unique constraint for one summary per student per day
            $table->unique([
                'student_id', 'attendance_date'
            ], 'unique_daily_summary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_attendance_summary');
    }
};