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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('event', 100); // 'authentication', 'authorization', 'data_access', 'configuration_change', 'admin_action', etc.
            $table->string('auditable_type', 100)->nullable(); // Model/table name
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->json('old_values')->default('{}');
            $table->json('new_values')->default('{}');
            $table->text('url')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('tags')->default('[]');
            $table->foreignId('institution_id')->nullable()->constrained('institutions');
            $table->timestamp('created_at')->useCurrent();
            
            $table->index('user_id');
            $table->index('event');
            $table->index(['auditable_type', 'auditable_id']);
            $table->index('institution_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};