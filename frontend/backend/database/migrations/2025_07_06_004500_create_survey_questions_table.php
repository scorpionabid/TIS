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
        Schema::create('survey_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            
            // Question types according to PRD-2
            $table->enum('type', [
                'text',           // Text Input - Açıq cavab sahələri
                'number',         // Number Input - Rəqəmsal məlumatlar
                'date',           // Date Picker - Tarix seçimi
                'single_choice',  // Single Choice - Radio button seçimlər
                'multiple_choice', // Multiple Choice - Checkbox seçimlər
                'file_upload',    // File Upload - PDF, Excel (max 10MB)
                'rating',         // Rating Scale - 1-10 qiymətləndirmə
                'table_matrix'    // Table/Matrix - Strukturlaşdırılmış cədvəl
            ])->comment('8 question types from PRD-2');
            
            $table->integer('order_index')->default(0)->comment('Question order in survey');
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            
            // Question configuration and validation
            $table->json('options')->nullable()->comment('Options for choice/rating questions');
            $table->json('validation_rules')->nullable()->comment('Validation rules (min/max, file types, etc.)');
            $table->json('metadata')->nullable()->comment('Additional question metadata');
            
            // For number questions
            $table->decimal('min_value', 15, 2)->nullable();
            $table->decimal('max_value', 15, 2)->nullable();
            
            // For text questions
            $table->integer('min_length')->nullable();
            $table->integer('max_length')->nullable();
            
            // For file upload questions
            $table->json('allowed_file_types')->nullable()->comment('PDF, Excel, etc.');
            $table->integer('max_file_size')->default(10240)->comment('Max file size in KB (default 10MB)');
            
            // For rating questions
            $table->integer('rating_min')->default(1);
            $table->integer('rating_max')->default(10);
            $table->string('rating_min_label')->nullable();
            $table->string('rating_max_label')->nullable();
            
            // For table/matrix questions
            $table->json('table_headers')->nullable()->comment('Table column headers');
            $table->json('table_rows')->nullable()->comment('Table row labels');
            
            // Multilingual support
            $table->json('translations')->nullable()->comment('Question title/description in multiple languages');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['survey_id', 'order_index']);
            $table->index(['survey_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('survey_questions');
    }
};