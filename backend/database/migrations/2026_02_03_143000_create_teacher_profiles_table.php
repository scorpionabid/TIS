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
        Schema::create('teacher_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('phone', 20)->nullable();
            $table->text('bio')->nullable();
            $table->json('qualifications')->nullable();
            $table->integer('experience_years')->default(0);
            $table->string('specialization')->nullable();
            $table->string('photo')->nullable();
            $table->string('school')->nullable();
            $table->string('subject')->nullable();
            $table->text('address')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->string('emergency_contact_email')->nullable();
            $table->json('social_links')->nullable();
            $table->json('preferences')->nullable();
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('subject');
            $table->index('school');
            $table->index('experience_years');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_profiles');
    }
};
