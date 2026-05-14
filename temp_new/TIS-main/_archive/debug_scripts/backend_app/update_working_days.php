<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Institution;

$ids = [153, 205, 301, 331];
$updated = 0;
foreach ($ids as $id) {
    $inst = Institution::find($id);
    if ($inst) {
        $meta = $inst->metadata ?? [];
        $meta['working_days'] = 6;
        $inst->metadata = $meta;
        $inst->save();
        $updated++;
        echo "Updated institution ID: $id ($inst->name)\n";
    } else {
        echo "Institution ID: $id not found.\n";
    }
}
echo "Total updated: $updated\n";
