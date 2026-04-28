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
        Schema::table('folder_users', function (Blueprint $table) {
            $table->boolean('can_delete')->default(false)->after('user_id');
            $table->boolean('can_upload')->default(true)->after('can_delete');
            $table->boolean('can_view')->default(true)->after('can_upload');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('folder_users', function (Blueprint $table) {
            $table->dropColumn(['can_delete', 'can_upload', 'can_view']);
        });
    }
};
