<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const NEW_LENGTH = 20;

    private const OLD_LENGTH = 8;

    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE institutions ALTER COLUMN utis_code TYPE VARCHAR(' . self::NEW_LENGTH . ')');
        } elseif ($driver === 'mysql') {
            DB::statement('ALTER TABLE institutions MODIFY utis_code VARCHAR(' . self::NEW_LENGTH . ') NULL');
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE institutions ALTER COLUMN utis_code TYPE VARCHAR(' . self::OLD_LENGTH . ')');
        } elseif ($driver === 'mysql') {
            DB::statement('ALTER TABLE institutions MODIFY utis_code VARCHAR(' . self::OLD_LENGTH . ') NULL');
        }
    }
};
