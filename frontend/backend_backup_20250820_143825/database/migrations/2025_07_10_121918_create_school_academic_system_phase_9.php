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
        // 1. Create Subjects Table (if doesn't exist)
        if (!Schema::hasTable('subjects')) {
            Schema::create('subjects', function (Blueprint $table) {
                $table->id();
                $table->string('name', 200);
                $table->string('short_name', 50)->nullable();
                $table->string('code', 20)->unique();
                $table->enum('type', ['mandatory', 'elective', 'additional'])->default('mandatory');
                $table->json('applicable_grades')->nullable();
                $table->integer('default_weekly_hours')->default(1);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->json('metadata')->nullable();
                $table->timestamps();
                
                $table->index(['type', 'is_active']);
                $table->index('code');
            });
        }

        // 2. Create Classes Table (School Organization)
        if (!Schema::hasTable('classes')) {
            Schema::create('classes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('institution_id')->constrained()->onDelete('cascade');
                $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
                $table->string('name', 10); // "7A", "11B", "5C"
                $table->integer('grade_level'); // 1-11
                $table->string('section', 5); // "A", "B", "C", "D"
                $table->integer('max_capacity')->default(30);
                $table->integer('current_enrollment')->default(0);
                $table->enum('status', ['active', 'inactive', 'archived'])->default('active');
                $table->foreignId('class_teacher_id')->nullable()->constrained('users')->onDelete('set null');
                $table->string('classroom_location', 100)->nullable();
                $table->json('schedule_preferences')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
                
                $table->unique(['institution_id', 'academic_year_id', 'grade_level', 'section']);
                $table->index(['institution_id', 'academic_year_id', 'grade_level']);
                $table->index(['status', 'academic_year_id']);
            });
        }

        // 3. Create School Staff Table
        if (!Schema::hasTable('school_staff')) {
            Schema::create('school_staff', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('institution_id')->constrained()->onDelete('cascade');
                $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
                $table->enum('position', ['director', 'deputy_director', 'department_head', 'teacher', 'counselor', 'secretary', 'other'])->default('teacher');
                $table->string('department', 100)->nullable();
                $table->enum('employment_type', ['full_time', 'part_time', 'contract', 'substitute'])->default('full_time');
                $table->date('start_date');
                $table->date('end_date')->nullable();
                $table->enum('status', ['active', 'inactive', 'on_leave', 'terminated'])->default('active');
                $table->json('permissions')->nullable();
                $table->json('workload_allocation')->nullable();
                $table->timestamps();
                
                $table->unique(['user_id', 'institution_id', 'academic_year_id']);
                $table->index(['institution_id', 'academic_year_id', 'position']);
                $table->index(['status', 'position']);
            });
        }

        // 4. Create Teaching Loads Table
        if (!Schema::hasTable('teaching_loads')) {
            Schema::create('teaching_loads', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
                $table->integer('weekly_hours')->default(1);
                $table->integer('total_hours')->nullable();
                $table->json('schedule_slots')->nullable();
                $table->enum('status', ['active', 'inactive', 'completed'])->default('active');
                $table->date('start_date');
                $table->date('end_date')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
                
                $table->unique(['teacher_id', 'class_id', 'subject_id', 'academic_year_id']);
                $table->index(['teacher_id', 'academic_year_id']);
                $table->index(['class_id', 'academic_year_id']);
                $table->index(['subject_id', 'academic_year_id']);
            });
        }

        // 5. Create Class Attendance Table (Class-Level Tracking)
        if (!Schema::hasTable('class_attendance')) {
            Schema::create('class_attendance', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
                $table->date('attendance_date');
                $table->integer('period_number')->default(1);
                $table->time('start_time');
                $table->time('end_time');
                $table->integer('total_students_registered');
                $table->integer('students_present');
                $table->integer('students_absent_excused')->default(0);
                $table->integer('students_absent_unexcused')->default(0);
                $table->integer('students_late')->default(0);
                $table->enum('lesson_status', ['completed', 'cancelled', 'partial', 'substituted'])->default('completed');
                $table->text('notes')->nullable();
                $table->json('attendance_metadata')->nullable();
                $table->enum('approval_status', ['pending', 'approved', 'rejected', 'needs_review'])->default('pending');
                $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();
                
                $table->unique(['class_id', 'subject_id', 'attendance_date', 'period_number']);
                $table->index(['class_id', 'attendance_date']);
                $table->index(['teacher_id', 'attendance_date']);
                $table->index(['approval_status', 'attendance_date']);
            });
        }

        // 6. Create Schedules Table
        if (!Schema::hasTable('schedules')) {
            Schema::create('schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('institution_id')->constrained()->onDelete('cascade');
                $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
                $table->string('name', 200);
                $table->enum('type', ['weekly', 'daily', 'exam', 'special'])->default('weekly');
                $table->enum('status', ['draft', 'pending_approval', 'approved', 'active', 'archived'])->default('draft');
                $table->date('effective_from');
                $table->date('effective_to')->nullable();
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamp('approved_at')->nullable();
                $table->json('schedule_data');
                $table->json('generation_settings')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                
                $table->index(['institution_id', 'academic_year_id', 'status']);
                $table->index(['status', 'effective_from']);
                $table->index(['created_by', 'status']);
            });
        }

        // 7. Create Schedule Slots Table
        if (!Schema::hasTable('schedule_slots')) {
            Schema::create('schedule_slots', function (Blueprint $table) {
                $table->id();
                $table->foreignId('schedule_id')->constrained()->onDelete('cascade');
                $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
                $table->integer('day_of_week'); // 1=Monday, 7=Sunday
                $table->integer('period_number'); // 1,2,3,4,5,6,7,8
                $table->time('start_time');
                $table->time('end_time');
                $table->string('room_location', 100)->nullable();
                $table->enum('slot_type', ['regular', 'exam', 'break', 'special'])->default('regular');
                $table->enum('status', ['active', 'cancelled', 'moved', 'substituted'])->default('active');
                $table->json('metadata')->nullable();
                $table->timestamps();
                
                $table->unique(['schedule_id', 'class_id', 'day_of_week', 'period_number']);
                $table->index(['schedule_id', 'day_of_week', 'period_number']);
                $table->index(['teacher_id', 'day_of_week', 'period_number']);
                $table->index(['class_id', 'day_of_week']);
            });
        }

        // 8. Create Schedule Conflicts Table
        if (!Schema::hasTable('schedule_conflicts')) {
            Schema::create('schedule_conflicts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('schedule_id')->constrained()->onDelete('cascade');
                $table->string('conflict_type', 50);
                $table->enum('severity', ['critical', 'warning', 'minor'])->default('warning');
                $table->json('conflict_details');
                $table->text('description');
                $table->enum('resolution_status', ['unresolved', 'resolved', 'ignored', 'pending'])->default('unresolved');
                $table->foreignId('resolved_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamp('resolved_at')->nullable();
                $table->text('resolution_notes')->nullable();
                $table->timestamps();
                
                $table->index(['schedule_id', 'resolution_status']);
                $table->index(['conflict_type', 'severity']);
                $table->index(['resolution_status', 'severity']);
            });
        }

        // 9. Create Academic Performance Summaries Table
        if (!Schema::hasTable('academic_performance_summaries')) {
            Schema::create('academic_performance_summaries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
                $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
                $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
                $table->string('reporting_period', 50);
                $table->date('period_start');
                $table->date('period_end');
                $table->integer('total_lessons_planned');
                $table->integer('total_lessons_conducted');
                $table->decimal('attendance_rate', 5, 2);
                $table->decimal('completion_rate', 5, 2);
                $table->integer('avg_students_present');
                $table->integer('total_excused_absences');
                $table->integer('total_unexcused_absences');
                $table->json('performance_metrics')->nullable();
                $table->text('summary_notes')->nullable();
                $table->foreignId('generated_by')->constrained('users')->onDelete('cascade');
                $table->timestamps();
                
                $table->unique(['class_id', 'subject_id', 'academic_year_id', 'reporting_period', 'period_start']);
                $table->index(['class_id', 'academic_year_id', 'reporting_period']);
                $table->index(['subject_id', 'academic_year_id', 'reporting_period']);
                $table->index(['reporting_period', 'period_start']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('academic_performance_summaries');
        Schema::dropIfExists('schedule_conflicts');
        Schema::dropIfExists('schedule_slots');
        Schema::dropIfExists('schedules');
        Schema::dropIfExists('class_attendance');
        Schema::dropIfExists('teaching_loads');
        Schema::dropIfExists('school_staff');
        Schema::dropIfExists('classes');
        Schema::dropIfExists('subjects');
    }
};