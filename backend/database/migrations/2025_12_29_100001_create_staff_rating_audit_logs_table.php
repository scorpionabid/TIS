<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * STAFF RATING SYSTEM - Audit Log Table
     *
     * Tracks all changes to staff ratings for transparency and accountability
     * - Who changed what rating
     * - When it was changed
     * - Old vs new values
     * - IP address and user agent for security
     */
    public function up(): void
    {
        Schema::create('staff_rating_audit_logs', function (Blueprint $table) {
            $table->id();

            // ════════════════════════════════════════════════════════
            // REFERENCES
            // ════════════════════════════════════════════════════════
            $table->foreignId('rating_id')
                ->nullable()
                ->constrained('staff_ratings')
                ->onDelete('set null')
                ->comment('Reference to rating (NULL if deleted)');

            $table->foreignId('staff_user_id')
                ->constrained('users')
                ->onDelete('cascade')
                ->comment('User whose rating was changed');

            // ════════════════════════════════════════════════════════
            // ACTION DETAILS
            // ════════════════════════════════════════════════════════
            $table->string('action', 20)
                ->comment('created, updated, deleted, auto_calculated, config_changed');

            $table->foreignId('actor_user_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null')
                ->comment('User who performed the action');

            $table->string('actor_role', 50)
                ->nullable()
                ->comment('Role of actor at time of action');

            // ════════════════════════════════════════════════════════
            // CHANGE TRACKING
            // ════════════════════════════════════════════════════════
            $table->decimal('old_score', 3, 2)
                ->nullable()
                ->comment('Previous score');

            $table->decimal('new_score', 3, 2)
                ->nullable()
                ->comment('New score');

            $table->json('old_data')
                ->nullable()
                ->comment('Previous rating data (full object)');

            $table->json('new_data')
                ->nullable()
                ->comment('New rating data (full object)');

            $table->text('change_reason')
                ->nullable()
                ->comment('Reason for change (optional)');

            // ════════════════════════════════════════════════════════
            // REQUEST METADATA (Security)
            // ════════════════════════════════════════════════════════
            $table->string('ip_address', 45)
                ->nullable()
                ->comment('IPv4 or IPv6 address');

            $table->text('user_agent')
                ->nullable()
                ->comment('Browser user agent');

            // ════════════════════════════════════════════════════════
            // TIMESTAMP
            // ════════════════════════════════════════════════════════
            $table->timestamp('created_at')->useCurrent();

            // ════════════════════════════════════════════════════════
            // INDEXES
            // ════════════════════════════════════════════════════════
            $table->index(['staff_user_id', 'created_at'], 'idx_audit_staff_timeline');
            $table->index(['actor_user_id', 'created_at'], 'idx_audit_actor');
            $table->index(['action', 'created_at'], 'idx_audit_action');
            $table->index('rating_id', 'idx_audit_rating');
            $table->index('created_at', 'idx_audit_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_rating_audit_logs');
    }
};
