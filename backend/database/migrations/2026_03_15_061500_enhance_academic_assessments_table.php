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
        Schema::table('academic_assessments', function (Blueprint $table) {
            // Assessor / Evaluator
            if (!Schema::hasColumn('academic_assessments', 'assessor_id')) {
                $table->foreignId('assessor_id')->nullable()->after('conducted_by')->constrained('users')->onDelete('set null');
            }

            // BSQ specific fields
            if (!Schema::hasColumn('academic_assessments', 'international_standard')) {
                $table->string('international_standard', 100)->nullable()->after('assessment_standards');
            }
            if (!Schema::hasColumn('academic_assessments', 'assessment_body')) {
                $table->string('assessment_body', 150)->nullable()->after('international_standard');
            }
            if (!Schema::hasColumn('academic_assessments', 'rankings')) {
                $table->json('rankings')->nullable()->after('national_benchmarks');
            }
            if (!Schema::hasColumn('academic_assessments', 'compliance_score')) {
                $table->decimal('compliance_score', 5, 2)->nullable()->after('mean_score');
            }
            if (!Schema::hasColumn('academic_assessments', 'accreditation_status')) {
                $table->string('accreditation_status', 100)->nullable()->after('status');
            }

            // KSQ specific fields
            if (!Schema::hasColumn('academic_assessments', 'criteria_scores')) {
                $table->json('criteria_scores')->nullable()->after('question_breakdown');
            }
            if (!Schema::hasColumn('academic_assessments', 'strengths')) {
                $table->json('strengths')->nullable()->after('assessment_description');
            }
            if (!Schema::hasColumn('academic_assessments', 'improvement_areas')) {
                $table->json('improvement_areas')->nullable()->after('strengths');
            }
            if (!Schema::hasColumn('academic_assessments', 'recommendations_list')) {
                $table->json('recommendations_list')->nullable()->after('recommended_actions');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('academic_assessments', function (Blueprint $table) {
            $table->dropColumn([
                'assessor_id',
                'international_standard',
                'assessment_body',
                'rankings',
                'compliance_score',
                'accreditation_status',
                'criteria_scores',
                'strengths',
                'improvement_areas',
                'recommendations_list'
            ]);
        });
    }
};
