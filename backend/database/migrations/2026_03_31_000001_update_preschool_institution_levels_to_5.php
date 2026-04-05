<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update preschool institution types to level 5
        DB::statement("
            UPDATE institution_types 
            SET default_level = 5 
            WHERE key IN ('kindergarten', 'preschool_center', 'nursery')
        ");

        // Update existing institutions to match new levels
        DB::statement("
            UPDATE institutions 
            SET level = 5 
            WHERE type IN ('kindergarten', 'preschool_center', 'nursery')
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to level 4 (original state)
        DB::statement("
            UPDATE institution_types 
            SET default_level = 4 
            WHERE key IN ('kindergarten', 'preschool_center', 'nursery')
        ");

        DB::statement("
            UPDATE institutions 
            SET level = 4 
            WHERE type IN ('kindergarten', 'preschool_center', 'nursery')
        ");
    }
};
