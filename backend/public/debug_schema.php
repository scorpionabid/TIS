<?php
// Since this is in public, I need to go up one level
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\Document;

header('Content-Type: text/plain');

try {
    $column = DB::select("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'accessible_institutions'");
    echo "Column Info: " . json_encode($column) . "\n";

    $sample = Document::whereNotNull('accessible_institutions')->limit(1)->first();
    if ($sample) {
        echo "Sample accessible_institutions: " . json_encode($sample->accessible_institutions) . " (Type: " . gettype($sample->accessible_institutions) . ")\n";
    } else {
        echo "No documents with accessible_institutions found.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
