<?php

namespace App\Services\Attendance;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class AttendanceExportService
{
    use AttendanceScopeTrait;

    protected $statsService;

    public function __construct(AttendanceStatsService $statsService)
    {
        $this->statsService = $statsService;
    }

    /**
     * Export schools with missing reports to a standardized array format.
     */
    public function exportMissingReports(User $user, array $filters): array
    {
        $data = $this->statsService->getSchoolsWithMissingReports($user, $filters);

        $headers = [
            'Məktəb adı',
            'Doldurulma sayı',
            'Çatışmayan gün sayı',
            'Son hesabat tarixi',
        ];

        $rows = [$headers];
        foreach ($data['schools'] as $school) {
            $rows[] = [
                $school['name'],
                $school['reported_days'],
                $school['missing_days'],
                $school['last_report_date'] ?? 'Hesabat yoxdur',
            ];
        }

        return [
            'filename' => 'doldurmayan_mektebler_' . $data['summary']['period']['start_date'] . '_' . $data['summary']['period']['end_date'] . '.xlsx',
            'data' => $rows,
        ];
    }

    /**
     * Export grade level statistics as array for Excel.
     */
    public function exportGradeLevelStats(User $user, array $filters = []): array
    {
        $data = $this->statsService->getGradeLevelStats($user, $filters);

        $rows = [];
        $rows[] = ['Sinif', 'Şagird sayı', 'Məktəb sayı', 'Orta davamiyyət (%)', 'Məktəbli forma (%)'];

        foreach ($data['grade_levels'] as $level) {
            if ($level['student_count'] > 0) {
                $rows[] = [
                    $level['class_level_display'],
                    $level['student_count'],
                    $level['school_count'],
                    $level['average_attendance_rate'] . '%',
                    $level['uniform_compliance_rate'] . '%',
                ];
            }
        }

        $rows[] = [];
        $rows[] = ['Ümumi mılumat'];
        $rows[] = ['Ümumi şagird sayı', $data['summary']['total_students']];
        $rows[] = ['Məktəb sayı', $data['summary']['total_schools']];
        $rows[] = ['Orta davamiyyət', $data['summary']['overall_average_attendance'] . '%'];
        $rows[] = ['Hesabat dövrü', $data['summary']['period']['start_date'] . ' - ' . $data['summary']['period']['end_date']];

        return [
            'filename' => 'sinif_statistikasi_' . $data['summary']['period']['start_date'] . '_' . $data['summary']['period']['end_date'] . '.xlsx',
            'data' => $rows,
        ];
    }

    /**
     * Export school and grade level matrix statistics to Excel.
     */
    public function exportSchoolGradeStats(User $user, array $filters = []): array
    {
        $data = $this->statsService->getSchoolGradeStats($user, $filters);

        $headers = ['Məktəb adı'];
        for ($i = 0; $i <= 11; $i++) {
            $headers[] = $this->getRomanNumeral($i);
        }
        $headers[] = 'Orta';

        $rows = [$headers];

        foreach ($data['schools'] as $school) {
            $row = [$school['name']];
            $validRates = [];
            foreach ($school['grades'] as $rate) {
                if ($rate !== null) $validRates[] = $rate;
                $row[] = $rate !== null ? $rate . '%' : '-';
            }
            $row[] = count($validRates) > 0 ? round(array_sum($validRates) / count($validRates), 2) . '%' : '-';
            $rows[] = $row;
        }

        $avgRow = ['Orta (Region)'];
        $regRates = [];
        foreach ($data['regional_averages'] as $rate) {
            if ($rate !== null) $regRates[] = $rate;
            $avgRow[] = $rate !== null ? $rate . '%' : '-';
        }
        $avgRow[] = count($regRates) > 0 ? round(array_sum($regRates) / count($regRates), 2) . '%' : '-';
        $rows[] = $avgRow;

        return [
            'filename' => 'mekteb_sinif_statistikasi_' . $data['period']['start_date'] . '_' . $data['period']['end_date'] . '.xlsx',
            'data' => $rows,
        ];
    }

    /**
     * Helper to get roman numerals for class levels.
     */
    protected function getRomanNumeral(int $level): string
    {
        $map = [1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI', 7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 0 => 'Məktəbəqədər'];
        return $map[$level] ?? (string)$level;
    }
}
