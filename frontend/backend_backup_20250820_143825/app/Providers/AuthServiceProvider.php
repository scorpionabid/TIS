<?php

namespace App\Providers;

use App\Services\Auth\DeviceService;
use App\Services\Auth\LoginService;
use App\Services\Auth\LogoutService;
use App\Services\Auth\SessionService;
use Illuminate\Support\ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(LoginService::class, function ($app) {
            return new LoginService();
        });

        $this->app->singleton(LogoutService::class, function ($app) {
            return new LogoutService();
        });

        $this->app->singleton(DeviceService::class, function ($app) {
            return new DeviceService();
        });

        $this->app->singleton(SessionService::class, function ($app) {
            return new SessionService();
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
