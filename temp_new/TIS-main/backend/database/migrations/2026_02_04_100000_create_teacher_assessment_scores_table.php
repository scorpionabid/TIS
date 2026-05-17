<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * PRD: AssessmentScore - sertifikasiya/MİQ/diaqnostik (ən son nəticə)
     */
    public function up(): void
    {
        Schema::create('teacher_assessment_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->enum('assessment_type', ['miq', 'certification', 'diagnostic'])
                ->comment('MİQ, Sertifikasiya, Diaqnostik');
            $table->decimal('score', 5, 2)->comment('Alınan bal');
            $table->decimal('max_score', 5, 2)->comment('Maksimum bal');
            $table->date('assessment_date');
            $table->string('document_path')->nullable()->comment('Sənəd faylı');
            $table->json('metadata')->nullable()->comment('Əlavə məlumatlar');
            $table->boolean('verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Indexes
            $table->index(['teacher_id', 'academic_year_id', 'assessment_type'], 'tas_teacher_year_type_idx');
            $table->index(['assessment_type', 'assessment_date'], 'tas_type_date_idx');

            // PRD: ən son nəticə götürülür - unique constraint
            $table->unique(
                ['teacher_id', 'academic_year_id', 'assessment_type'],
                'unique_teacher_assessment_per_year'
            );
        });

        // Add comments (SQLite compatible)
        if (config('database.default') !== 'sqlite') {
            DB::statement("COMMENT ON TABLE teacher_assessment_scores IS 'PRD: MİQ/Sertifikasiya/Diaqnostik qiymətləndirmə nəticələri'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_assessment_scores');
    }
};
