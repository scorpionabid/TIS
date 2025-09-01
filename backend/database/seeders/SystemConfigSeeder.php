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
        DB::table('system_configs')->insertOrIgnore([
            ['key' => 'app.version', 'value' => '"2.0.0"', 'description' => 'Application version', 'type' => 'string'],
            ['key' => 'app.maintenance_mode', 'value' => 'false', 'description' => 'Maintenance mode flag', 'type' => 'boolean'],
            ['key' => 'api.rate_limit_default', 'value' => '200', 'description' => 'Default API rate limit per hour', 'type' => 'integer'],
            ['key' => 'survey.max_file_size', 'value' => '52428800', 'description' => 'Maximum file size in bytes (50MB)', 'type' => 'integer'],
            ['key' => 'session.timeout', 'value' => '28800', 'description' => 'Session timeout in seconds (8 hours)', 'type' => 'integer'],
            ['key' => 'backup.retention_days', 'value' => '30', 'description' => 'Backup retention period in days', 'type' => 'integer'],
        ]);
    }
}