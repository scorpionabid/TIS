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
        Schema::create('report_table_bulk_action_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('report_table_id')->constrained('report_tables')->onDelete('cascade');
            $table->string('action'); // approve, reject, return
            $table->integer('row_count');
            $table->integer('successful_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->json('details')->nullable(); // Additional metadata
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            // Indexes for querying
            $table->index(['user_id', 'created_at']);
            $table->index(['report_table_id', 'created_at']);
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_table_bulk_action_logs');
    }
};
