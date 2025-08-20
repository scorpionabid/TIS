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
        Schema::create('student_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('grade_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            
            // Enrollment details
            $table->date('enrollment_date');
            $table->string('student_number')->unique()->comment('School-specific student ID');
            $table->enum('enrollment_status', [
                'active',           // Currently enrolled
                'inactive',         // Temporarily inactive
                'transferred_out',  // Transferred to another school
                'transferred_in',   // Transferred from another school
                'graduated',        // Completed grade
                'dropped',          // Dropped out
                'suspended',        // Temporarily suspended
                'expelled'          // Permanently removed
            ])->default('active');
            
            $table->enum('enrollment_type', [
                'regular',          // Regular enrollment
                'transfer',         // Transfer student
                'special_needs',    // Special education needs
                'gifted',           // Gifted program
                'remedial',         // Remedial support
                'exchange',         // Exchange student
                'international'     // International student
            ])->default('regular');
            
            // Guardian and contact information
            $table->foreignId('primary_guardian_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('secondary_guardian_id')->nullable()->constrained('users')->onDelete('set null');
            $table->json('emergency_contacts')->nullable()->comment('Emergency contact information');
            
            // Student information
            $table->json('medical_information')->nullable()->comment('Medical conditions, allergies, medications');
            $table->json('transportation_info')->nullable()->comment('Bus route, pickup/dropoff details');
            $table->json('special_requirements')->nullable()->comment('Dietary, accessibility, learning needs');
            
            // Academic information
            $table->string('previous_school')->nullable();
            $table->json('previous_grades')->nullable()->comment('Previous academic performance');
            $table->decimal('entrance_score', 5, 2)->nullable()->comment('Entrance examination score');
            
            // Attendance and behavior
            $table->integer('attendance_target_percentage')->default(95)->comment('Expected attendance rate');
            $table->json('behavior_notes')->nullable()->comment('Behavioral observations and interventions');
            
            // Administrative fields
            $table->text('enrollment_notes')->nullable();
            $table->boolean('photo_permission')->default(true)->comment('Permission to use student photos');
            $table->boolean('medical_consent')->default(false)->comment('Medical treatment consent');
            $table->boolean('trip_permission')->default(false)->comment('Field trip permission');
            
            // Dates
            $table->date('expected_graduation_date')->nullable();
            $table->date('withdrawal_date')->nullable();
            $table->string('withdrawal_reason')->nullable();
            
            // Financial information
            $table->decimal('fee_amount', 10, 2)->nullable()->comment('Annual fee amount');
            $table->enum('fee_status', ['paid', 'partial', 'unpaid', 'exempt'])->default('unpaid');
            $table->date('fee_due_date')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['student_id', 'academic_year_id']);
            $table->index(['grade_id', 'enrollment_status']);
            $table->index(['enrollment_status', 'enrollment_date']);
            $table->index(['student_number']);
            $table->index(['enrollment_date']);
            
            // Unique constraint for active enrollment
            $table->unique(
                ['student_id', 'academic_year_id', 'enrollment_status'], 
                'unique_active_enrollment'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_enrollments');
    }
};