<?php

use App\Models\Subject;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$s1 = Subject::firstOrCreate(['name' => 'Dərsdənkənar məşğələ'], ['category' => 'elective', 'is_active' => true]);
$s2 = Subject::firstOrCreate(['name' => 'Dərnək məşğələsi'], ['category' => 'elective', 'is_active' => true]);

echo json_encode(['s1' => $s1->id, 's2' => $s2->id]);
