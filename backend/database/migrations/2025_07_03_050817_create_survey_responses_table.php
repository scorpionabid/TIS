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
        Schema::create('survey_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained('surveys');
            $table->foreignId('respondent_id')->constrained('users');
            $table->foreignId('institution_id')->constrained('institutions');
            $table->string('department', 50)->nullable();
            $table->json('responses')->default('{}');
            $table->json('attachments')->default('[]');
            $table->string('status', 20)->default('draft');
            $table->integer('progress_percentage')->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->text('rejection_reason')->nullable();
            $table->json('workflow_history')->default('[]');
            $table->timestamps();

            $table->unique(['survey_id', 'institution_id', 'department']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('survey_responses');
    }
};