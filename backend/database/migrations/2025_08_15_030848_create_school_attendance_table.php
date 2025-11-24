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
        Schema::create('school_attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('institutions')->onDelete('cascade');
            $table->string('class_name', 10); // e.g., '5A', '10B'
            $table->date('date');
            $table->integer('start_count')->unsigned(); // number of students at start of day
            $table->integer('end_count')->unsigned(); // number of students at end of day
            $table->decimal('attendance_rate', 5, 2)->default(0); // calculated percentage
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Unique constraint to prevent duplicate entries for same day/class/school
            $table->unique(['school_id', 'class_name', 'date'], 'unique_school_class_date');

            // Indexes for better performance
            $table->index(['school_id', 'date']);
            $table->index(['school_id', 'class_name']);
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_attendance');
    }
};
