<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

function testAPI() {
    $user = \App\Models\User::find(4);
    if (!$user) die("User 4 not found");
    \Illuminate\Support\Facades\Auth::setUser($user);
    $request = new \Illuminate\Http\Request(['level' => 4, 'parent_id' => 8, 'with_curriculum_stats' => 1]);
    $controller = new \App\Http\Controllers\Institution\InstitutionCRUDController();
    $resp = $controller->index($request);
    $data = json_decode($resp->getContent(), true);

    if (isset($data['data']['data'][0])) {
        print_r($data['data']['data'][0]);
    } else if (isset($data['data'][0])) {
        print_r($data['data'][0]);
    } else {
        echo "No data found\n";
    }
}
testAPI();
