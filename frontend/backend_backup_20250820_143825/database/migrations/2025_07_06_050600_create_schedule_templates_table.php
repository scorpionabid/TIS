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
        Schema::create('schedule_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            
            // Template identification
            $table->string('name')->comment('e.g., "Standard Elementary Template"');
            $table->string('code', 20)->nullable()->comment('Short code like "ELEM-STD"');
            $table->text('description')->nullable();
            
            // Template scope and applicability
            $table->enum('template_type', [
                'weekly',           // Full weekly schedule template
                'daily',            // Daily schedule pattern
                'subject_specific', // Subject-specific scheduling rules
                'grade_level',      // Grade level standard template
                'institutional',    // Institution-wide template
                'seasonal'          // Seasonal variation template
            ])->default('weekly');
            
            // Grade level applicability
            $table->integer('grade_level_start')->nullable()->comment('Starting grade level (1-12)');
            $table->integer('grade_level_end')->nullable()->comment('Ending grade level (1-12)');
            $table->json('applicable_grades')->nullable()->comment('Specific grades [1,2,3,4,5]');
            
            // Subject allocation and distribution
            $table->json('subject_allocations')->nullable()->comment('Subject hours per week distribution');
            $table->json('daily_subject_distribution')->nullable()->comment('How subjects are distributed across days');
            $table->json('time_slot_preferences')->nullable()->comment('Preferred time slots for subjects');
            
            // Schedule structure
            $table->integer('periods_per_day')->default(8)->comment('Total periods per day');
            $table->integer('teaching_periods_per_day')->default(6)->comment('Teaching periods per day');
            $table->json('break_periods')->nullable()->comment('Break period configuration');
            $table->json('working_days')->default('[1,2,3,4,5]')->comment('Working days of week');
            
            // Template patterns and rules
            $table->json('scheduling_rules')->nullable()->comment('Scheduling rules and constraints');
            $table->json('teacher_workload_rules')->nullable()->comment('Teacher workload distribution rules');
            $table->json('room_allocation_rules')->nullable()->comment('Room allocation preferences');
            $table->json('conflict_resolution_rules')->nullable()->comment('Rules for resolving conflicts');
            
            // Template configuration
            $table->json('template_data')->comment('Complete template structure and configuration');
            $table->json('default_settings')->nullable()->comment('Default settings when applying template');
            $table->json('customization_options')->nullable()->comment('Available customization options');
            
            // Seasonal and term variations
            $table->json('term_variations')->nullable()->comment('Different configurations per term');
            $table->json('seasonal_adjustments')->nullable()->comment('Seasonal schedule adjustments');
            $table->boolean('allow_term_customization')->default(true);
            
            // Quality and validation
            $table->decimal('success_rate', 5, 2)->nullable()->comment('Template application success rate');
            $table->integer('usage_count')->default(0)->comment('Number of times template was used');
            $table->decimal('user_rating', 3, 2)->nullable()->comment('User rating 1-5');
            $table->timestamp('last_used_at')->nullable();
            
            // Template sharing and visibility
            $table->enum('visibility', [
                'private',      // Only creator can use
                'institution',  // Institution-wide
                'regional',     // Regional sharing
                'public'        // System-wide public template
            ])->default('institution');
            
            $table->boolean('is_system_template')->default(false)->comment('Created by system administrators');
            $table->boolean('is_approved')->default(false)->comment('Approved for public use');
            $table->boolean('is_featured')->default(false)->comment('Featured template');
            
            // Status and lifecycle
            $table->enum('status', [
                'draft',        // Being created
                'testing',      // Under testing
                'active',       // Ready for use
                'deprecated',   // Old version, still usable
                'archived'      // No longer usable
            ])->default('draft');
            
            $table->boolean('is_default')->default(false)->comment('Default template for institution');
            
            // Versioning and updates
            $table->string('version', 10)->default('1.0')->comment('Template version');
            $table->foreignId('parent_template_id')->nullable()->constrained('schedule_templates')->onDelete('set null');
            $table->json('version_history')->nullable()->comment('Version change history');
            $table->text('change_notes')->nullable()->comment('Notes about changes in this version');
            
            // Administrative fields
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('last_updated_at')->nullable();
            
            // Analytics and feedback
            $table->json('usage_analytics')->nullable()->comment('Template usage analytics');
            $table->json('feedback_summary')->nullable()->comment('User feedback summary');
            $table->json('performance_metrics')->nullable()->comment('Template performance metrics');
            
            // Export and import
            $table->boolean('is_exportable')->default(true)->comment('Can be exported');
            $table->boolean('is_importable')->default(true)->comment('Can be imported');
            $table->string('export_format')->nullable()->comment('Preferred export format');
            $table->json('import_mapping')->nullable()->comment('Field mapping for imports');
            
            // Additional metadata
            $table->json('metadata')->nullable()->comment('Additional template metadata');
            $table->text('usage_instructions')->nullable()->comment('Instructions for using template');
            $table->text('administrative_notes')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['institution_id', 'status']);
            $table->index(['template_type', 'status']);
            $table->index(['grade_level_start', 'grade_level_end']);
            $table->index(['visibility', 'is_approved']);
            $table->index(['is_default', 'status']);
            $table->index(['is_system_template', 'is_featured']);
            $table->index(['usage_count', 'user_rating']);
            $table->index(['created_by', 'status']);
            
            // Unique constraints
            $table->unique(
                ['institution_id', 'name', 'version'], 
                'unique_template_name_version'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_templates');
    }
};