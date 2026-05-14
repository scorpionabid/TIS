<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Institution;
use App\Helpers\DataIsolationHelper;

$goranboyId = 8;
$school9Id = 9;

$inst8 = Institution::find($goranboyId);
$school9 = Institution::find($school9Id);

if (!$inst8) die("Institution 8 (Goranboy) not found.\n");
if (!$school9) die("School 9 not found.\n");

echo "Institution 8: " . $inst8->name . " (Level: " . $inst8->level . ")\n";
echo "School 9 Parent ID: " . $school9->parent_id . "\n";

$children8 = $inst8->getAllChildrenIds();
echo "Goranboy Children IDs: " . implode(', ', $children8) . "\n";
echo "Is School 9 in Children IDs? " . (in_array($school9Id, $children8) ? "YES" : "NO") . "\n";

$users = User::whereHas('roles', function($q) { $q->where('name', 'sektoradmin'); })
             ->where('institution_id', $goranboyId)
             ->get();

if ($users->isEmpty()) {
    echo "No SektorAdmin found for Goranboy.\n";
    // Check ALL users for Goranboy
    $users = User::where('institution_id', $goranboyId)->get();
    foreach ($users as $u) {
        echo "  Other User: " . $u->email . " (Roles: " . implode(',', $u->getRoleNames()->toArray()) . ")\n";
    }
} else {
    foreach ($users as $user) {
        echo "SektorAdmin: " . $user->email . "\n";
        $allowed = DataIsolationHelper::getAllowedInstitutionIds($user)->toArray();
        echo "  Allowed Institutions: " . count($allowed) . "\n";
        echo "  Can access School 9? " . (in_array($school9Id, $allowed) ? "YES" : "NO") . "\n";
    }
}
