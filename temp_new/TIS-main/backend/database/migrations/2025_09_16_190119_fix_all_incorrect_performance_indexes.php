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
        // Remove all incorrect indexes that reference non-existent columns

        // Fix surveys table indexes
        if ($this->indexExists('surveys', 'surveys_institution_status_idx')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->dropIndex('surveys_institution_status_idx');
            });
        }

        // Drop the incorrect creator index that uses created_by instead of creator_id
        if ($this->indexExists('surveys', 'surveys_creator_idx')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->dropIndex('surveys_creator_idx');
            });
        }

        // Re-create the correct indexes using the actual schema
        if (! $this->indexExists('surveys', 'surveys_creator_status_idx')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->index(['creator_id', 'status'], 'surveys_creator_status_idx');
            });
        }

        if (! $this->indexExists('surveys', 'surveys_type_status_idx')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->index(['survey_type', 'status'], 'surveys_type_status_idx');
            });
        }

        // Re-create the correct creator index
        if (! $this->indexExists('surveys', 'surveys_creator_idx')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->index(['creator_id'], 'surveys_creator_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the correct indexes
        if ($this->indexExists('surveys', 'surveys_creator_status_idx')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->dropIndex('surveys_creator_status_idx');
            });
        }

        if ($this->indexExists('surveys', 'surveys_type_status_idx')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->dropIndex('surveys_type_status_idx');
            });
        }

        if ($this->indexExists('surveys', 'surveys_creator_idx')) {
            Schema::table('surveys', function (Blueprint $table) {
                $table->dropIndex('surveys_creator_idx');
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

        if (DB::getDriverName() === 'pgsql') {
            $indexes = DB::select(
                'SELECT 1 FROM pg_indexes WHERE schemaname = ANY (current_schemas(false)) AND tablename = ? AND indexname = ?',
                [$table, $indexName]
            );

            return count($indexes) > 0;
        }

        // For MySQL (default)
        $indexes = DB::select("SHOW INDEX FROM $table WHERE Key_name = ?", [$indexName]);

        return count($indexes) > 0;
    }
};
