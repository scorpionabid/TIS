<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

use App\Models\User;
use App\Helpers\DataIsolationHelper;

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = User::whereHas('roles', fn($q) => $q->where('name', 'sektoradmin'))->first();

if (!$user) {
    echo "No SektorAdmin found\n";
    exit;
}

echo "User: {$user->username} (ID: {$user->id}, Institution ID: {$user->institution_id})\n";
$ids = DataIsolationHelper::getAllowedInstitutionIds($user);
echo "Allowed Institution IDs: " . implode(', ', $ids->toArray()) . "\n";

$institutionId = 353;
$canAccess = DataIsolationHelper::canAccessInstitution($user, $institutionId);
echo "Can access institution $institutionId? " . ($canAccess ? "YES" : "NO") . "\n";
