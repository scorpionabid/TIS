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
            // For database compatibility, we'll skip complex constraints in migration
            // and handle validation in the application layer instead
            
            // Make username required (validation handled in application)
            $table->string('username', 50)->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Change username back to nullable
            $table->string('username', 50)->nullable()->change();
        });
    }
};