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
        Schema::table('session_activities', function (Blueprint $table) {
            // Only add updated_at if it doesn't exist
            if (!Schema::hasColumn('session_activities', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('session_activities', function (Blueprint $table) {
            // Only drop updated_at if it exists
            if (Schema::hasColumn('session_activities', 'updated_at')) {
                $table->dropColumn('updated_at');
            }
        });
    }
};
