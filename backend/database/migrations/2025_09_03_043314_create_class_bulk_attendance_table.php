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
        Schema::create('class_bulk_attendance', function (Blueprint $table) {
            $table->id();
            
            // References
            $table->foreignId('grade_id')->constrained('grades')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->foreignId('recorded_by')->constrained('users')->onDelete('cascade');
            
            // Date information
            $table->date('attendance_date');
            
            // Morning session attendance counts
            $table->integer('morning_present')->default(0)->comment('Present students in morning');
            $table->integer('morning_excused')->default(0)->comment('Excused absent students in morning');
            $table->integer('morning_unexcused')->default(0)->comment('Unexcused absent students in morning');
            
            // Evening session attendance counts  
            $table->integer('evening_present')->default(0)->comment('Present students in evening');
            $table->integer('evening_excused')->default(0)->comment('Excused absent students in evening');
            $table->integer('evening_unexcused')->default(0)->comment('Unexcused absent students in evening');
            
            // Summary information
            $table->integer('total_students')->comment('Total students enrolled in class');
            $table->decimal('morning_attendance_rate', 5, 2)->default(0.00)->comment('Morning attendance percentage');
            $table->decimal('evening_attendance_rate', 5, 2)->default(0.00)->comment('Evening attendance percentage');
            $table->decimal('daily_attendance_rate', 5, 2)->default(0.00)->comment('Overall daily attendance percentage');
            
            // Additional notes
            $table->text('morning_notes')->nullable()->comment('Notes about morning session');
            $table->text('evening_notes')->nullable()->comment('Notes about evening session');
            $table->text('general_notes')->nullable()->comment('General daily notes');
            
            // Status tracking
            $table->boolean('is_complete')->default(false)->comment('Whether both sessions are recorded');
            $table->timestamp('morning_recorded_at')->nullable();
            $table->timestamp('evening_recorded_at')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['grade_id', 'attendance_date']);
            $table->index(['institution_id', 'attendance_date']);
            $table->index(['academic_year_id', 'attendance_date']);
            $table->index('attendance_date');
            $table->index('recorded_by');
            
            // Unique constraint - one record per class per date
            $table->unique(['grade_id', 'attendance_date'], 'unique_class_daily_attendance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_bulk_attendance');
    }
};
