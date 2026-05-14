<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Institution;
use App\Helpers\DataIsolationHelper;

$users = User::whereHas('roles', function($q) { $q->where('name', 'sektoradmin'); })->get();

if ($users->isEmpty()) {
    echo "No SektorAdmin users found.\n";
    // Check if it's məktəbadmin or other role name
    $users = User::whereHas('roles', function($q) { $q->where('name', 'like', '%admin%'); })->get();
}

foreach ($users as $user) {
    echo "User: " . $user->email . "\n";
    echo "Institution ID: " . $user->institution_id . "\n";
    $inst = $user->institution;
    if ($inst) {
        echo "  Name: " . $inst->name . " (Level: " . $inst->level . ")\n";
        $allowedIds = DataIsolationHelper::getAllowedInstitutionIds($user)->toArray();
        echo "  Allowed IDs count: " . count($allowedIds) . "\n";
        if (in_array(9, $allowedIds)) {
            echo "  [FOUND] Can access ID 9!\n";
        } else {
            // Find parent of 9
            $school9 = Institution::find(9);
            if ($school9) {
                echo "  School 9 Parent ID: " . $school9->parent_id . "\n";
                if ($school9->parent_id == $inst->id) {
                    echo "  [ERROR] School 9 is a child but NOT in allowedIds!\n";
                }
            }
        }
    }
    echo "-------------------\n";
}
