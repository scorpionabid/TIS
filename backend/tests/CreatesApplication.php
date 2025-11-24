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

        // Set the default database connection to SQLite (file-based) for testing
        $databasePath = database_path('testing.sqlite');
        if (! file_exists($databasePath)) {
            touch($databasePath);
        }

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => $databasePath,
            'database.connections.sqlite.foreign_key_constraints' => true,
        ]);

        // Enable foreign key constraints for SQLite
        if (config('database.default') === 'sqlite') {
            $db = app()->make('db');
            $db->connection()->getPdo()->exec('PRAGMA foreign_keys=on');
        }

        return $app;
    }
}
