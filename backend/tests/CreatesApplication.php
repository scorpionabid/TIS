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

        // phpunit.xml sets DB_CONNECTION=sqlite but Laravel's dotenv (.env) may overwrite it
        // during bootstrap. We re-read from phpunit's server vars (set before bootstrap) to
        // determine the intended connection, falling back to env() after bootstrap.
        $defaultConnection = $_SERVER['DB_CONNECTION'] ?? $_ENV['DB_CONNECTION'] ?? env('DB_CONNECTION', config('database.default'));

        if (env('TESTS_DEBUG_DB', false)) {
            fwrite(
                STDERR,
                sprintf(
                    '[TestBootstrap] server(DB_CONNECTION)=%s env(DB_CONNECTION)=%s config_default=%s%s',
                    $_SERVER['DB_CONNECTION'] ?? 'n/a',
                    env('DB_CONNECTION', 'n/a'),
                    config('database.default'),
                    PHP_EOL
                )
            );
        }

        // .env.testing sets DB_CONNECTION=sqlite for the test environment.
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
