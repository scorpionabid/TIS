<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix the region index that was incorrectly created referencing region_id instead of region_code

        // First check if the old incorrect index exists and drop it
        if ($this->indexExists('institutions', 'institutions_region_idx')) {
            Schema::table('institutions', function (Blueprint $table) {
                $table->dropIndex('institutions_region_idx');
            });
        }

        // Create the correct index using region_code if it doesn't exist
        if (! $this->indexExists('institutions', 'institutions_region_code_idx')) {
            Schema::table('institutions', function (Blueprint $table) {
                $table->index(['region_code'], 'institutions_region_code_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the correct index if it exists
        if ($this->indexExists('institutions', 'institutions_region_code_idx')) {
            Schema::table('institutions', function (Blueprint $table) {
                $table->dropIndex('institutions_region_code_idx');
            });
        }
    }

    /**
     * Check if an index exists on a table
     */
    private function indexExists(string $table, string $indexName): bool
    {
        if (DB::getDriverName() === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list($table)");
            foreach ($indexes as $index) {
                if ($index->name === $indexName) {
                    return true;
                }
            }

            return false;
        }

        // For PostgreSQL and MySQL
        $indexes = DB::select("SHOW INDEX FROM $table WHERE Key_name = ?", [$indexName]);

        return count($indexes) > 0;
    }
};
