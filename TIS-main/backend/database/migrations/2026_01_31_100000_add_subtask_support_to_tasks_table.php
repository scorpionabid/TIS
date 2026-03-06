<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds subtask support to tasks table with parent_id field
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Add parent task reference for subtasks
            $table->unsignedBigInteger('parent_id')->nullable()->after('id');
            $table->foreign('parent_id')
                ->references('id')
                ->on('tasks')
                ->onDelete('cascade');

            // Add position for ordering subtasks
            $table->integer('position')->default(0)->after('parent_id');

            // Add is_milestone flag for important subtasks
            $table->boolean('is_milestone')->default(false)->after('position');

            // Add index for faster queries
            $table->index('parent_id');
            $table->index(['parent_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropIndex(['parent_id']);
            $table->dropIndex(['parent_id', 'position']);
            $table->dropColumn(['parent_id', 'position', 'is_milestone']);
        });
    }
};
