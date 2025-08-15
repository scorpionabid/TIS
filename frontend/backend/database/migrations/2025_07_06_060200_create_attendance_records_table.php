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
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_term_id')->nullable()->constrained()->onDelete('cascade');
            
            // Date and time information
            $table->date('attendance_date');
            $table->time('period_start_time')->nullable();
            $table->time('period_end_time')->nullable();
            $table->integer('period_number')->nullable()->comment('1st period, 2nd period, etc.');
            
            // Attendance status
            $table->enum('status', [
                'present',          // Student was present
                'absent',           // Student was absent (unexcused)
                'late',             // Student arrived late
                'excused',          // Excused absence
                'medical',          // Medical absence
                'authorized',       // Pre-authorized absence
                'suspended',        // Student suspended
                'early_dismissal'   // Student left early
            ]);
            
            // Timing details
            $table->time('arrival_time')->nullable()->comment('Actual arrival time');
            $table->time('departure_time')->nullable()->comment('Actual departure time');
            $table->integer('minutes_late')->default(0);
            $table->integer('minutes_absent')->default(0);
            
            // Recording method and source
            $table->enum('recording_method', [
                'manual',           // Manually recorded by teacher
                'rfid_card',        // RFID card scan
                'biometric',        // Fingerprint/face recognition
                'qr_code',          // QR code scan
                'mobile_app',       // Mobile app check-in
                'automated'         // System automated
            ])->default('manual');
            
            $table->string('device_id')->nullable()->comment('ID of recording device');
            $table->string('location')->nullable()->comment('Classroom, lab, gym, etc.');
            
            // Authorization and approval
            $table->foreignId('recorded_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('recorded_at')->useCurrent();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            // Absence details (when applicable)
            $table->text('absence_reason')->nullable();
            $table->unsignedBigInteger('absence_request_id')->nullable()->comment('References absence_requests.id - constraint to be added in separate migration');
            $table->json('supporting_documents')->nullable()->comment('Medical certificates, parent notes, etc.');
            
            // Parent/guardian notification
            $table->boolean('parent_notified')->default(false);
            $table->timestamp('parent_notified_at')->nullable();
            $table->enum('notification_method', ['sms', 'email', 'phone', 'app'])->nullable();
            
            // Additional information
            $table->text('notes')->nullable()->comment('Teacher notes or observations');
            $table->json('metadata')->nullable()->comment('Additional tracking data');
            
            // Academic impact
            $table->boolean('affects_grade')->default(true);
            $table->decimal('attendance_weight', 3, 2)->nullable()->comment('Weight for grade calculation');
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['student_id', 'attendance_date']);
            $table->index(['subject_id', 'attendance_date']);
            $table->index(['teacher_id', 'attendance_date']);
            $table->index(['status', 'attendance_date']);
            $table->index(['recording_method', 'recorded_at']);
            $table->index(['academic_year_id', 'academic_term_id']);
            $table->index(['attendance_date', 'period_number']);
            
            // Unique constraint to prevent duplicate records
            $table->unique([
                'student_id', 'subject_id', 'attendance_date', 'period_number'
            ], 'unique_attendance_record');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};