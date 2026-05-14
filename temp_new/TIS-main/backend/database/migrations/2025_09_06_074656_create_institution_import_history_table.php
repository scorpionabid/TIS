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
        Schema::create('institution_import_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('institution_type');
            $table->string('file_name');
            $table->string('file_size')->nullable();
            $table->string('file_hash')->nullable(); // To detect duplicate uploads

            // Import statistics
            $table->integer('total_rows')->default(0);
            $table->integer('successful_imports')->default(0);
            $table->integer('failed_imports')->default(0);
            $table->integer('skipped_duplicates')->default(0);
            $table->integer('warnings_count')->default(0);

            // Import results and details
            $table->json('import_results')->nullable(); // Full results for analysis
            $table->json('duplicate_analysis')->nullable(); // Duplicate detection results
            $table->json('error_summary')->nullable(); // Categorized errors

            // Import configuration
            $table->json('import_options')->nullable(); // Duplicate handling, validation settings
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'cancelled'])->default('pending');

            // Timing
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('processing_time_ms')->nullable(); // Processing time in milliseconds

            // Metadata
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['user_id', 'created_at']);
            $table->index(['institution_type', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index('file_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('institution_import_history');
    }
};
