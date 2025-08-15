<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $subjects = [
            ['name' => 'Riyaziyyat', 'code' => 'MATH', 'category' => 'dəqiq elmlər', 'short_name' => 'Riyaz', 'class_level_start' => 1, 'class_level_end' => 11, 'description' => 'Riyaziyyat fənni'],
            ['name' => 'Azərbaycan dili', 'code' => 'AZE', 'category' => 'humanitar', 'short_name' => 'Az dili', 'class_level_start' => 1, 'class_level_end' => 11, 'description' => 'Azərbaycan dili fənni'],
            ['name' => 'İngilis dili', 'code' => 'ENG', 'category' => 'xarici dillər', 'short_name' => 'İng dili', 'class_level_start' => 2, 'class_level_end' => 11, 'description' => 'İngilis dili fənni'],
            ['name' => 'Fizika', 'code' => 'PHY', 'category' => 'dəqiq elmlər', 'short_name' => 'Fizika', 'class_level_start' => 7, 'class_level_end' => 11, 'description' => 'Fizika fənni'],
            ['name' => 'Kimya', 'code' => 'CHEM', 'category' => 'dəqiq elmlər', 'short_name' => 'Kimya', 'class_level_start' => 8, 'class_level_end' => 11, 'description' => 'Kimya fənni'],
            ['name' => 'Biologiya', 'code' => 'BIO', 'category' => 'təbiət elmləri', 'short_name' => 'Bio', 'class_level_start' => 6, 'class_level_end' => 11, 'description' => 'Biologiya fənni'],
            ['name' => 'Tarix', 'code' => 'HIST', 'category' => 'humanitar', 'short_name' => 'Tarix', 'class_level_start' => 5, 'class_level_end' => 11, 'description' => 'Tarix fənni'],
            ['name' => 'Coğrafiya', 'code' => 'GEO', 'category' => 'təbiət elmləri', 'short_name' => 'Coğr', 'class_level_start' => 6, 'class_level_end' => 11, 'description' => 'Coğrafiya fənni'],
        ];

        DB::table('subjects')->insertOrIgnore($subjects);
    }
}