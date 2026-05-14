<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Institution;
use App\Helpers\DataIsolationHelper;

$email = 'sektor_admin@atis.edu.az';
$user = User::where('email', $email)->first();

if (!$user) {
    die("User not found: $email\n");
}

echo "User: " . $user->email . "\n";
echo "Role: " . implode(', ', $user->getRoleNames()->toArray()) . "\n";
echo "User Institution ID: " . $user->institution_id . "\n";

$inst = $user->institution;
if ($inst) {
    echo "Institution Name: " . $inst->name . "\n";
    echo "Institution Level: " . $inst->level . "\n";
    echo "Institution Parent ID: " . $inst->parent_id . "\n";
    
    $childrenIds = $inst->getAllChildrenIds();
    echo "Children IDs: " . implode(', ', $childrenIds) . "\n";
    
    $allowedIds = DataIsolationHelper::getAllowedInstitutionIds($user)->toArray();
    echo "Allowed Institution IDs: " . implode(', ', $allowedIds) . "\n";
    
    $targetId = 9;
    echo "Can access ID $targetId? " . (in_array($targetId, $allowedIds) ? "YES" : "NO") . "\n";
} else {
    echo "Institution not found for user.\n";
}
