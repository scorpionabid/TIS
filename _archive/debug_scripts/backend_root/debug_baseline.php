<?php
use App\Models\User;
use App\Models\Institution;
use App\Services\Attendance\RegionalAttendanceService;
use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$service = app(RegionalAttendanceService::class);
$user = User::whereHas('roles', fn($q) => $q->where('name', 'regionadmin'))->first();

if (!$user) {
    echo "No regionadmin found.\n";
    exit;
}

$filters = [
    'start_date' => '2026-04-01',
    'end_date' => '2026-04-03',
];

$res = $service->getSchoolsWithMissingReports($user, $filters);
echo json_encode([
    'baseline' => $res['summary']['period']['baseline_days'],
    'school_days' => $res['summary']['period']['expected_school_days'] ?? 'N/A',
    'total_schools' => $res['summary']['total_schools'],
    'sample_missing' => array_slice($res['schools'], 0, 3)
], JSON_PRETTY_PRINT);
