<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const CATEGORY_MAP = [
        'hesabat' => 'report',
        'temir' => 'maintenance',
        'tedbir' => 'event',
        'audit' => 'audit',
        'telimat' => 'instruction',
    ];

    private const PRIORITY_MAP = [
        'asagi' => 'low',
        'orta' => 'medium',
        'yuksek' => 'high',
        'tecili' => 'urgent',
    ];

    private const TARGET_SCOPE_MAP = [
        'sectoral' => 'sector',
    ];

    private const CATEGORY_VALUES = [
        'report',
        'maintenance',
        'event',
        'audit',
        'instruction',
        'other',
    ];

    private const PRIORITY_VALUES = [
        'low',
        'medium',
        'high',
        'urgent',
    ];

    private const TARGET_SCOPE_VALUES = [
        'specific',
        'regional',
        'sector',
        'institutional',
        'all',
    ];

    private const LEGACY_CATEGORY_VALUES = [
        'hesabat',
        'temir',
        'tedbir',
        'audit',
        'telimat',
    ];

    private const LEGACY_PRIORITY_VALUES = [
        'asagi',
        'orta',
        'yuksek',
        'tecili',
    ];

    private const LEGACY_TARGET_SCOPE_VALUES = [
        'specific',
        'regional',
        'sectoral',
        'all',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('tasks')) {
            return;
        }

        $this->normalizeTaskEnums();

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $this->refreshPgsqlConstraint('tasks_category_check', 'category', self::CATEGORY_VALUES);
            $this->refreshPgsqlConstraint('tasks_priority_check', 'priority', self::PRIORITY_VALUES);
            $this->refreshPgsqlConstraint('tasks_target_scope_check', 'target_scope', self::TARGET_SCOPE_VALUES);
        } elseif ($driver === 'mysql') {
            $this->updateMysqlEnums(self::CATEGORY_VALUES, self::PRIORITY_VALUES, self::TARGET_SCOPE_VALUES);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('tasks')) {
            return;
        }

        $this->restoreLegacyValues();

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $this->refreshPgsqlConstraint('tasks_category_check', 'category', self::LEGACY_CATEGORY_VALUES);
            $this->refreshPgsqlConstraint('tasks_priority_check', 'priority', self::LEGACY_PRIORITY_VALUES);
            $this->refreshPgsqlConstraint('tasks_target_scope_check', 'target_scope', self::LEGACY_TARGET_SCOPE_VALUES);
        } elseif ($driver === 'mysql') {
            $this->updateMysqlEnums(self::LEGACY_CATEGORY_VALUES, self::LEGACY_PRIORITY_VALUES, self::LEGACY_TARGET_SCOPE_VALUES, true);
        }
    }

    private function normalizeTaskEnums(): void
    {
        foreach (self::CATEGORY_MAP as $from => $to) {
            DB::table('tasks')->where('category', $from)->update(['category' => $to]);
        }

        foreach (self::PRIORITY_MAP as $from => $to) {
            DB::table('tasks')->where('priority', $from)->update(['priority' => $to]);
        }

        foreach (self::TARGET_SCOPE_MAP as $from => $to) {
            DB::table('tasks')->where('target_scope', $from)->update(['target_scope' => $to]);
        }
    }

    private function restoreLegacyValues(): void
    {
        foreach (self::CATEGORY_MAP as $from => $to) {
            DB::table('tasks')->where('category', $to)->update(['category' => $from]);
        }

        // "other" did not exist previously; map back to instruction.
        DB::table('tasks')->where('category', 'other')->update(['category' => 'telimat']);

        foreach (self::PRIORITY_MAP as $from => $to) {
            DB::table('tasks')->where('priority', $to)->update(['priority' => $from]);
        }

        DB::table('tasks')->where('target_scope', 'sector')->update(['target_scope' => 'sectoral']);
        DB::table('tasks')->where('target_scope', 'institutional')->update(['target_scope' => 'specific']);
    }

    private function refreshPgsqlConstraint(string $constraint, string $column, array $values): void
    {
        DB::statement("ALTER TABLE tasks DROP CONSTRAINT IF EXISTS {$constraint}");
        $allowed = $this->formatValuesForSql($values);
        DB::statement("ALTER TABLE tasks ADD CONSTRAINT {$constraint} CHECK ({$column} IN ({$allowed}))");
    }

    private function updateMysqlEnums(array $categories, array $priorities, array $targetScopes, bool $legacy = false): void
    {
        $categoryValues = $this->formatValuesForSql($categories);
        $priorityValues = $this->formatValuesForSql($priorities);
        $scopeValues = $this->formatValuesForSql($targetScopes);
        $priorityDefault = $priorities[1] ?? ($priorities[0] ?? 'medium');
        $scopeDefault = $targetScopes[0] ?? 'specific';

        if ($legacy) {
            DB::statement('ALTER TABLE tasks MODIFY COLUMN category VARCHAR(50) NOT NULL');
            DB::statement('ALTER TABLE tasks MODIFY COLUMN priority VARCHAR(50) NOT NULL');
            DB::statement('ALTER TABLE tasks MODIFY COLUMN target_scope VARCHAR(50) NOT NULL');
        }

        DB::statement("
            ALTER TABLE tasks
            MODIFY COLUMN category ENUM({$categoryValues}) NOT NULL
        ");

        DB::statement("
            ALTER TABLE tasks
            MODIFY COLUMN priority ENUM({$priorityValues}) NOT NULL DEFAULT '{$priorityDefault}'
        ");

        DB::statement("
            ALTER TABLE tasks
            MODIFY COLUMN target_scope ENUM({$scopeValues}) NOT NULL DEFAULT '{$scopeDefault}'
        ");
    }

    private function formatValuesForSql(array $values): string
    {
        return "'" . implode("','", $values) . "'";
    }
};
