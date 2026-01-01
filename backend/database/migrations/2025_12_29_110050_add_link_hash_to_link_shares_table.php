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
        Schema::table('link_shares', function (Blueprint $table) {
            $table->string('link_hash', 32)->unique()->nullable()->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('link_shares', function (Blueprint $table) {
            $table->dropUnique(['link_hash']);
            $table->dropColumn('link_hash');
        });
    }
};
