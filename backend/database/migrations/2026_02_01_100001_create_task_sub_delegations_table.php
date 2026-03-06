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
        Schema::create('task_sub_delegations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->onDelete('cascade');
            $table->foreignId('parent_assignment_id')->constrained('task_assignments')->onDelete('cascade');
            $table->foreignId('delegated_to_user_id')->constrained('users');
            $table->foreignId('delegated_to_institution_id')->nullable()->constrained('institutions');
            $table->foreignId('delegated_by_user_id')->constrained('users');

            $table->enum('status', ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'])
                  ->default('pending');
            $table->unsignedTinyInteger('progress')->default(0);

            $table->timestamp('deadline')->nullable();
            $table->text('delegation_notes')->nullable();
            $table->text('completion_notes')->nullable();
            $table->json('completion_data')->nullable();

            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['task_id', 'status']);
            $table->index(['delegated_to_user_id', 'status']);
            $table->index(['parent_assignment_id']);
            $table->index(['delegated_by_user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_sub_delegations');
    }
};
