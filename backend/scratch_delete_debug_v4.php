<?php

use App\Models\LinkShare;
use App\Models\User;
use App\Models\Institution;
use Illuminate\Support\Facades\Auth;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "--- STARTING DEBUG V4 ---\n";
    
    // Find Alqis user
    $user = User::where('first_name', 'LIKE', '%Alqış%')->first();
    if (!$user) {
        echo "User Alqis not found.\n";
        exit;
    }
    echo "Found User: " . $user->first_name . " " . $user->last_name . " (ID: " . $user->id . ")\n";
    
    $institution = $user->institution;
    if (!$institution) {
        echo "User has no institution.\n";
    } else {
        echo "Institution: " . $institution->name . " (Level: " . $institution->level . ")\n";
    }
    
    // Find a link (any link)
    $link = LinkShare::first();
    if (!$link) {
        echo "No links found.\n";
        exit;
    }
    echo "Testing with link: " . $link->title . " (ID: " . $link->id . ", Inst: " . $link->institution_id . ")\n";
    
    // Simulate the exact code from LinkShareCrudController line 265
    echo "Simulating permission check...\n";
    
    // Helpers simulation
    $canViewAll = false; // Simulating canViewAllLinks
    $isCreator = ($link->shared_by === $user->id);
    
    $isRegionAdmin = $user->hasRole('regionadmin');
    echo "Is Region Admin? " . ($isRegionAdmin ? 'YES' : 'NO') . "\n";
    
    $isInRegion = false;
    if ($isRegionAdmin && $institution && $institution->level == 2) {
        echo "Checking isLinkInUserRegion...\n";
        $childrenIds = $institution->getAllChildrenIds() ?? [];
        echo "Found " . count($childrenIds) . " children.\n";
        $childrenIds[] = $institution->id;
        $isInRegion = in_array($link->institution_id, $childrenIds);
    }
    
    $canDelete = $canViewAll || $isCreator || $isInRegion;
    echo "Final canDelete result: " . ($canDelete ? 'ALLOW' : 'DENY') . "\n";
    
    echo "--- ALL LOGIC COMPLETED --- \n";

} catch (\Exception $e) {
    echo "ERROR CAUGHT: " . $e->getMessage() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString() . "\n";
}
