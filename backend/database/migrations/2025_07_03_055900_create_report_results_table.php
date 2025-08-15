<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('report_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('reports')->onDelete('cascade');
            $table->json('result_data');
            $table->string('file_path', 255)->nullable(); // For stored report files
            $table->integer('generation_duration')->nullable(); // milliseconds
            $table->boolean('is_latest')->default(true);
            $table->json('metadata')->default('{}');
            $table->timestamp('generated_at')->useCurrent();
            
            $table->index('report_id');
            $table->index(['report_id', 'is_latest']);
            $table->index('generated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_results');
    }
};