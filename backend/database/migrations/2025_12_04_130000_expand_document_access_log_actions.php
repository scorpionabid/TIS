<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const LEGACY_ACTIONS = [
        'view',
        'download',
        'share',
        'upload',
    ];

    private const EXPANDED_ACTIONS = [
        'view',
        'download',
        'share',
        'upload',
        'update',
        'delete',
        'preview',
        'create_public_link',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('document_access_logs')) {
            return;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $this->refreshPostgresCheckConstraint(self::EXPANDED_ACTIONS);
        } elseif ($driver === 'mysql') {
            $this->updateMysqlEnum(self::EXPANDED_ACTIONS);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('document_access_logs')) {
            return;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $this->refreshPostgresCheckConstraint(self::LEGACY_ACTIONS);
        } elseif ($driver === 'mysql') {
            $this->updateMysqlEnum(self::LEGACY_ACTIONS);
        }
    }

    private function refreshPostgresCheckConstraint(array $actions): void
    {
        DB::statement('ALTER TABLE document_access_logs DROP CONSTRAINT IF EXISTS document_access_logs_access_type_check');

        $values = $this->formatValuesForSql($actions);
        DB::statement("ALTER TABLE document_access_logs ADD CONSTRAINT document_access_logs_access_type_check CHECK (access_type IN ({$values}))");
    }

    private function updateMysqlEnum(array $actions): void
    {
        $values = $this->formatValuesForSql($actions);
        DB::statement("ALTER TABLE document_access_logs MODIFY COLUMN access_type ENUM({$values}) NOT NULL DEFAULT 'view'");
    }

    private function formatValuesForSql(array $actions): string
    {
        return "'" . implode("','", $actions) . "'";
    }
};
