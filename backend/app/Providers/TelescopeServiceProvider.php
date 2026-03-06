<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

// Telescope is disabled for Docker development
// Uncomment the following lines when Telescope package is installed:
// use Laravel\Telescope\IncomingEntry;
// use Laravel\Telescope\Telescope;
// use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Telescope is disabled - no registration needed
        // Uncomment when Telescope package is installed:
        /*
        // Telescope::night();

        $this->hideSensitiveRequestDetails();

        $isLocal = $this->app->environment('local');

        Telescope::filter(function (IncomingEntry $entry) use ($isLocal) {
            return $isLocal ||
                   $entry->isReportableException() ||
                   $entry->isFailedRequest() ||
                   $entry->isFailedJob() ||
                   $entry->isScheduledTask() ||
                   $entry->hasMonitoredTag();
        });
        */
    }

    /**
     * Prevent sensitive request details from being logged by Telescope.
     */
    protected function hideSensitiveRequestDetails(): void
    {
        // Telescope is disabled
        /*
        if ($this->app->environment('local')) {
            return;
        }

        Telescope::hideRequestParameters(['_token']);

        Telescope::hideRequestHeaders([
            'cookie',
            'x-csrf-token',
            'x-xsrf-token',
        ]);
        */
    }

    /**
     * Register the Telescope gate.
     *
     * This gate determines who can access Telescope in non-local environments.
     *
     * Phase 2D: Allow SuperAdmin users to access Telescope in production
     */
    protected function gate(): void
    {
        // Telescope is disabled
        /*
        Gate::define('viewTelescope', function ($user) {
            // Development: Allow all authenticated users
            if ($this->app->environment('local')) {
                return true;
            }

            // Production: Only SuperAdmin role
            return $user->hasRole('SuperAdmin');
        });
        */
    }
}
