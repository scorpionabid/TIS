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
     * Helper to get roman numerals for class levels.
     */
    protected function getRomanNumeral(int $level): string
    {
        $map = [1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI', 7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 0 => 'Məktəbəqədər'];
        return $map[$level] ?? (string)$level;
    }
}
