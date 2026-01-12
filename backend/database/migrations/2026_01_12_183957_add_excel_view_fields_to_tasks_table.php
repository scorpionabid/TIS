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
        Schema::table('tasks', function (Blueprint $table) {
            // Add source field - where the task came from
            $table->enum('source', ['dms', 'email', 'whatsapp', 'other'])
                ->nullable()
                ->after('category')
                ->comment('Source of the task: DMS, Email, WhatsApp, or Other');

            // Add deadline_time field - specific time for deadline
            $table->time('deadline_time')
                ->nullable()
                ->after('deadline')
                ->comment('Specific time for deadline (HH:MM format)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['source', 'deadline_time']);
        });
    }
};
