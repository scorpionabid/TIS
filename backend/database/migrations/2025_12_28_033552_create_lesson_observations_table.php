<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Lesson Observations - Dərs müşahidələri (0-100 + rəy)
     */
    public function up(): void
    {
        Schema::create('lesson_observations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
            $table->date('observation_date')->comment('Date of observation');
            $table->decimal('final_score', 5, 2)->comment('Final score 0-100');
            $table->text('comment')->nullable()->comment('Observer comment');
            $table->string('observer_name', 255)->nullable()->comment('Observer name');
            $table->timestamps();

            // Indexes
            $table->index('teacher_id');
            $table->index('academic_year_id');
            $table->index('observation_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lesson_observations');
    }
};
