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
        // 1. Create Approval Workflows Table
        Schema::create('approval_workflows', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200); // "Attendance Data Approval", "Schedule Approval", "Document Review"
            $table->string('workflow_type', 100); // "attendance", "schedule", "document", "survey", "task"
            $table->enum('status', ['active', 'inactive', 'archived'])->default('active');
            $table->json('approval_chain'); // [{"level": 1, "role": "deputy", "required": true}, {"level": 2, "role": "director", "required": true}]
            $table->json('workflow_config'); // {"auto_approve_after": "72_hours", "require_all_levels": true, "allow_skip_levels": false}
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['workflow_type', 'status']);
            $table->index('status');
        });

        // 2. Create Data Approval Requests Table
        Schema::create('data_approval_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained('approval_workflows')->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->string('approvalable_type'); // "App\Models\ClassAttendance", "App\Models\Schedule"
            $table->unsignedBigInteger('approvalable_id'); // ID of the data being approved
            $table->foreignId('submitted_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('submitted_at');
            $table->enum('current_status', ['pending', 'in_progress', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->integer('current_approval_level')->default(1); // Which level in the chain we're at
            $table->text('submission_notes')->nullable();
            $table->json('request_metadata')->nullable(); // {"urgency": "high", "deadline": "2025-07-15", "category": "monthly_report"}
            $table->timestamp('deadline')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            $table->unique(['approvalable_type', 'approvalable_id']);
            $table->index(['institution_id', 'current_status']);
            $table->index(['workflow_id', 'current_status']);
            $table->index(['submitted_by', 'current_status']);
            $table->index(['current_status', 'deadline']);
        });

        // 3. Create Approval Actions Table (Individual approval/rejection actions)
        Schema::create('approval_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained('data_approval_requests')->onDelete('cascade');
            $table->foreignId('approver_id')->constrained('users')->onDelete('cascade');
            $table->integer('approval_level'); // 1, 2, 3, etc.
            $table->enum('action', ['approved', 'rejected', 'returned', 'delegated'])->default('approved');
            $table->text('comments')->nullable();
            $table->json('action_metadata')->nullable(); // {"conditions": "Fix attendance discrepancy", "delegate_to": 123}
            $table->timestamp('action_taken_at');
            $table->foreignId('delegated_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->index(['approval_request_id', 'approval_level']);
            $table->index(['approver_id', 'action_taken_at']);
            $table->index(['action', 'action_taken_at']);
        });

        // 4. Create Data Visibility Table (Controls who can see what data at which level)
        Schema::create('data_visibility', function (Blueprint $table) {
            $table->id();
            $table->string('data_type', 100); // "attendance", "schedule", "survey_response", "task_report"
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->json('visibility_rules'); // {"deputy": ["own_data"], "director": ["school_all"], "sektoradmin": ["sector_approved"], "regionadmin": ["region_approved"]}
            $table->enum('approval_requirement', ['none', 'director_only', 'sector_required', 'region_required'])->default('director_only');
            $table->json('access_levels'); // {"view": ["deputy", "director"], "edit": ["deputy"], "approve": ["director"], "export": ["director", "sektoradmin"]}
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->unique(['data_type', 'institution_id']);
            $table->index(['data_type', 'is_active']);
            $table->index(['institution_id', 'is_active']);
        });

        // 5. Create Approval Notifications Table
        Schema::create('approval_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained('data_approval_requests')->onDelete('cascade');
            $table->foreignId('recipient_id')->constrained('users')->onDelete('cascade');
            $table->enum('notification_type', ['request_submitted', 'approval_required', 'approved', 'rejected', 'deadline_approaching', 'overdue'])->default('approval_required');
            $table->string('title', 200);
            $table->text('message');
            $table->enum('status', ['pending', 'sent', 'read', 'dismissed'])->default('pending');
            $table->json('notification_metadata')->nullable(); // {"email_sent": true, "sms_sent": false, "priority": "high"}
            $table->timestamp('scheduled_for')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            
            $table->index(['recipient_id', 'status']);
            $table->index(['approval_request_id', 'notification_type']);
            $table->index(['status', 'scheduled_for']);
        });

        // 6. Create Approval Delegates Table (For temporary delegation of approval authority)
        Schema::create('approval_delegates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delegator_id')->constrained('users')->onDelete('cascade'); // Who is delegating
            $table->foreignId('delegate_id')->constrained('users')->onDelete('cascade'); // Who receives the authority
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->string('delegation_scope', 100); // "all", "attendance_only", "schedules_only", "emergency_only"
            $table->date('valid_from');
            $table->date('valid_until');
            $table->enum('status', ['active', 'expired', 'revoked', 'suspended'])->default('active');
            $table->text('delegation_reason')->nullable(); // "Annual leave", "Medical absence", "Training"
            $table->json('limitations')->nullable(); // {"max_amount": 50000, "approval_types": ["attendance", "schedule"]}
            $table->timestamps();
            
            $table->index(['delegate_id', 'status', 'valid_from', 'valid_until']);
            $table->index(['delegator_id', 'status']);
            $table->index(['institution_id', 'status']);
        });

        // 7. Create Approval Templates Table (Pre-defined approval workflows for common scenarios)
        Schema::create('approval_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200); // "Monthly Attendance Report", "Weekly Schedule Update", "Emergency Document"
            $table->string('template_type', 100); // "attendance", "schedule", "document", "financial"
            $table->json('default_approval_chain'); // Standard approval levels for this type
            $table->json('template_config'); // Default settings
            $table->text('description')->nullable();
            $table->boolean('is_system_template')->default(false); // System vs custom templates
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->index(['template_type', 'is_active']);
            $table->index(['is_system_template', 'is_active']);
        });

        // 8. Create Approval Analytics Table (Track approval performance and bottlenecks)
        Schema::create('approval_analytics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->string('data_type', 100); // "attendance", "schedule", etc.
            $table->date('analytics_date');
            $table->integer('total_requests')->default(0);
            $table->integer('approved_requests')->default(0);
            $table->integer('rejected_requests')->default(0);
            $table->integer('pending_requests')->default(0);
            $table->decimal('avg_approval_time_hours', 8, 2)->default(0); // Average time to approve
            $table->integer('overdue_requests')->default(0);
            $table->json('level_breakdown'); // {"level_1": {"approved": 10, "avg_time": 2.5}, "level_2": {"approved": 8, "avg_time": 12.3}}
            $table->json('bottlenecks')->nullable(); // {"slow_approvers": [{"user_id": 123, "avg_time": 48}]}
            $table->timestamps();
            
            $table->unique(['institution_id', 'data_type', 'analytics_date']);
            $table->index(['institution_id', 'analytics_date']);
            $table->index(['data_type', 'analytics_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_analytics');
        Schema::dropIfExists('approval_templates');
        Schema::dropIfExists('approval_delegates');
        Schema::dropIfExists('approval_notifications');
        Schema::dropIfExists('data_visibility');
        Schema::dropIfExists('approval_actions');
        Schema::dropIfExists('data_approval_requests');
        Schema::dropIfExists('approval_workflows');
    }
};