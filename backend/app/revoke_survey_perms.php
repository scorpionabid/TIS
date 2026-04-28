<?php
define('LARAVEL_START', microtime(true));
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Spatie\Permission\Models\Role;

$roleNames = ['schooladmin', 'məktəbadmin'];
foreach ($roleNames as $name) {
    $role = Role::where('name', $name)->first();
    if ($role) {
        echo "Revoking permissions for $name\n";
        $role->revokePermissionTo([
            'surveys.write', 
            'surveys.create', 
            'surveys.update', 
            'surveys.delete', 
            'surveys.publish', 
            'surveys.target'
        ]);
    }
}
echo "Done\n";
