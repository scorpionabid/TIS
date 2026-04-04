<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Institution\InstitutionCRUDController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

function testUser($userId, $level = 4, $parentId = null)
{
    echo "--- Testing User ID: $userId | Level: $level | Parent ID: " . ($parentId ?? 'NULL') . " ---\n";
    $user = User::find($userId);
    if (! $user) {
        echo "User not found!\n";

        return;
    }
    Auth::setUser($user);
    $params = ['level' => $level];
    if ($parentId) {
        $params['parent_id'] = $parentId;
    }

    $request = new Request($params);
    $controller = new InstitutionCRUDController;
    $response = $controller->index($request);
    $data = json_decode($response->getContent(), true);

    $count = isset($data['data']) ? count($data['data']) : 0;
    // Check for Laravel resource mapping
    if (isset($data['data']) && is_array($data['data']) && isset($data['data'][0])) {
        $count = count($data['data']);
    } elseif (isset($data['data']['data'])) {
        $count = count($data['data']['data']);
    }

    echo "Result Count: $count\n";
    if ($count > 0) {
        $first = isset($data['data']['data']) ? $data['data']['data'][0] : $data['data'][0];
        echo 'First Institution: ' . $first['name'] . ' (ID: ' . $first['id'] . ")\n";
    }
    echo "\n";
}

try {
    testUser(4, 4, 8); // SektorAdmin Qabala
} catch (\Exception $e) {
    echo 'ERROR: ' . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
