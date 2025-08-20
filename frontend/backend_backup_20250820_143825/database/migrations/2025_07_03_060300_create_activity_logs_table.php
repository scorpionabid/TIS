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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('activity_type', 100); // 'login', 'logout', 'create', 'update', 'delete', 'export', etc.
            $table->string('entity_type', 100)->nullable(); // Model/table name
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->text('description')->nullable();
            $table->json('properties')->default('{}');
            $table->json('before_state')->default('{}');
            $table->json('after_state')->default('{}');
            $table->foreignId('institution_id')->nullable()->constrained('institutions');
            $table->timestamp('created_at')->useCurrent();
            
            $table->index('user_id');
            $table->index('activity_type');
            $table->index(['entity_type', 'entity_id']);
            $table->index('institution_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};