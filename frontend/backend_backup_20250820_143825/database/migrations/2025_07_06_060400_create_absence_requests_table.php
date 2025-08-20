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
        Schema::create('absence_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('requested_by')->constrained('users')->onDelete('cascade')->comment('Parent/guardian who submitted request');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            
            // Request details
            $table->date('absence_start_date');
            $table->date('absence_end_date');
            $table->integer('total_days_requested');
            $table->enum('absence_type', [
                'medical',          // Medical appointment/illness
                'family_emergency', // Family emergency
                'bereavement',      // Death in family
                'religious',        // Religious observance
                'educational',      // Educational opportunity
                'family_vacation',  // Family vacation
                'personal',         // Personal reasons
                'other'             // Other reasons
            ]);
            
            // Detailed information
            $table->text('reason_description');
            $table->json('affected_periods')->nullable()->comment('Specific periods/subjects affected');
            $table->json('supporting_documents')->nullable()->comment('Medical certificates, letters, etc.');
            
            // Request status and workflow
            $table->enum('status', [
                'pending',          // Awaiting review
                'approved',         // Approved by school
                'partially_approved', // Some days approved
                'denied',           // Request denied
                'cancelled',        // Cancelled by requester
                'expired',          // Request expired
                'under_review'      // Being reviewed
            ])->default('pending');
            
            // Approval workflow (3-level hierarchy)
            $table->foreignId('reviewed_by_teacher')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('teacher_review_at')->nullable();
            $table->enum('teacher_recommendation', ['approve', 'deny', 'refer'])->nullable();
            $table->text('teacher_notes')->nullable();
            
            $table->foreignId('reviewed_by_admin')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('admin_review_at')->nullable();
            $table->enum('admin_decision', ['approve', 'deny', 'refer_higher'])->nullable();
            $table->text('admin_notes')->nullable();
            
            $table->foreignId('final_approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('final_approval_at')->nullable();
            $table->text('final_decision_notes')->nullable();
            
            // Academic impact assessment
            $table->json('affected_subjects')->nullable()->comment('Subjects that will be affected');
            $table->json('missed_assessments')->nullable()->comment('Exams, assignments to be missed');
            $table->boolean('makeup_required')->default(false);
            $table->json('makeup_plan')->nullable()->comment('Plan for makeup work');
            $table->date('makeup_deadline')->nullable();
            
            // Conditions and requirements
            $table->json('approval_conditions')->nullable()->comment('Conditions attached to approval');
            $table->boolean('requires_medical_clearance')->default(false);
            $table->boolean('requires_parent_meeting')->default(false);
            $table->boolean('affects_attendance_record')->default(true);
            
            // Communication tracking
            $table->boolean('parent_notified')->default(false);
            $table->timestamp('parent_notified_at')->nullable();
            $table->json('communication_log')->nullable()->comment('All communications about this request');
            
            // Request processing
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('due_response_by')->nullable()->comment('Expected response deadline');
            $table->integer('processing_priority')->default(3)->comment('1=urgent, 2=high, 3=normal, 4=low');
            
            // Post-absence follow-up
            $table->boolean('follow_up_required')->default(false);
            $table->date('follow_up_date')->nullable();
            $table->text('follow_up_notes')->nullable();
            $table->boolean('student_returned')->default(false);
            $table->date('actual_return_date')->nullable();
            
            // System tracking
            $table->json('approval_history')->nullable()->comment('Complete approval workflow history');
            $table->json('metadata')->nullable()->comment('Additional tracking data');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['student_id', 'absence_start_date']);
            $table->index(['status', 'submitted_at']);
            $table->index(['absence_type', 'status']);
            $table->index(['requested_by', 'submitted_at']);
            $table->index(['academic_year_id', 'status']);
            $table->index(['processing_priority', 'submitted_at']);
            $table->index(['due_response_by', 'status']);
            $table->index(['follow_up_required', 'follow_up_date']);
            
            // Composite indexes for common queries
            $table->index(['student_id', 'academic_year_id', 'status']);
            $table->index(['absence_start_date', 'absence_end_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('absence_requests');
    }
};