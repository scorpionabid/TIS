<?php

/**
 * SQLite to PostgreSQL Data Migration Script
 * This script reads from SQLite backup and writes to PostgreSQL
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🔄 Starting SQLite to PostgreSQL migration...\n\n";

// SQLite database path (inside container)
$sqlitePath = '/app/archive/sqlite/snapshots/TIS/backend/database/database.sqlite';

if (! file_exists($sqlitePath)) {
    exit("❌ SQLite file not found at: $sqlitePath\n");
}

// Create SQLite connection
config(['database.connections.sqlite_backup' => [
    'driver' => 'sqlite',
    'database' => $sqlitePath,
    'prefix' => '',
]]);

try {
    // Test connections
    echo "🔍 Testing connections...\n";
    $sqliteConnection = DB::connection('sqlite_backup');
    $postgresConnection = DB::connection('pgsql');

    $sqliteUserCount = $sqliteConnection->table('users')->count();
    $postgresUserCount = $postgresConnection->table('users')->count();

    echo "   SQLite users: $sqliteUserCount\n";
    echo "   PostgreSQL users (current): $postgresUserCount\n\n";

    if ($sqliteUserCount == 0) {
        exit("❌ No users found in SQLite backup\n");
    }

    // Confirm migration
    echo "⚠️  This will REPLACE all data in PostgreSQL with SQLite backup data.\n";
    echo "   Do you want to continue? This cannot be undone!\n";
    echo "   Type 'YES' to continue: ";

    $handle = fopen('php://stdin', 'r');
    $line = trim(fgets($handle));
    fclose($handle);

    if ($line !== 'YES') {
        exit("❌ Migration cancelled\n");
    }

    echo "\n🔄 Starting data migration...\n\n";

    // Disable foreign key checks
    DB::statement('SET CONSTRAINTS ALL DEFERRED');

    // Get all tables from SQLite
    $tables = $sqliteConnection->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

    // Tables to skip (too large or not needed)
    $skipTables = ['migrations', 'audit_logs', 'security_events', 'activity_logs', 'system_logs'];

    // Tables that must be migrated in order (dependencies)
    $orderedTables = [
        'roles',
        'permissions',
        'role_has_permissions',
        'institution_types',
        'institutions',
        'departments',
        'users',
        'user_profiles',
        'model_has_roles',
        'model_has_permissions',
    ];

    // Migrate ordered tables first
    foreach ($orderedTables as $tableName) {
        if (in_array($tableName, $skipTables)) {
            continue;
        }

        echo "📋 Processing table: $tableName (ordered)\n";

        try {
            $count = $sqliteConnection->table($tableName)->count();

            if ($count === 0) {
                echo "   ⚠️  No data in table\n\n";

                continue;
            }

            // Truncate PostgreSQL table
            DB::statement("TRUNCATE TABLE $tableName RESTART IDENTITY CASCADE");

            // Migrate in chunks using chunk method (memory efficient)
            $migrated = 0;
            $sqliteConnection->table($tableName)->orderBy('id')->chunk(500, function ($rows) use ($postgresConnection, $tableName, &$migrated) {
                $dataArray = array_map(function ($item) {
                    return (array) $item;
                }, $rows->toArray());

                $postgresConnection->table($tableName)->insert($dataArray);
                $migrated += count($dataArray);
            });

            echo "   ✅ Migrated $migrated records\n\n";
        } catch (\Exception $e) {
            echo '   ❌ Error: ' . $e->getMessage() . "\n\n";
            // Continue with other tables instead of stopping
        }
    }

    // Migrate remaining tables
    foreach ($tables as $table) {
        $tableName = $table->name;

        // Skip already processed or excluded tables
        if (in_array($tableName, $skipTables) || in_array($tableName, $orderedTables)) {
            continue;
        }

        echo "📋 Processing table: $tableName\n";

        try {
            $count = $sqliteConnection->table($tableName)->count();

            if ($count === 0) {
                echo "   ⚠️  No data in table\n\n";

                continue;
            }

            // Skip very large tables
            if ($count > 10000) {
                echo "   ⚠️  Table too large ($count records), skipping for performance\n\n";

                continue;
            }

            // Truncate PostgreSQL table
            DB::statement("TRUNCATE TABLE $tableName RESTART IDENTITY CASCADE");

            // Migrate in chunks
            $migrated = 0;
            $sqliteConnection->table($tableName)->chunk(500, function ($rows) use ($postgresConnection, $tableName, &$migrated) {
                $dataArray = array_map(function ($item) {
                    return (array) $item;
                }, $rows->toArray());

                $postgresConnection->table($tableName)->insert($dataArray);
                $migrated += count($dataArray);
            });

            echo "   ✅ Migrated $migrated records\n\n";
        } catch (\Exception $e) {
            echo '   ❌ Error: ' . $e->getMessage() . "\n\n";
        }
    }

    // Reset sequences
    echo "🔄 Resetting sequences...\n";
    $sequences = $postgresConnection->select("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'");

    foreach ($sequences as $seq) {
        $seqName = $seq->sequence_name;
        $tableName = str_replace('_id_seq', '', $seqName);

        try {
            $maxId = $postgresConnection->table($tableName)->max('id');
            if ($maxId) {
                $postgresConnection->statement("SELECT setval('$seqName', $maxId)");
                echo "   ✅ Reset $seqName to $maxId\n";
            }
        } catch (\Exception $e) {
            // Skip if table doesn't exist or doesn't have id column
        }
    }

    echo "\n✅ Migration completed successfully!\n\n";

    // Show statistics
    echo "📊 Final statistics:\n";
    $finalUserCount = $postgresConnection->table('users')->count();
    $finalInstitutionCount = $postgresConnection->table('institutions')->count();

    echo "   Users: $finalUserCount\n";
    echo "   Institutions: $finalInstitutionCount\n";
} catch (\Exception $e) {
    echo '❌ Migration failed: ' . $e->getMessage() . "\n";
    exit(1);
}
