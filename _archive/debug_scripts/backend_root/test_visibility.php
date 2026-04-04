<?php

use App\Models\User;
use App\Models\Institution;
use App\Services\Attendance\RegionalAttendanceService;

// Bootstrap Laravel
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$service = app(RegionalAttendanceService::class);

// Find a regionadmin to test with
$user = User::whereHas('roles', function($q) {
    $q->where('name', 'regionadmin');
})->first();

if (!$user) {
    echo "No regionadmin found.\n";
    exit;
}

echo "Testing for User: " . $user->name . " (Region: " . ($user->institution?->name ?? 'None') . ")\n";

$filters = [];
$startDate = date('Y-m-d', strtotime('-7 days'));
$endDate = date('Y-m-d');

// Reflection to test private resolveInstitutionScope
$reflection = new ReflectionClass($service);
$method = $reflection->getMethod('resolveInstitutionScope');
$method->setAccessible(true);

$scope = $method->invoke($service, $user, $filters, $startDate, $endDate);

echo "Scope School Count: " . count($scope['schools'] ?? []) . "\n";

// Manual check of what SHOULD be in scope
$institution = $user->institution;
if (!$institution) {
    echo "User has no institution.\n";
    exit;
}

$region = $institution;
if ($region->level !== 2 && $region->parent?->level === 2) {
    $region = $region->parent;
}

if ($region->level === 2) {
    echo "Identified Region: " . $region->name . " (ID: " . $region->id . ")\n";
    $allDescendantIds = $region->getAllChildrenIds();
    
    $totalLevel4 = Institution::whereIn('id', $allDescendantIds)
        ->where('level', 4)
        ->count();
        
    $activeLevel4 = Institution::whereIn('id', $allDescendantIds)
        ->where('level', 4)
        ->where('is_active', true)
        ->count();

    $softDeletedLevel4 = Institution::withTrashed()
        ->whereIn('id', $allDescendantIds)
        ->where('level', 4)
        ->whereNotNull('deleted_at')
        ->count();

    echo "DB Stats for this Region:\n";
    echo " - Total Level 4 Schools (in institutions table): " . $totalLevel4 . "\n";
    echo " - Active Level 4 Schools: " . $activeLevel4 . "\n";
    echo " - Soft Deleted Level 4 Schools: " . $softDeletedLevel4 . "\n";
} else {
    echo "Could not identify a Region (level 2) for this user.\n";
}

// Check SchoolGradeStats
$stats = $service->getSchoolGradeStats($user, $filters);
echo "SchoolGradeStats result schools count: " . count($stats['schools'] ?? []) . "\n";

if (count($stats['schools'] ?? []) < $activeLevel4) {
    echo "!!! BUG: Some active schools are missing from the result sets !!!\n";
    
    $resultIds = array_column($stats['schools'] ?? [], 'id');
    $dbActiveIds = Institution::whereIn('id', $allDescendantIds)
        ->where('level', 4)
        ->where('is_active', true)
        ->pluck('id')
        ->toArray();
        
    $missingIds = array_diff($dbActiveIds, $resultIds);
    echo "Missing School IDs: " . implode(', ', $missingIds) . "\n";
    
    if (!empty($missingIds)) {
        $missing = Institution::whereIn('id', $missingIds)->get();
        foreach ($missing as $m) {
            echo " - Missing School: {$m->name} (ID: {$m->id}, Level: {$m->level}, Parent: {$m->parent_id})\n";
        }
    }
} else {
    echo "Success: Result count matches active schools count in DB.\n";
}
