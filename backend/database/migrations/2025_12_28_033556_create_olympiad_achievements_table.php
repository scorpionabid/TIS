<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Olympiad Achievements - səviyyə × yer × şagird sayı
     */
    public function up(): void
    {
        Schema::create('olympiad_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->enum('olympiad_level', ['rayon', 'region', 'olke', 'beynelxalq'])->comment('Olympiad level');
            $table->integer('placement')->comment('Placement: 1, 2, 3, etc.');
            $table->integer('student_count')->default(1)->comment('Number of participating students');
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->onDelete('set null')->comment('Olympiad subject');
            $table->timestamps();

            // Indexes
            $table->index('teacher_id');
            $table->index('academic_year_id');
            $table->index('olympiad_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('olympiad_achievements');
    }
};
