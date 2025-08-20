<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            // Custom Auth Middleware
            'auth.custom' => \App\Http\Middleware\AuthMiddleware::class,
            'role.custom' => \App\Http\Middleware\RoleMiddleware::class,
            'permission.custom' => \App\Http\Middleware\PermissionMiddleware::class,
            'institution.access' => \App\Http\Middleware\InstitutionAccessMiddleware::class,
            'regional.access' => \App\Http\Middleware\RegionalDataAccessMiddleware::class,
            'audit.logging' => \App\Http\Middleware\AuditLoggingMiddleware::class,
            
            // Inventory Management Middleware
            'inventory.rate_limit' => \App\Http\Middleware\InventoryRateLimiter::class,
            
            // Spatie Permission Middleware (keeping for compatibility)
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
