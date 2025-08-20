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
        Schema::create('assessment_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->date('assessment_date');
            $table->decimal('score', 8, 2);
            $table->decimal('percentage_score', 5, 2)->nullable()->comment('Calculated percentage score');
            $table->string('grade_level')->nullable();
            $table->string('subject')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'submitted', 'approved', 'rejected'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('approval_notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['assessment_type_id', 'student_id', 'assessment_date'], 'unique_student_assessment_date');
            $table->index(['institution_id', 'assessment_date']);
            $table->index(['assessment_type_id', 'status']);
            $table->index(['created_by', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_entries');
    }
};
