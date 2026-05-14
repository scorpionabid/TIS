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
            // Approval workflow fields
            $table->string('approval_status')->nullable()->after('requires_approval');
            // Values: 'pending', 'approved', 'rejected'

            $table->timestamp('submitted_for_approval_at')->nullable()->after('approval_status');
            $table->text('approval_notes')->nullable()->after('submitted_for_approval_at');

            // Index for filtering by approval status
            $table->index('approval_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['approval_status']);
            $table->dropColumn(['approval_status', 'submitted_for_approval_at', 'approval_notes']);
        });
    }
};
