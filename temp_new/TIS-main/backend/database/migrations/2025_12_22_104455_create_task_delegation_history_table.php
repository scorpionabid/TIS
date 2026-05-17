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
        Schema::create('task_delegation_history', function (Blueprint $table) {
            $table->id();

            // Foreign keys
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('assignment_id')->constrained('task_assignments')->onDelete('cascade');

            // Delegation users
            $table->foreignId('delegated_from_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('delegated_to_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('delegated_by_user_id')->constrained('users')->onDelete('cascade');

            // Delegation details
            $table->text('delegation_reason')->nullable();
            $table->timestamp('delegated_at')->useCurrent();

            // Metadata
            $table->json('delegation_metadata')->nullable();

            $table->timestamps();

            // Indexes for performance
            $table->index('task_id');
            $table->index('delegated_from_user_id');
            $table->index('delegated_to_user_id');
            $table->index('delegated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_delegation_history');
    }
};
