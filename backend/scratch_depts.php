<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    $departments = DB::table('department_types')->select('id', 'name', 'label')->get();
    echo "Departments: " . json_encode($departments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    
    $sectors = DB::table('institutions')->where('type', 'sector')->select('id', 'name')->get();
    echo "Sectors Count: " . count($sectors) . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
