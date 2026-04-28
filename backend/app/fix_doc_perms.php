<?php
define('LARAVEL_START', microtime(true));
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

$roleNames = ['schooladmin', 'məktəbadmin'];
$perms = ['documents.create', 'documents.read', 'documents.update', 'documents.delete'];

// Ensure permissions exist
foreach ($perms as $p) {
    if (!Permission::where('name', $p)->exists()) {
        Permission::create(['name' => $p, 'guard_name' => 'api']);
    }
}

foreach ($roleNames as $name) {
    $role = Role::where('name', $name)->first();
    if ($role) {
        echo "Granting document permissions for $name\n";
        $role->givePermissionTo($perms);
    } else {
        echo "Role $name not found\n";
    }
}
echo "Done\n";
