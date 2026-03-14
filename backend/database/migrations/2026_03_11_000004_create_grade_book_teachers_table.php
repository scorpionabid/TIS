<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_book_teachers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grade_book_session_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->string('group_label')->nullable();
            $table->boolean('is_primary')->default(true);
            $table->foreignId('assigned_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['grade_book_session_id', 'group_label']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_book_teachers');
    }
};
