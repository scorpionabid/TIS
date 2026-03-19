<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_book_cells', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_book_column_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('group_label')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->decimal('percentage', 5, 2)->nullable();
            $table->string('grade_mark')->nullable();
            $table->boolean('is_present')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('recorded_at')->nullable();
            $table->timestamps();

            $table->unique(['grade_book_column_id', 'student_id'], 'unique_cell_student');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_book_cells');
    }
};
