<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication, RefreshDatabase;

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Log::info('TestCase setup completed', [
            'default_connection' => Config::get('database.default'),
            'sqlite_database' => Config::get('database.connections.sqlite.database'),
            'uses_refresh_database' => in_array(RefreshDatabase::class, class_uses_recursive(static::class)),
        ]);
    }

    /**
     * Override the default refresh behaviour to avoid nested transactions on SQLite.
     */
    protected function refreshTestDatabase()
    {
        $this->artisan('migrate:fresh', $this->migrateFreshUsing());
        $this->app[Kernel::class]->setArtisan(null);
    }

    /**
     * Disable wrapping each test inside a transaction (SQLite does not support nested transactions well).
     */
    public function beginDatabaseTransaction()
    {
        // Intentionally left blank to avoid nested transaction issues in tests.
    }
}
