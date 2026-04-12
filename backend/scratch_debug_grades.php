<?php

use App\Models\User;
use App\Models\AcademicYear;
use App\Models\Grade;
use App\Services\InstitutionAccessService;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = User::whereHas('roles', fn($q) => $q->where('name', 'regionoperator'))
    ->where('institution_id', 2)
    ->first();

echo "User: {$user->username} (ID: {$user->id})\n";

$activeYear = AcademicYear::where('is_active', true)->first();
echo "Active Year: " . ($activeYear ? "ID {$activeYear->id} ({$activeYear->name})" : "NONE") . "\n";

$institutionId = 9; // Let's check institution 9
$accessible = InstitutionAccessService::getAccessibleInstitutions($user);
echo "Accessible Institutions Count: " . count($accessible) . "\n";
echo "Is ID $institutionId accessible? " . (in_array($institutionId, $accessible) ? "YES" : "NO") . "\n";

// Run exactly what's in GradeCRUDController::applyFilters
$query = Grade::query();
$query->whereIn('institution_id', $accessible);
$query->where('institution_id', $institutionId);
$query->where('is_active', true);
if ($activeYear) {
    $query->where('academic_year_id', $activeYear->id);
}

echo "Total grades matches (Eloqent): " . $query->count() . "\n";
$firstGrade = $query->first();
if ($firstGrade) {
    echo "First grade: {$firstGrade->name} (School: {$firstGrade->institution_id})\n";
} else {
    echo "NO GRADES FOUND in Eloquent query\n";
    
    // Debug why
    echo "Checking without year filter: " . Grade::where('institution_id', $institutionId)->whereIn('institution_id', $accessible)->count() . "\n";
    echo "Checking without active filter: " . Grade::where('institution_id', $institutionId)->whereIn('institution_id', $accessible)->where('academic_year_id', 3)->count() . "\n";
}
