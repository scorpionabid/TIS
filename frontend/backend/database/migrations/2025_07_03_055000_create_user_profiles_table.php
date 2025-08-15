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
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('patronymic', 100)->nullable(); // Ata adı
            $table->date('birth_date')->nullable();
            $table->string('gender', 10)->nullable();
            $table->string('national_id', 20)->nullable(); // FIN/SSN
            $table->string('profile_image_path', 255)->nullable();
            $table->string('contact_phone', 20)->nullable();
            $table->string('emergency_contact', 20)->nullable();
            $table->json('address')->default('{}');
            $table->json('education_history')->default('[]');
            $table->json('employment_history')->default('[]');
            $table->json('certifications')->default('[]');
            $table->json('preferences')->default('{}');
            $table->timestamps();

            $table->index(['last_name', 'first_name']);
            $table->index('national_id');
        });

        // Check constraints handled in application layer for database compatibility
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};