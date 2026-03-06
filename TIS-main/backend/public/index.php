<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Contracts\Debug\ExceptionHandler;

// Define the Laravel base path
define('LARAVEL_START', microtime(true));

// Check if vendor autoloader exists
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    die('Composer dependencies not installed. Run: composer install');
}

// Autoload classes
require __DIR__ . '/../vendor/autoload.php';

// Bootstrap the Laravel application
$app = require_once __DIR__ . '/../bootstrap/app.php';

// Make the kernel
$kernel = $app->make(Kernel::class);

// Handle the request
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
)->send();

// Terminate the kernel
$kernel->terminate($request, $response);
