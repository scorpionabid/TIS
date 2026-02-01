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
        // Check if table already exists (snapshot restore protection)
        if (! Schema::hasTable('permission_audit_logs')) {
            Schema::create('permission_audit_logs', function (Blueprint $table) {
                $table->id();

                // Who performed the action
                $table->foreignId('user_id')
                    ->nullable()
                    ->constrained('users')
                    ->onDelete('set null')
                    ->comment('User who performed the action');

                // Which permission was affected
                $table->foreignId('permission_id')
                    ->constrained('permissions')
                    ->onDelete('cascade')
                    ->comment('Permission that was modified');

                // If permission was assigned/revoked to/from a user
                $table->foreignId('target_user_id')
                    ->nullable()
                    ->constrained('users')
                    ->onDelete('set null')
                    ->comment('User who received/lost the permission');

                // If permission was assigned/revoked to/from a role
                $table->foreignId('target_role_id')
                    ->nullable()
                    ->constrained('roles')
                    ->onDelete('set null')
                    ->comment('Role that received/lost the permission');

                // What action was performed
                $table->enum('action', [
                    'assigned',      // Permission assigned to user/role
                    'revoked',       // Permission revoked from user/role
                    'updated',       // Permission metadata updated
                    'activated',     // Permission activated
                    'deactivated',   // Permission deactivated
                    'scope_changed', // Permission scope changed
                ])->comment('Type of action performed');

                // Change tracking
                $table->json('old_values')->nullable()->comment('Previous values before change');
                $table->json('new_values')->nullable()->comment('New values after change');

                // Security context
                $table->string('ip_address', 45)->nullable()->comment('IP address of the user');
                $table->text('user_agent')->nullable()->comment('Browser user agent');

                // Additional context
                $table->text('reason')->nullable()->comment('Reason for the change');
                $table->text('notes')->nullable()->comment('Additional notes');

                $table->timestamps();

                // Indexes for performance
                $table->index(['permission_id', 'created_at'], 'audit_permission_date_idx');
                $table->index(['user_id', 'created_at'], 'audit_user_date_idx');
                $table->index(['target_user_id', 'created_at'], 'audit_target_user_date_idx');
                $table->index(['target_role_id', 'created_at'], 'audit_target_role_date_idx');
                $table->index(['action', 'created_at'], 'audit_action_date_idx');
                $table->index('created_at', 'audit_created_at_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('permission_audit_logs');
    }
};
