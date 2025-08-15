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
        Schema::create('attendance_patterns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_term_id')->nullable()->constrained()->onDelete('cascade');
            
            // Analysis period
            $table->date('analysis_start_date');
            $table->date('analysis_end_date');
            $table->integer('total_school_days');
            $table->timestamp('pattern_calculated_at')->useCurrent();
            
            // Overall attendance statistics
            $table->integer('total_present_days')->default(0);
            $table->integer('total_absent_days')->default(0);
            $table->integer('total_late_days')->default(0);
            $table->integer('total_excused_days')->default(0);
            $table->decimal('overall_attendance_rate', 5, 2)->default(0.00);
            
            // Weekly patterns
            $table->json('weekly_attendance_rates')->nullable()->comment('Attendance rate by week');
            $table->json('daily_patterns')->nullable()->comment('Monday, Tuesday, etc. patterns');
            $table->json('monthly_trends')->nullable()->comment('Monthly attendance trends');
            
            // Behavioral patterns
            $table->enum('attendance_trend', [
                'improving',        // Attendance getting better
                'declining',        // Attendance getting worse
                'stable',           // Consistent attendance
                'irregular',        // Highly variable
                'concerning',       // Below acceptable threshold
                'excellent'         // Above target threshold
            ]);
            
            $table->decimal('trend_coefficient', 8, 4)->nullable()->comment('Statistical trend coefficient');
            $table->integer('consecutive_absences_max')->default(0);
            $table->integer('frequent_tardiness_count')->default(0);
            
            // Subject-specific patterns
            $table->json('subject_attendance_rates')->nullable()->comment('Attendance by subject');
            $table->json('period_attendance_patterns')->nullable()->comment('1st period, 2nd period, etc.');
            $table->string('most_missed_subject')->nullable();
            $table->string('best_attendance_subject')->nullable();
            
            // Risk assessment
            $table->enum('risk_level', [
                'low',              // Good attendance
                'moderate',         // Some concern
                'high',             // Significant concern
                'critical'          // Immediate intervention needed
            ])->default('low');
            
            $table->decimal('risk_score', 5, 2)->default(0.00)->comment('Calculated risk score 0-100');
            $table->json('risk_factors')->nullable()->comment('Contributing risk factors');
            $table->json('protective_factors')->nullable()->comment('Positive attendance factors');
            
            // Predictive analytics
            $table->decimal('predicted_final_rate', 5, 2)->nullable()->comment('Predicted end-of-year attendance');
            $table->boolean('at_risk_graduation')->default(false);
            $table->integer('intervention_priority')->default(3)->comment('1=urgent, 2=high, 3=normal, 4=low');
            
            // Intervention tracking
            $table->json('recommended_interventions')->nullable()->comment('System-recommended actions');
            $table->json('implemented_interventions')->nullable()->comment('Actions taken');
            $table->date('last_intervention_date')->nullable();
            $table->text('intervention_notes')->nullable();
            
            // Parent engagement patterns
            $table->integer('parent_notifications_sent')->default(0);
            $table->integer('parent_responses_received')->default(0);
            $table->decimal('parent_engagement_rate', 5, 2)->default(0.00);
            $table->date('last_parent_contact_date')->nullable();
            
            // Comparative analysis
            $table->decimal('grade_average_attendance', 5, 2)->nullable()->comment('Grade level average');
            $table->decimal('school_average_attendance', 5, 2)->nullable()->comment('School average');
            $table->decimal('district_average_attendance', 5, 2)->nullable()->comment('District average');
            $table->integer('percentile_ranking')->nullable()->comment('Student percentile in school');
            
            // External factors correlation
            $table->json('weather_correlation')->nullable()->comment('Attendance vs weather patterns');
            $table->json('transportation_issues')->nullable()->comment('Bus delays, route changes');
            $table->json('health_patterns')->nullable()->comment('Illness patterns');
            $table->json('family_factors')->nullable()->comment('Family-related absence patterns');
            
            // Academic impact analysis
            $table->decimal('attendance_grade_correlation', 5, 4)->nullable()->comment('Correlation with academic performance');
            $table->json('grade_impact_by_subject')->nullable()->comment('How attendance affects each subject');
            $table->boolean('academic_performance_at_risk')->default(false);
            
            // Seasonal patterns
            $table->json('seasonal_trends')->nullable()->comment('Fall, winter, spring patterns');
            $table->json('holiday_patterns')->nullable()->comment('Before/after holiday attendance');
            $table->json('exam_period_patterns')->nullable()->comment('Attendance during exam periods');
            
            // System-generated insights
            $table->text('pattern_summary')->nullable()->comment('AI-generated pattern summary');
            $table->json('anomalies_detected')->nullable()->comment('Unusual patterns or outliers');
            $table->timestamp('next_analysis_due')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['student_id', 'academic_year_id']);
            $table->index(['risk_level', 'intervention_priority']);
            $table->index(['attendance_trend', 'overall_attendance_rate']);
            $table->index(['academic_year_id', 'academic_term_id']);
            $table->index(['pattern_calculated_at']);
            $table->index(['at_risk_graduation', 'risk_level']);
            $table->index(['intervention_priority', 'last_intervention_date']);
            
            // Unique constraint for one pattern analysis per student per term
            $table->unique([
                'student_id', 'academic_year_id', 'academic_term_id'
            ], 'unique_pattern_analysis');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_patterns');
    }
};