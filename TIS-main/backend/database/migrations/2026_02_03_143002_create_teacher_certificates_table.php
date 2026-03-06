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
        Schema::create('teacher_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_profile_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('issuer');
            $table->date('date');
            $table->date('expiry_date')->nullable();
            $table->string('credential_id')->nullable();
            $table->enum('status', ['active', 'expired', 'pending', 'revoked'])->default('active');
            $table->string('certificate_url')->nullable();
            $table->string('verification_url')->nullable();
            $table->text('description')->nullable();
            $table->json('skills')->nullable();
            $table->enum('level', ['beginner', 'intermediate', 'advanced', 'expert'])->nullable();
            $table->enum('category', ['teaching', 'technical', 'language', 'management', 'research', 'other'])->nullable();
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('teacher_profile_id');
            $table->index('status');
            $table->index('level');
            $table->index('category');
            $table->index('issuer');
            $table->index('date');
            $table->index('expiry_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_certificates');
    }
};
