<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add target_users column to link_shares table for specific user targeting
     * PRODUCTION SAFE: This is a nullable column addition with no data modification
     */
    public function up(): void
    {
        Schema::table('link_shares', function (Blueprint $table) {
            // Add specific user targeting (array of user IDs)
            $table->json('target_users')->nullable()->after('target_departments')
                ->comment('Array of user IDs who can access this link');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('link_shares', function (Blueprint $table) {
            $table->dropColumn('target_users');
        });
    }
};
