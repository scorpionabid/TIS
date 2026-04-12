<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_activity_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_activity_id')
                  ->constrained('project_activities')
                  ->onDelete('cascade');
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();
            
            $table->unique(['project_activity_id', 'user_id'], 'activity_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_activity_user');
    }
};
