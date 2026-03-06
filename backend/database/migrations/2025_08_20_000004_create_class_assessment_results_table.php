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
        Schema::create('class_assessment_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_assessment_id')->constrained()->onDelete('cascade');
            $table->string('class_label');
            $table->string('grade_level')->nullable();
            $table->string('subject')->nullable();
            $table->unsignedInteger('student_count')->nullable();
            $table->unsignedInteger('participant_count')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('recorded_at')->nullable();
            $table->timestamps();

            $table->unique(['school_assessment_id', 'class_label', 'subject'], 'unique_class_subject_per_assessment');
            $table->index(['school_assessment_id', 'class_label']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_assessment_results');
    }
};
