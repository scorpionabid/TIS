<?php

use App\Models\User;
use App\Services\Attendance\RegionalAttendanceService;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$service = app(RegionalAttendanceService::class);

$user = User::whereHas('roles', function($q) {
    $q->where('name', 'regionadmin');
})->first();

if (!$user) {
    echo "No regionadmin found.\n";
    exit;
}

echo "Testing counts for User: " . $user->name . "\n";

$filters = [];
$overview = $service->getOverview($user, $filters);
$matrix = $service->getSchoolGradeStats($user, $filters);

echo "Overview Schools Count: " . count($overview['schools'] ?? []) . "\n";
echo "Matrix Schools Count: " . count($matrix['schools'] ?? []) . "\n";

if (count($overview['schools'] ?? []) !== count($matrix['schools'] ?? [])) {
    echo "!!! MISMATCH FOUND !!!\n";
} else {
    echo "Counts match.\n";
}
