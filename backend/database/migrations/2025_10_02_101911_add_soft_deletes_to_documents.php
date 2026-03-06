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
        Schema::table('documents', function (Blueprint $table) {
            // Add soft deletes for 30-day recovery window
            $table->softDeletes()->after('updated_at');

            // Flag to control cascade deletion behavior
            $table->boolean('cascade_deletable')->default(true)->after('status');
            // If false, document won't be deleted when folder is deleted
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['deleted_at', 'cascade_deletable']);
        });
    }
};
