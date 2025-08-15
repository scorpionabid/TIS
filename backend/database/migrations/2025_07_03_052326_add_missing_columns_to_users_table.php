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
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->unique()->nullable()->after('id');
            $table->foreignId('role_id')->nullable()->after('password');
            $table->foreignId('institution_id')->nullable()->constrained('institutions')->after('role_id');
            $table->boolean('is_active')->default(true)->after('institution_id');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            $table->timestamp('password_changed_at')->useCurrent()->after('last_login_at');
            $table->integer('failed_login_attempts')->default(0)->after('password_changed_at');
            $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');

            // Change existing columns
            $table->string('email', 100)->change();
            $table->string('password', 255)->change();
            $table->timestamp('email_verified_at')->nullable()->change();

            // Rename 'name' to 'full_name' if needed, or remove if 'username' is sufficient
            // $table->renameColumn('name', 'full_name');
            $table->dropColumn('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'role_id', 'institution_id', 'is_active', 'last_login_at', 'password_changed_at', 'failed_login_attempts', 'locked_until']);
            
            // Revert changes to existing columns if necessary
            $table->string('email')->change();
            $table->string('password')->change();
            $table->timestamp('email_verified_at')->nullable()->change();

            // Revert name column if it was renamed/dropped
            $table->string('name')->nullable()->after('id');
        });
    }
};