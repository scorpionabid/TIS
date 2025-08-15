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
        Schema::create('attendance_reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_title');
            $table->enum('report_type', [
                'daily_summary',        // Daily attendance summary
                'weekly_summary',       // Weekly attendance report
                'monthly_summary',      // Monthly attendance report
                'term_summary',         // Academic term summary
                'annual_summary',       // Annual attendance report
                'student_individual',   // Individual student report
                'class_summary',        // Class/grade level summary
                'subject_attendance',   // Subject-specific attendance
                'teacher_summary',      // Teacher's attendance report
                'parent_notification',  // Parent notification report
                'truancy_report',       // Truancy and chronic absence
                'intervention_report',  // Intervention effectiveness
                'comparative_analysis', // Cross-period comparisons
                'custom_query'          // Custom report query
            ]);
            
            // Report scope and filters
            $table->foreignId('institution_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_term_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('grade_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('subject_id')->nullable()->constrained()->onDelete('cascade');
            
            // Date range
            $table->date('report_start_date');
            $table->date('report_end_date');
            $table->integer('total_days_included');
            
            // Report generation details
            $table->foreignId('generated_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('generated_at')->useCurrent();
            $table->enum('generation_method', [
                'manual',           // Manually generated
                'scheduled',        // Auto-generated on schedule
                'api_request',      // Generated via API
                'bulk_export'       // Part of bulk export
            ])->default('manual');
            
            // Report parameters and filters
            $table->json('filter_criteria')->nullable()->comment('All filters applied to generate report');
            $table->json('included_students')->nullable()->comment('Student IDs included in report');
            $table->json('excluded_students')->nullable()->comment('Student IDs excluded from report');
            $table->json('report_parameters')->nullable()->comment('Additional parameters and settings');
            
            // Summary statistics
            $table->json('summary_data')->comment('Key statistics and summary information');
            $table->integer('total_students_included')->default(0);
            $table->decimal('average_attendance_rate', 5, 2)->default(0.00);
            $table->integer('total_present_instances')->default(0);
            $table->integer('total_absent_instances')->default(0);
            $table->integer('total_late_instances')->default(0);
            $table->integer('total_excused_instances')->default(0);
            
            // Detailed analytics
            $table->json('attendance_breakdown')->nullable()->comment('Detailed breakdown by various categories');
            $table->json('trend_analysis')->nullable()->comment('Trend analysis and patterns');
            $table->json('risk_assessment')->nullable()->comment('Students at risk identification');
            $table->json('intervention_recommendations')->nullable()->comment('Recommended interventions');
            
            // Comparative data
            $table->json('comparative_statistics')->nullable()->comment('Comparisons with previous periods');
            $table->json('benchmark_data')->nullable()->comment('Comparison with benchmarks/targets');
            $table->decimal('improvement_percentage', 5, 2)->nullable()->comment('Improvement over previous period');
            
            // Export and distribution
            $table->enum('output_format', [
                'pdf',              // PDF document
                'excel',            // Excel spreadsheet
                'csv',              // CSV file
                'json',             // JSON data
                'html',             // HTML report
                'dashboard'         // Interactive dashboard
            ])->default('pdf');
            
            $table->string('file_path')->nullable()->comment('Path to generated report file');
            $table->integer('file_size')->nullable()->comment('File size in bytes');
            $table->string('download_token')->nullable()->comment('Secure download token');
            $table->timestamp('file_expires_at')->nullable();
            
            // Distribution and access
            $table->json('shared_with')->nullable()->comment('Users/roles who can access this report');
            $table->boolean('is_public')->default(false);
            $table->boolean('auto_distribute')->default(false);
            $table->json('distribution_list')->nullable()->comment('Email distribution list');
            $table->timestamp('last_accessed_at')->nullable();
            $table->integer('access_count')->default(0);
            
            // Scheduling and automation
            $table->boolean('is_scheduled')->default(false);
            $table->enum('schedule_frequency', [
                'daily',            // Generated daily
                'weekly',           // Generated weekly
                'monthly',          // Generated monthly
                'quarterly',        // Generated quarterly
                'annually',         // Generated annually
                'custom'            // Custom schedule
            ])->nullable();
            
            $table->json('schedule_config')->nullable()->comment('Detailed schedule configuration');
            $table->timestamp('next_generation_at')->nullable();
            $table->boolean('schedule_active')->default(true);
            
            // Report quality and validation
            $table->enum('report_status', [
                'generating',       // Currently being generated
                'completed',        // Successfully completed
                'failed',           // Generation failed
                'cancelled',        // Generation cancelled
                'expired',          // Report expired
                'archived'          // Archived report
            ])->default('generating');
            
            $table->text('generation_log')->nullable()->comment('Generation process log');
            $table->json('validation_results')->nullable()->comment('Data validation results');
            $table->boolean('data_quality_passed')->default(true);
            $table->text('quality_notes')->nullable();
            
            // Administrative
            $table->text('report_description')->nullable();
            $table->json('tags')->nullable()->comment('Report categorization tags');
            $table->boolean('is_confidential')->default(false);
            $table->enum('retention_period', [
                '30_days',          // Keep for 30 days
                '90_days',          // Keep for 90 days
                '1_year',           // Keep for 1 year
                '3_years',          // Keep for 3 years
                'permanent'         // Keep permanently
            ])->default('1_year');
            
            $table->timestamp('archive_after')->nullable();
            $table->timestamp('delete_after')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['report_type', 'generated_at']);
            $table->index(['institution_id', 'report_type']);
            $table->index(['academic_year_id', 'academic_term_id']);
            $table->index(['generated_by', 'generated_at']);
            $table->index(['report_status', 'generated_at']);
            $table->index(['is_scheduled', 'next_generation_at']);
            $table->index(['file_expires_at', 'report_status']);
            $table->index(['archive_after', 'report_status']);
            
            // Composite indexes for common queries
            $table->index(['report_type', 'academic_year_id', 'institution_id']);
            $table->index(['report_start_date', 'report_end_date', 'report_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_reports');
    }
};