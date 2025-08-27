<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication, RefreshDatabase;
    
    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();
        
        // Configure SQLite for testing with a unique database file
        $testDbPath = storage_path('testing.sqlite');
        
        // Delete the test database file if it exists
        if (file_exists($testDbPath)) {
            unlink($testDbPath);
        }
        
        // Create a new test database file
        touch($testDbPath);
        
        // Configure the database connection
        config([
            'database.connections.sqlite.database' => $testDbPath,
            'database.connections.sqlite.foreign_key_constraints' => true,
        ]);
        
        // Run migrations
        $this->artisan('migrate:fresh', ['--force' => true]);
    }
    
    /**
     * Define a database refresh strategy (migration-based)
     */
    protected function refreshTestDatabase()
    {
        if (! RefreshDatabaseState::$migrated) {
            // First drop all tables to ensure clean state
            $tables = \DB::select('SELECT name FROM sqlite_master WHERE type="table" AND name!="sqlite_sequence"');
            \DB::statement('PRAGMA foreign_keys=off');
            
            foreach ($tables as $table) {
                \DB::statement('DROP TABLE IF EXISTS ' . $table->name);
            }
            
            \DB::statement('PRAGMA foreign_keys=on');
            
            // Now run migrations fresh
            $this->artisan('migrate:fresh', ['--force' => true]);
            
            // Clear any cached schema
            if (file_exists($path = base_path('bootstrap/cache/packages.php'))) {
                unlink($path);
            }
            if (file_exists($path = base_path('bootstrap/cache/services.php'))) {
                unlink($path);
            }
            
            RefreshDatabaseState::$migrated = true;
        }
    }
}
