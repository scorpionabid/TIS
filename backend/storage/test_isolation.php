<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Grade;
use App\Helpers\DataIsolationHelper;

// Check SektorAdmin (Gabala ID 4) and School 9
$user = User::with('institution')->find(4);
if (!$user) {
    echo "User 4 not found\n"; exit(1);
}

echo "User: " . $user->username . "\n";
echo "Inst: " . $user->institution_id . " Level: " . ($user->institution->level ?? 'NULL') . "\n";

$allowedIds = DataIsolationHelper::getAllowedInstitutionIds($user);
echo "Allowed Count: " . $allowedIds->count() . "\n";
echo "Contains 9? " . ($allowedIds->contains(9) ? 'YES' : 'NO') . "\n";

// Manual Query simulation
$query = Grade::withoutGlobalScopes()->whereIn('institution_id', $allowedIds->toArray())
    ->where('institution_id', 9)
    ->where('academic_year_id', 3);
    
echo "SQL: " . $query->toSql() . "\n";
echo "Grades Found: " . $query->get()->count() . "\n";
