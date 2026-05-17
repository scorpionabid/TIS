<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithCustomCsvSettings;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class ClassesTemplateExportCSV implements FromArray, WithColumnFormatting, WithCustomCsvSettings, WithHeadings
{
    /**
     * @var \Illuminate\Support\Collection<int, object>
     */
    protected Collection $institutions;

    public function __construct($institutions = null)
    {
        $this->institutions = collect($institutions ?? []);
    }

    /**
     * CSV Template headers aligned with Grades table structure.
     */
    public function headings(): array
    {
        return [
            'UTIS Kod',
            'Müəssisə Kodu',
            'Müəssisə Adı',
            'Sinif Səviyyəsi (1-12)',
            'Sinif index-i (məs: A, r2, 11)',
            'Şagird Sayı',
            'Oğlan Sayı',
            'Qız Sayı',
            'Tədris Dili',
            'Növbə',
            'Tədris Həftəsi',
            'Sinif Rəhbəri (tam ad)',
            'Sinfin Tipi',
            'Profil',
            'Təhsil Proqramı',
            'Tədris İli',
        ];
    }

    /**
     * Generate sample rows using available institutions.
     */
    public function array(): array
    {
        if ($this->institutions->isEmpty()) {
            $placeholder = (object) [
                'utis_code' => 'UTIS001',
                'institution_code' => 'MKT001',
                'name' => 'Nümunə Məktəb',
            ];

            return $this->generateRowsForInstitution($placeholder, 0);
        }

        $rows = [];
        foreach ($this->institutions->take(3) as $index => $institution) {
            $rows = array_merge($rows, $this->generateRowsForInstitution($institution, $index));
        }

        return $rows;
    }

    /**
     * Column formatting to ensure UTIS code stays as text.
     */
    public function columnFormats(): array
    {
        return [
            'A' => NumberFormat::FORMAT_TEXT, // UTIS Kod as text
        ];
    }

    /**
     * Build sample rows for a single institution.
     */
    protected function generateRowsForInstitution(object $institution, int $index): array
    {
        $rows = [];

        // Standard Azerbaijani class
        $rows[] = $this->buildRow($institution, [
            'class_level' => 1,
            'class_index' => 'A',
            'student_count' => 25,
            'male_count' => 13,
            'female_count' => 12,
            'teaching_language' => 'azərbaycan',
            'teaching_shift' => '1 növbə',
            'teaching_week' => '5_günlük',
            'homeroom_teacher' => 'Nümunə Müəllim',
            'class_type' => 'Orta məktəb sinfi',
            'class_profile' => 'Ümumi',
            'education_program' => 'umumi',
        ]);

        // Russian language class
        $rows[] = $this->buildRow($institution, [
            'class_level' => 2,
            'class_index' => 'B',
            'student_count' => 24,
            'male_count' => 12,
            'female_count' => 12,
            'teaching_language' => 'rus',
            'teaching_shift' => '1 növbə',
            'teaching_week' => '5_günlük',
            'homeroom_teacher' => 'Rus Bölməsi Nümunə',
            'class_type' => 'Orta məktəb sinfi',
            'class_profile' => 'Rus bölməsi',
            'education_program' => 'umumi',
        ]);

        if ($index === 0) {
            // Specialized math class
            $rows[] = $this->buildRow($institution, [
                'class_level' => 5,
                'class_index' => 'A',
                'student_count' => 30,
                'male_count' => 15,
                'female_count' => 15,
                'teaching_language' => 'azərbaycan',
                'teaching_shift' => '2 növbə',
                'teaching_week' => '5_günlük',
                'homeroom_teacher' => 'Riyaziyyat müəllimi',
                'class_type' => 'İxtisas sinfi',
                'class_profile' => 'Riyaziyyat',
                'education_program' => 'umumi',
            ]);

            // Special education class
            $rows[] = $this->buildRow($institution, [
                'class_level' => 3,
                'class_index' => 'C',
                'student_count' => 12,
                'male_count' => 7,
                'female_count' => 5,
                'teaching_language' => 'azərbaycan',
                'teaching_shift' => '1 növbə',
                'teaching_week' => '4_günlük',
                'homeroom_teacher' => 'Xüsusi təhsil müəllimi',
                'class_type' => 'Xüsusi sinif',
                'class_profile' => 'İnklüziv',
                'education_program' => 'xususi',
            ]);
        }

        return $rows;
    }

    /**
     * Helper to map associative data to CSV row.
     */
    protected function buildRow(object $institution, array $overrides = []): array
    {
        $academicYear = $this->getAcademicYear();

        $defaults = [
            'utis_code' => $institution->utis_code ?? '',
            'institution_code' => $institution->institution_code ?? '',
            'institution_name' => $institution->name ?? 'Müəssisə',
            'class_level' => 1,
            'class_index' => 'A',
            'student_count' => 25,
            'male_count' => 13,
            'female_count' => 12,
            'teaching_language' => 'azərbaycan',
            'teaching_shift' => '1 növbə',
            'teaching_week' => '5_günlük',
            'homeroom_teacher' => 'Nümunə Müəllim',
            'class_type' => 'Orta məktəb sinfi',
            'class_profile' => 'Ümumi',
            'education_program' => 'umumi',
            'academic_year' => $academicYear,
        ];

        $data = array_merge($defaults, $overrides);

        // Ensure totals stay consistent
        if (! isset($overrides['student_count'])) {
            $data['student_count'] = $data['male_count'] + $data['female_count'];
        }

        return [
            $data['utis_code'],
            $data['institution_code'],
            $data['institution_name'],
            $data['class_level'],
            $data['class_index'],
            $data['student_count'],
            $data['male_count'],
            $data['female_count'],
            $data['teaching_language'],
            $data['teaching_shift'],
            $data['teaching_week'],
            $data['homeroom_teacher'],
            $data['class_type'],
            $data['class_profile'],
            $data['education_program'],
            $data['academic_year'],
        ];
    }

    protected function getAcademicYear(): string
    {
        $year = (int) date('Y');

        return $year . '-' . ($year + 1);
    }

    /**
     * Force UTF-8 BOM so Excel correctly detects Azerbaijani characters.
     */
    public function getCsvSettings(): array
    {
        return [
            'delimiter' => ',',
            'use_bom' => true,
            'enclosure' => '"',
            'line_ending' => "\n",
            'encoding' => 'UTF-8',
        ];
    }
}
