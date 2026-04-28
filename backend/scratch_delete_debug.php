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
    // Find the user from the screenshot
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
        
        echo "Calling getAllChildrenIds()...\n";
        $start = microtime(true);
        $childrenIds = $institution->getAllChildrenIds();
        $end = microtime(true);
        
        echo "Success! Found " . count($childrenIds) . " children IDs in " . round($end - $start, 4) . " seconds.\n";
    }
    
    // Test a real link deletion simulation
    $link = LinkShare::where('status', 'active')->first();
    if ($link) {
        echo "Testing with link: " . $link->title . " (Status: " . $link->status . ")\n";
        
        // Simulating the controller logic
        echo "Checking deletion conditions...\n";
        
        if ($link->status !== 'disabled') {
            echo "Condition Failed: Link is not disabled (this would abort with 422)\n";
        }
        
        if ($institution && $institution->level == 2) {
             $userRegionIds = $institution->getAllChildrenIds() ?? [];
             $userRegionIds[] = $institution->id;
             $canDelete = in_array($link->institution_id, $userRegionIds);
             echo "Is link in user region? " . ($canDelete ? 'YES' : 'NO') . "\n";
        }
    }

    echo "ALL LOGIC COMPLETED SUCCESSFULLY!\n";

} catch (\Exception $e) {
    echo "ERROR CAUGHT: " . $e->getMessage() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString() . "\n";
}
