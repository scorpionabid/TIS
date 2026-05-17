<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::whereHas('roles', function($q) { 
    $q->where('name', 'regionoperator'); 
})->first();

if($user) { 
    echo 'User: ' . $user->email . "\n";
    echo 'Roles: ' . $user->roles->pluck('name')->implode(', ') . "\n"; 
} else { 
    echo 'No regionoperator found.' . "\n"; 
}
