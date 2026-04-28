<?php

use App\Models\LinkShare;

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$title = 'Uşaq İnkişafı və Rifahı Hesabat';
$links = LinkShare::where('title', 'LIKE', '%' . $title . '%')->get();

echo "Found " . $links->count() . " links matching title.\n";
foreach ($links as $l) {
    echo "ID: {$l->id}, Title: '{$l->title}', URL: {$l->url}\n";
}

$grouped = LinkShare::whereIn('id', function($q) {
    $q->selectRaw('MIN(id)')->from('link_shares')->groupBy('title');
})->where('title', 'LIKE', '%' . $title . '%')->get();

echo "\nGrouped query results:\n";
foreach ($grouped as $l) {
    echo "ID: {$l->id}, Title: '{$l->title}'\n";
}
