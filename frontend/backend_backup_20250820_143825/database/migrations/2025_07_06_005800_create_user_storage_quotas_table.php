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
        Schema::create('user_storage_quotas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->onDelete('cascade');
            
            // PRD-2: İstifadəçi başına aylıq 100MB limit
            $table->bigInteger('monthly_quota')->default(104857600)->comment('Monthly quota in bytes (default 100MB)');
            $table->bigInteger('current_usage')->default(0)->comment('Current month usage in bytes');
            $table->integer('file_count')->default(0)->comment('Number of files uploaded');
            
            // Quota periods
            $table->date('quota_period_start');
            $table->date('quota_period_end');
            $table->timestamp('last_reset_at')->nullable();
            
            // Usage tracking
            $table->bigInteger('total_uploaded')->default(0)->comment('Total bytes uploaded ever');
            $table->bigInteger('total_downloaded')->default(0)->comment('Total bytes downloaded');
            $table->integer('total_files_uploaded')->default(0);
            $table->integer('total_files_deleted')->default(0);
            
            // Quota management
            $table->boolean('quota_exceeded')->default(false);
            $table->timestamp('quota_exceeded_at')->nullable();
            $table->boolean('quota_warning_sent')->default(false);
            
            // Historical data (JSON for monthly usage history)
            $table->json('usage_history')->nullable()->comment('Monthly usage history');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['user_id', 'quota_period_start']);
            $table->index(['quota_exceeded', 'current_usage']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_storage_quotas');
    }
};