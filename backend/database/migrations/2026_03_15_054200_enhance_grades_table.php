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
        Schema::table('grades', function (Blueprint $table) {
            // Add missing fields from ClassModel to Grade
            if (!Schema::hasColumn('grades', 'section')) {
                $table->string('section', 10)->nullable()->after('name');
            }
            
            if (!Schema::hasColumn('grades', 'max_capacity')) {
                $table->integer('max_capacity')->default(30)->after('student_count');
            }
            
            if (!Schema::hasColumn('grades', 'classroom_location')) {
                $table->string('classroom_location', 100)->nullable()->after('room_id');
            }
            
            if (!Schema::hasColumn('grades', 'status')) {
                $table->enum('status', ['active', 'inactive', 'archived'])->default('active')->after('is_active');
            }
            
            if (!Schema::hasColumn('grades', 'class_teacher_id')) {
                $table->foreignId('class_teacher_id')->nullable()->after('homeroom_teacher_id')->constrained('users')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('grades', 'schedule_preferences')) {
                $table->json('schedule_preferences')->nullable()->after('metadata');
            }
        });

        // Sync initial data if possible
        // Note: In a real environment we would run a script to copy homeroom_teacher_id to class_teacher_id
        // and is_active to status.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropColumn([
                'section',
                'max_capacity',
                'classroom_location',
                'status',
                'class_teacher_id',
                'schedule_preferences'
            ]);
        });
    }
};
