<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CopySqliteToPostgres extends Command
{
    protected $signature = 'db:copy-sqlite {sqlite_path}';
    protected $description = 'Copy data from SQLite database to PostgreSQL';

    public function handle()
    {
        $sqlitePath = $this->argument('sqlite_path');

        if (!file_exists($sqlitePath)) {
            $this->error("SQLite file not found: $sqlitePath");
            return 1;
        }

        // Configure temporary SQLite connection
        config(['database.connections.temp_sqlite' => [
            'driver' => 'sqlite',
            'database' => $sqlitePath,
            'prefix' => '',
            'foreign_key_constraints' => false,
        ]]);

        $this->info("🔄 Starting data copy from SQLite to PostgreSQL...");
        $this->info("SQLite: $sqlitePath");
        $this->info("PostgreSQL: " . env('DB_DATABASE'));

        // Get all tables from PostgreSQL
        $pgTables = DB::connection('pgsql')->table('information_schema.tables')
            ->where('table_schema', 'public')
            ->where('table_type', 'BASE TABLE')
            ->whereNotIn('table_name', ['migrations'])
            ->pluck('table_name')
            ->toArray();

        $this->info("Found " . count($pgTables) . " tables to copy");

        $totalRecords = 0;
        $bar = $this->output->createProgressBar(count($pgTables));
        $bar->start();

        foreach ($pgTables as $table) {
            try {
                // Check if table exists in SQLite
                $sqliteTableExists = DB::connection('temp_sqlite')
                    ->table('sqlite_master')
                    ->where('type', 'table')
                    ->where('name', $table)
                    ->exists();

                if (!$sqliteTableExists) {
                    $bar->advance();
                    continue;
                }

                // Disable foreign key checks temporarily
                DB::connection('pgsql')->statement('SET session_replication_role = replica');

                // Get count from SQLite
                $count = DB::connection('temp_sqlite')->table($table)->count();

                if ($count > 0) {
                    // Copy in chunks
                    $chunkSize = 500;
                    $chunks = ceil($count / $chunkSize);

                    for ($i = 0; $i < $chunks; $i++) {
                        $data = DB::connection('temp_sqlite')
                            ->table($table)
                            ->offset($i * $chunkSize)
                            ->limit($chunkSize)
                            ->get()
                            ->map(function ($row) {
                                return (array) $row;
                            })
                            ->toArray();

                        if (!empty($data)) {
                            DB::connection('pgsql')->table($table)->insert($data);
                        }
                    }

                    $totalRecords += $count;
                }

                // Re-enable foreign key checks
                DB::connection('pgsql')->statement('SET session_replication_role = DEFAULT');

            } catch (\Exception $e) {
                $this->warn("\n⚠️  Error copying $table: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // Fix sequences
        $this->info("🔧 Fixing PostgreSQL sequences...");
        $this->fixSequences();

        // Validation
        $this->info("\n✅ Migration Summary:");
        $users = DB::connection('pgsql')->table('users')->count();
        $institutions = DB::connection('pgsql')->table('institutions')->count();
        $activityLogs = DB::connection('pgsql')->table('activity_logs')->count();

        $this->info("Users: $users");
        $this->info("Institutions: $institutions");
        $this->info("Activity Logs: $activityLogs");
        $this->info("Total Records: $totalRecords");

        $this->info("\n🎉 Data copy completed!");

        return 0;
    }

    protected function fixSequences()
    {
        $tables = DB::connection('pgsql')->table('information_schema.tables')
            ->where('table_schema', 'public')
            ->where('table_type', 'BASE TABLE')
            ->pluck('table_name');

        foreach ($tables as $table) {
            try {
                $sequence = "{$table}_id_seq";

                // Check if sequence exists
                $sequenceExists = DB::connection('pgsql')
                    ->table('information_schema.sequences')
                    ->where('sequence_schema', 'public')
                    ->where('sequence_name', $sequence)
                    ->exists();

                if ($sequenceExists) {
                    $maxId = DB::connection('pgsql')->table($table)->max('id') ?? 0;
                    DB::connection('pgsql')->statement("ALTER SEQUENCE {$sequence} RESTART WITH " . ($maxId + 1));
                }
            } catch (\Exception $e) {
                // Ignore errors (table might not have id column)
            }
        }

        $this->info("✅ Sequences fixed");
    }
}
