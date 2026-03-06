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
        Schema::create('teacher_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_profile_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('date');
            $table->enum('type', ['award', 'certification', 'milestone', 'recognition', 'publication', 'presentation'])->default('milestone');
            $table->enum('impact_level', ['high', 'medium', 'low'])->default('medium');
            $table->string('institution')->nullable();
            $table->string('certificate_url')->nullable();
            $table->boolean('verification_status')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('teacher_profile_id');
            $table->index('type');
            $table->index('impact_level');
            $table->index('date');
            $table->index('verification_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_achievements');
    }
};
