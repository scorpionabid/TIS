<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('system_config')->insertOrIgnore([
            ['key' => 'app.version', 'value' => '"2.0.0"', 'description' => 'Application version', 'is_public' => true],
            ['key' => 'app.maintenance_mode', 'value' => 'false', 'description' => 'Maintenance mode flag', 'is_public' => true],
            ['key' => 'api.rate_limit_default', 'value' => '200', 'description' => 'Default API rate limit per hour', 'is_public' => false],
            ['key' => 'survey.max_file_size', 'value' => '52428800', 'description' => 'Maximum file size in bytes (50MB)', 'is_public' => false],
            ['key' => 'session.timeout', 'value' => '28800', 'description' => 'Session timeout in seconds (8 hours)', 'is_public' => false],
            ['key' => 'backup.retention_days', 'value' => '30', 'description' => 'Backup retention period in days', 'is_public' => false],
        ]);
    }
}