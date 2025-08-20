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
        Schema::create('bulk_assessment_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->unique();
            $table->foreignId('assessment_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->date('assessment_date');
            $table->string('grade_level')->nullable();
            $table->string('class_name')->nullable();
            $table->enum('entry_method', ['manual', 'excel_import', 'bulk_interface'])->default('bulk_interface');
            $table->enum('status', ['draft', 'in_progress', 'completed', 'submitted'])->default('draft');
            $table->integer('total_students')->default(0);
            $table->integer('completed_entries')->default(0);
            $table->json('bulk_operations_log')->nullable(); // Track bulk operations applied
            $table->json('validation_errors')->nullable();
            $table->timestamp('started_at')->default(now());
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['institution_id', 'status']);
            $table->index(['created_by', 'assessment_date']);
            $table->index(['assessment_type_id', 'status']);
            $table->index('session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bulk_assessment_sessions');
    }
};