<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Services\Attendance\RegionalAttendanceService;

$user = User::whereHas('roles', fn ($q) => $q->where('name', 'regionadmin'))->first();
$service = app(RegionalAttendanceService::class);
$result = $service->getOverview($user, ['start_date' => '2026-03-03', 'end_date' => '2026-03-06']);

echo "SUMMARY:\n";
echo 'Total Students: ' . $result['summary']['total_students'] . "\n";
echo 'Attending Students: ' . $result['summary']['attending_students'] . "\n";
echo 'Attendance Rate: ' . $result['summary']['average_attendance_rate'] . "%\n";

echo "\nSECTOR TOP 3:\n";
foreach (array_slice($result['sectors'], 0, 3) as $s) {
    echo $s['name'] . ': ' . $s['attending_students'] . ' / ' . $s['total_students'] . "\n";
}
