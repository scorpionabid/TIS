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
        Schema::create('school_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('assessment_stage_id')->constrained()->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->date('scheduled_date')->nullable();
            $table->string('title')->nullable();
            $table->json('subjects')->nullable();
            $table->json('grade_levels')->nullable();
            $table->unsignedInteger('total_students')->nullable();
            $table->unsignedInteger('participants_count')->nullable();
            $table->enum('status', ['draft', 'in_progress', 'completed', 'submitted'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['institution_id', 'assessment_type_id', 'assessment_stage_id'], 'school_assessments_lookup_idx');
            $table->index(['assessment_type_id', 'status']);
            $table->index(['scheduled_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_assessments');
    }
};
