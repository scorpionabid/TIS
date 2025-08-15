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
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50); // '1A', '2B', '10C', etc.
            $table->integer('class_level'); // 1-12
            $table->foreignId('academic_year_id')->constrained('academic_years');
            $table->foreignId('institution_id')->constrained('institutions');
            $table->foreignId('room_id')->nullable()->constrained('rooms');
            $table->foreignId('homeroom_teacher_id')->nullable()->constrained('users');
            $table->integer('student_count')->default(0);
            $table->string('specialty', 100)->nullable(); // 'math_focus', 'humanities', etc.
            $table->json('metadata')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['name', 'academic_year_id', 'institution_id']);
            $table->index('institution_id');
            $table->index('academic_year_id');
            $table->index('homeroom_teacher_id');
            $table->index('class_level');
            $table->index('is_active');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};