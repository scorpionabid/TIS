<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * CLEANUP SUBJECTS TABLE:
     * 1. Mark class_level_start/end as DEPRECATED (kept for backward compat, but use grade_levels)
     * 2. Add missing indexes for performance
     * 3. Remove duplicate code index
     * 4. Document correct usage patterns
     *
     * NOTE: We DON'T drop class_level_start/end due to SQLite FK constraints complexity.
     * Instead, we mark them as deprecated and update Model to ignore them.
     */
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            // 1. ADD MISSING INDEXES FOR PERFORMANCE
            // Add index on name for search performance
            if (! $this->indexExists('subjects', 'subjects_name_index')) {
                $table->index('name', 'subjects_name_index');
            }

            // Add composite index for common query pattern: institution + active
            if (! $this->indexExists('subjects', 'subjects_institution_active_index')) {
                $table->index(['institution_id', 'is_active'], 'subjects_institution_active_index');
            }

            // 2. REMOVE DUPLICATE INDEX ON CODE
            // We have both unique and regular index on code - keep only unique
            if ($this->indexExists('subjects', 'subjects_code_index')) {
                $table->dropIndex('subjects_code_index');
            }
        });

        // 3. CLEAR OUT DEPRECATED COLUMNS (set to null)
        // We keep columns for backward compatibility but mark data as deprecated
        DB::table('subjects')->update([
            'class_level_start' => null,
            'class_level_end' => null,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            // Remove added indexes
            if ($this->indexExists('subjects', 'subjects_name_index')) {
                $table->dropIndex('subjects_name_index');
            }
            if ($this->indexExists('subjects', 'subjects_institution_active_index')) {
                $table->dropIndex('subjects_institution_active_index');
            }

            // Restore code index if needed
            if (! $this->indexExists('subjects', 'subjects_code_index') && Schema::hasColumn('subjects', 'code')) {
                $table->index('code', 'subjects_code_index');
            }
        });

        // Note: We don't restore data to class_level_start/end as it was cleared
    }

    /**
     * Check if an index exists on a table.
     */
    private function indexExists(string $table, string $index): bool
    {
        $connection = Schema::getConnection();

        // For SQLite, check using PRAGMA
        if ($connection->getDriverName() === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list({$table})");
            foreach ($indexes as $idx) {
                if ($idx->name === $index) {
                    return true;
                }
            }

            return false;
        }

        // For PostgreSQL
        if ($connection->getDriverName() === 'pgsql') {
            $result = DB::select('SELECT indexname FROM pg_indexes WHERE tablename = ? AND indexname = ?', [$table, $index]);

            return ! empty($result);
        }

        // For MySQL
        if ($connection->getDriverName() === 'mysql') {
            $result = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]);

            return ! empty($result);
        }

        return false;
    }
};
