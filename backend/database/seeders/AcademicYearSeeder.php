<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AcademicYearSeeder extends Seeder
{
    public function run(): void
    {
        $years = [
            ['name' => '2023-2024', 'start_date' => '2023-09-01', 'end_date' => '2024-06-30', 'is_active' => false],
            ['name' => '2024-2025', 'start_date' => '2024-09-01', 'end_date' => '2025-06-30', 'is_active' => false],
            ['name' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'is_active' => true],
            ['name' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_active' => false],
            ['name' => '2027-2028', 'start_date' => '2027-09-01', 'end_date' => '2028-06-30', 'is_active' => false],
        ];

        foreach ($years as $year) {
            AcademicYear::updateOrCreate(['name' => $year['name']], $year);
        }

        // Aktiv il üçün academic_terms
        $currentYear = AcademicYear::where('is_active', true)->first();
        if ($currentYear) {
            $terms = [
                [
                    'name' => 'I Yarımil',
                    'start_date' => '2025-09-01',
                    'end_date' => '2026-01-31',
                    'academic_year' => $currentYear->name,
                    'is_active' => true,
                    'created_at' => now(),
                ],
                [
                    'name' => 'II Yarımil',
                    'start_date' => '2026-02-01',
                    'end_date' => '2026-06-30',
                    'academic_year' => $currentYear->name,
                    'is_active' => false,
                    'created_at' => now(),
                ],
            ];

            foreach ($terms as $term) {
                DB::table('academic_terms')->updateOrInsert(
                    ['name' => $term['name'], 'academic_year' => $term['academic_year']],
                    $term
                );
            }
        }

        $this->command->info('✅ AcademicYears: ' . AcademicYear::count() . ' sətir');
        $this->command->info('✅ AcademicTerms: ' . DB::table('academic_terms')->count() . ' sətir');
        $this->command->info('✅ Aktiv il: ' . ($currentYear->name ?? 'yoxdur'));
    }
}
