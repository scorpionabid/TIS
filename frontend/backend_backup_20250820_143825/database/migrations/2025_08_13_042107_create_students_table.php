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
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('student_number')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('full_name')->virtualAs("CONCAT(first_name, ' ', last_name)");
            $table->foreignId('institution_id')->constrained()->onDelete('cascade');
            $table->string('class_name');
            $table->string('grade_level');
            $table->date('birth_date')->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->string('parent_name')->nullable();
            $table->string('parent_phone')->nullable();
            $table->string('parent_email')->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('additional_info')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['institution_id', 'grade_level']);
            $table->index(['institution_id', 'class_name']);
            $table->index(['institution_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
