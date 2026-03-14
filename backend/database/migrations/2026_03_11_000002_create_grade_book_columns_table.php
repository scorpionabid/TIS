<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_book_columns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_book_session_id')->constrained()->onDelete('cascade');
            $table->foreignId('assessment_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('assessment_stage_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('semester', ['I', 'II'])->default('I');
            $table->string('column_label');
            $table->date('assessment_date');
            $table->decimal('max_score', 5, 2)->default(100);
            $table->integer('display_order');
            $table->enum('column_type', ['input', 'calculated'])->default('input');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->boolean('is_archived')->default(false);
            $table->timestamps();

            $table->index(['grade_book_session_id', 'semester', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_book_columns');
    }
};
