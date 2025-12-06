<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const NEW_LENGTH = 150;
    private const OLD_LENGTH = 50;

    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE institutions ALTER COLUMN short_name TYPE VARCHAR(" . self::NEW_LENGTH . ")");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE institutions MODIFY short_name VARCHAR(" . self::NEW_LENGTH . ") NULL");
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE institutions ALTER COLUMN short_name TYPE VARCHAR(" . self::OLD_LENGTH . ")");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE institutions MODIFY short_name VARCHAR(" . self::OLD_LENGTH . ") NULL");
        }
    }
};
