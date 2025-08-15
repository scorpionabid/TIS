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
        Schema::create('survey_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained('surveys')->onDelete('cascade');
            $table->integer('version_number');
            $table->json('structure');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
            
            $table->unique(['survey_id', 'version_number']);
            $table->index(['survey_id', 'version_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('survey_versions');
    }
};