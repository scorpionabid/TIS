<?php

namespace App\Services;

class PermissionValidationService
{
    protected array $dependencies;

    public function __construct()
    {
        $this->dependencies = config('permissions.dependencies', []);
    }

    /**
     * Ensure permission list contains all required dependencies.
     */
    public function validateAndEnrich(array $permissions): array
    {
        $enriched = $permissions;

        foreach ($permissions as $permission) {
            if (isset($this->dependencies[$permission])) {
                foreach ($this->dependencies[$permission] as $dependency) {
                    if (! in_array($dependency, $enriched, true)) {
                        $enriched[] = $dependency;
                    }
                }
            }
        }

        return array_values(array_unique($enriched));
    }

    /**
     * Return missing dependencies keyed by permission.
     */
    public function getMissingDependencies(array $permissions): array
    {
        $missing = [];

        foreach ($permissions as $permission) {
            if (! isset($this->dependencies[$permission])) {
                continue;
            }

            foreach ($this->dependencies[$permission] as $dependency) {
                if (! in_array($dependency, $permissions, true)) {
                    $missing[$permission][] = $dependency;
                }
            }
        }

        return $missing;
    }
}
