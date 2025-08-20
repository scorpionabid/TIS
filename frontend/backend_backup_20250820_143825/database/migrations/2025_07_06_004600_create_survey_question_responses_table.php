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
        Schema::create('survey_question_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_response_id')->constrained()->onDelete('cascade');
            $table->foreignId('survey_question_id')->constrained()->onDelete('cascade');
            
            // Response data based on question type
            $table->text('text_response')->nullable()->comment('For text/number questions');
            $table->decimal('number_response', 15, 2)->nullable()->comment('For number questions');
            $table->date('date_response')->nullable()->comment('For date questions');
            $table->json('choice_response')->nullable()->comment('For single/multiple choice (array of selected option IDs)');
            $table->integer('rating_response')->nullable()->comment('For rating questions (1-10)');
            $table->json('table_response')->nullable()->comment('For table/matrix questions');
            $table->json('file_response')->nullable()->comment('For file upload (file paths)');
            
            // Additional metadata
            $table->json('metadata')->nullable()->comment('Additional response metadata');
            $table->timestamps();
            
            // Indexes
            $table->index(['survey_response_id', 'survey_question_id']);
            $table->unique(['survey_response_id', 'survey_question_id'], 'unique_response_question');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('survey_question_responses');
    }
};