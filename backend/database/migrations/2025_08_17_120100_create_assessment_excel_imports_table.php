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
        Schema::create('assessment_excel_imports', function (Blueprint $table) {
            $table->id();
            $table->string('import_id')->unique();
            $table->foreignId('assessment_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->string('original_filename');
            $table->string('file_path');
            $table->integer('file_size');
            $table->date('assessment_date');
            $table->string('grade_level')->nullable();
            $table->string('class_name')->nullable();
            $table->enum('status', ['processing', 'completed', 'failed', 'partial'])->default('processing');
            $table->integer('total_rows')->default(0);
            $table->integer('successful_imports')->default(0);
            $table->integer('failed_imports')->default(0);
            $table->json('errors')->nullable();
            $table->json('warnings')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('started_at')->default(now());
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['institution_id', 'status']);
            $table->index(['uploaded_by', 'created_at']);
            $table->index(['assessment_type_id', 'assessment_date']);
            $table->index('import_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_excel_imports');
    }
};
