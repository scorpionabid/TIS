<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;

/**
 * Creates an application for testing purposes.
 */
trait CreatesApplication
{
    /**
     * Creates the application.
     *
     * @return \Illuminate\Foundation\Application
     */
    public function createApplication()
    {
        $app = require __DIR__ . '/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        $defaultConnection = env('DB_CONNECTION', config('database.default'));

        if (env('TESTS_DEBUG_DB', false)) {
            fwrite(
                STDERR,
                sprintf(
                    '[TestBootstrap] env(DB_CONNECTION)=%s config_default=%s%s',
                    $defaultConnection,
                    config('database.default'),
                    PHP_EOL
                )
            );
        }

        // Note: .env.testing configures DB_CONNECTION=pgsql
        // Tests run against PostgreSQL in Docker. SQLite support kept for legacy/local development if needed.
        if ($defaultConnection === 'sqlite') {
            $databasePath = env('DB_DATABASE', database_path('testing.sqlite'));

            if ($databasePath !== ':memory:') {
                // Always recreate the SQLite testing database to avoid stale / corrupted files
                if (file_exists($databasePath)) {
                    @unlink($databasePath);
                }
                touch($databasePath);
            }

            config([
                'database.default' => 'sqlite',
                'database.connections.sqlite.database' => $databasePath,
                'database.connections.sqlite.foreign_key_constraints' => true,
            ]);

            $db = app()->make('db');
            $db->connection()->getPdo()->exec('PRAGMA foreign_keys=on');
        } else {
            config(['database.default' => $defaultConnection]);
        }

        return $app;
    }
}
