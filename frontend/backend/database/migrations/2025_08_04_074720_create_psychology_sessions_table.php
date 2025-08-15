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
        Schema::create('psychology_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('psychologist_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('institution_id')->constrained('institutions')->onDelete('cascade');
            
            // Session details
            $table->enum('session_type', ['individual', 'group', 'family', 'crisis', 'assessment', 'consultation', 'follow_up']);
            $table->enum('session_category', ['behavioral', 'emotional', 'academic', 'social', 'family', 'trauma', 'anxiety', 'depression', 'adhd', 'autism', 'learning_disability', 'other']);
            $table->date('scheduled_date');
            $table->time('scheduled_time')->nullable();
            $table->integer('duration_minutes')->default(50);
            $table->string('location')->nullable();
            
            // Session status and priority
            $table->enum('status', ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'no_show'])->default('scheduled');
            $table->enum('priority_level', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('confidentiality_level', ['standard', 'high', 'restricted', 'confidential'])->default('standard');
            
            // Referral information
            $table->string('referral_source')->nullable();
            $table->text('referral_reason');
            
            // Session content
            $table->text('session_notes')->nullable();
            $table->json('recommendations')->nullable();
            $table->json('intervention_type')->nullable();
            $table->json('assessment_scores')->nullable();
            $table->json('progress_indicators')->nullable();
            $table->json('goals_set')->nullable();
            $table->json('outcomes_achieved')->nullable();
            $table->json('resources_provided')->nullable();
            $table->json('external_referrals')->nullable();
            $table->text('session_summary')->nullable();
            
            // Follow-up and tracking
            $table->boolean('follow_up_required')->default(false);
            $table->date('follow_up_date')->nullable();
            $table->boolean('parent_notified')->default(false);
            $table->timestamp('parent_notification_date')->nullable();
            $table->boolean('next_session_planned')->default(false);
            
            // Cancellation tracking
            $table->text('cancelled_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            
            // Metadata
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['student_id', 'scheduled_date']);
            $table->index(['psychologist_id', 'scheduled_date']);
            $table->index(['institution_id', 'scheduled_date']);
            $table->index(['status', 'scheduled_date']);
            $table->index('priority_level');
            $table->index('session_type');
            $table->index('session_category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('psychology_sessions');
    }
};