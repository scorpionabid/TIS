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
        Schema::create('school_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('school_id')->constrained('institutions');
            $table->string('role', 50);
            $table->json('departments')->default('[]');
            $table->json('subjects')->default('[]');
            $table->json('schedule_preferences')->default('{}');
            $table->string('employment_type', 50)->default('full_time');
            $table->string('employment_status', 20)->default('active');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->json('salary_info')->default('{}');
            $table->json('qualifications')->default('[]');
            $table->json('performance_metrics')->default('{}');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'school_id', 'role']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_staff');
    }
};