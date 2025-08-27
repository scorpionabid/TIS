<?php

namespace App\Services;

use App\Models\SystemConfig;
use App\Models\ActivityLog;
use App\Models\SecurityEvent;
use App\Services\BaseService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SystemConfigService extends BaseService
{
    /**
     * Get all system configuration settings
     */
    public function getSystemConfig(): array
    {
        return Cache::remember('system_config', 3600, function () {
            return [
                'general' => $this->getGeneralSettings(),
                'security' => $this->getSecuritySettings(),
                'notifications' => $this->getNotificationSettings(),
                'maintenance' => $this->getMaintenanceSettings(),
                'performance' => $this->getPerformanceSettings(),
                'audit' => $this->getAuditSettings(),
                'integrations' => $this->getIntegrationSettings()
            ];
        });
    }

    /**
     * Update system configuration settings
     */
    public function updateSystemConfig(string $category, array $settings, $user): array
    {
        return DB::transaction(function () use ($category, $settings, $user) {
            // Validate settings based on category
            $this->validateCategorySettings($category, $settings);

            // Update settings
            foreach ($settings as $key => $value) {
                SystemConfig::updateOrCreate(
                    ['key' => "{$category}.{$key}"],
                    ['value' => json_encode($value), 'updated_by' => $user->id]
                );
            }

            // Clear cache
            Cache::forget('system_config');
            Cache::put('system_config_last_updated', now());

            // Log configuration change
            ActivityLog::logActivity([
                'user_id' => $user->id,
                'activity_type' => 'system_config_update',
                'entity_type' => 'SystemConfig',
                'description' => "Updated {$category} configuration settings",
                'properties' => [
                    'category' => $category,
                    'updated_keys' => array_keys($settings)
                ],
                'institution_id' => $user->institution_id
            ]);

            // Log security event for sensitive changes
            if (in_array($category, ['security', 'audit'])) {
                SecurityEvent::logEvent([
                    'event_type' => 'system_config_change',
                    'severity' => 'warning',
                    'user_id' => $user->id,
                    'description' => "Sensitive configuration category '{$category}' was modified",
                    'metadata' => [
                        'category' => $category,
                        'changed_keys' => array_keys($settings),
                        'ip_address' => request()->ip(),
                        'user_agent' => request()->userAgent()
                    ]
                ]);
            }

            return [
                'category' => $category,
                'updated_settings' => count($settings),
                'updated_at' => now()
            ];
        });
    }

    /**
     * Get configuration value by key
     */
    public function getConfigValue(string $key, $default = null)
    {
        $config = SystemConfig::where('key', $key)->first();
        return $config ? json_decode($config->value, true) : $default;
    }

    /**
     * Set configuration value
     */
    public function setConfigValue(string $key, $value, $user = null): void
    {
        SystemConfig::updateOrCreate(
            ['key' => $key],
            [
                'value' => json_encode($value),
                'updated_by' => $user?->id
            ]
        );

        // Clear cache
        Cache::forget('system_config');
        Cache::put('system_config_last_updated', now());
    }

    /**
     * Reset configuration to defaults
     */
    public function resetConfigToDefaults(string $category, $user): array
    {
        return DB::transaction(function () use ($category, $user) {
            $defaults = $this->getDefaultSettings($category);
            
            // Delete existing settings for category
            SystemConfig::where('key', 'LIKE', "{$category}.%")->delete();
            
            // Set defaults
            foreach ($defaults as $key => $value) {
                SystemConfig::create([
                    'key' => "{$category}.{$key}",
                    'value' => json_encode($value),
                    'updated_by' => $user->id
                ]);
            }

            // Clear cache
            Cache::forget('system_config');
            Cache::put('system_config_last_updated', now());

            // Log activity
            ActivityLog::logActivity([
                'user_id' => $user->id,
                'activity_type' => 'system_config_reset',
                'entity_type' => 'SystemConfig',
                'description' => "Reset {$category} configuration to defaults",
                'properties' => ['category' => $category],
                'institution_id' => $user->institution_id
            ]);

            return [
                'category' => $category,
                'reset_settings' => count($defaults),
                'reset_at' => now()
            ];
        });
    }

    /**
     * Get general settings
     */
    private function getGeneralSettings(): array
    {
        return [
            'app_name' => $this->getConfigValue('general.app_name', 'ATIS - Education Management System'),
            'app_url' => $this->getConfigValue('general.app_url', config('app.url')),
            'timezone' => $this->getConfigValue('general.timezone', 'Asia/Baku'),
            'default_language' => $this->getConfigValue('general.default_language', 'az'),
            'maintenance_mode' => $this->getConfigValue('general.maintenance_mode', false),
            'feature_flags' => $this->getConfigValue('general.feature_flags', []),
            'registration_enabled' => $this->getConfigValue('general.registration_enabled', false)
        ];
    }

    /**
     * Get security settings
     */
    private function getSecuritySettings(): array
    {
        return [
            'session_timeout' => $this->getConfigValue('security.session_timeout', 3600),
            'password_expiry_days' => $this->getConfigValue('security.password_expiry_days', 90),
            'max_login_attempts' => $this->getConfigValue('security.max_login_attempts', 5),
            'login_throttle_time' => $this->getConfigValue('security.login_throttle_time', 300),
            'force_https' => $this->getConfigValue('security.force_https', true),
            'two_factor_enabled' => $this->getConfigValue('security.two_factor_enabled', false),
            'password_requirements' => $this->getConfigValue('security.password_requirements', [
                'min_length' => 8,
                'require_uppercase' => true,
                'require_numbers' => true,
                'require_symbols' => false
            ])
        ];
    }

    /**
     * Get notification settings
     */
    private function getNotificationSettings(): array
    {
        return [
            'email_enabled' => $this->getConfigValue('notifications.email_enabled', true),
            'sms_enabled' => $this->getConfigValue('notifications.sms_enabled', false),
            'push_enabled' => $this->getConfigValue('notifications.push_enabled', false),
            'default_templates' => $this->getConfigValue('notifications.default_templates', []),
            'rate_limiting' => $this->getConfigValue('notifications.rate_limiting', [
                'enabled' => true,
                'max_per_hour' => 100
            ])
        ];
    }

    /**
     * Get maintenance settings
     */
    private function getMaintenanceSettings(): array
    {
        return [
            'auto_backup_enabled' => $this->getConfigValue('maintenance.auto_backup_enabled', true),
            'backup_frequency' => $this->getConfigValue('maintenance.backup_frequency', 'daily'),
            'cleanup_old_logs' => $this->getConfigValue('maintenance.cleanup_old_logs', true),
            'log_retention_days' => $this->getConfigValue('maintenance.log_retention_days', 30),
            'database_optimization' => $this->getConfigValue('maintenance.database_optimization', false)
        ];
    }

    /**
     * Get performance settings
     */
    private function getPerformanceSettings(): array
    {
        return [
            'cache_enabled' => $this->getConfigValue('performance.cache_enabled', true),
            'cache_ttl' => $this->getConfigValue('performance.cache_ttl', 3600),
            'query_optimization' => $this->getConfigValue('performance.query_optimization', true),
            'compression_enabled' => $this->getConfigValue('performance.compression_enabled', true),
            'cdn_enabled' => $this->getConfigValue('performance.cdn_enabled', false)
        ];
    }

    /**
     * Get audit settings
     */
    private function getAuditSettings(): array
    {
        return [
            'audit_enabled' => $this->getConfigValue('audit.audit_enabled', true),
            'detailed_logging' => $this->getConfigValue('audit.detailed_logging', true),
            'log_sensitive_data' => $this->getConfigValue('audit.log_sensitive_data', false),
            'retention_days' => $this->getConfigValue('audit.retention_days', 365),
            'export_enabled' => $this->getConfigValue('audit.export_enabled', true)
        ];
    }

    /**
     * Get integration settings
     */
    private function getIntegrationSettings(): array
    {
        return [
            'api_rate_limiting' => $this->getConfigValue('integrations.api_rate_limiting', [
                'enabled' => true,
                'requests_per_minute' => 60
            ]),
            'webhooks_enabled' => $this->getConfigValue('integrations.webhooks_enabled', false),
            'external_apis' => $this->getConfigValue('integrations.external_apis', []),
            'sso_enabled' => $this->getConfigValue('integrations.sso_enabled', false)
        ];
    }

    /**
     * Validate settings based on category
     */
    private function validateCategorySettings(string $category, array $settings): void
    {
        $validationRules = $this->getValidationRules($category);
        
        foreach ($settings as $key => $value) {
            if (isset($validationRules[$key])) {
                $rule = $validationRules[$key];
                if (!$this->validateSetting($value, $rule)) {
                    throw new \InvalidArgumentException("Invalid value for {$category}.{$key}");
                }
            }
        }
    }

    /**
     * Get validation rules for category
     */
    private function getValidationRules(string $category): array
    {
        $rules = [
            'general' => [
                'app_name' => ['type' => 'string', 'max_length' => 255],
                'timezone' => ['type' => 'string', 'in' => timezone_identifiers_list()],
                'maintenance_mode' => ['type' => 'boolean'],
                'registration_enabled' => ['type' => 'boolean']
            ],
            'security' => [
                'session_timeout' => ['type' => 'integer', 'min' => 300, 'max' => 86400],
                'password_expiry_days' => ['type' => 'integer', 'min' => 1, 'max' => 365],
                'max_login_attempts' => ['type' => 'integer', 'min' => 1, 'max' => 10],
                'force_https' => ['type' => 'boolean'],
                'two_factor_enabled' => ['type' => 'boolean']
            ],
            'notifications' => [
                'email_enabled' => ['type' => 'boolean'],
                'sms_enabled' => ['type' => 'boolean'],
                'push_enabled' => ['type' => 'boolean']
            ]
        ];

        return $rules[$category] ?? [];
    }

    /**
     * Validate individual setting
     */
    private function validateSetting($value, array $rule): bool
    {
        if (isset($rule['type'])) {
            switch ($rule['type']) {
                case 'boolean':
                    if (!is_bool($value)) return false;
                    break;
                case 'integer':
                    if (!is_int($value)) return false;
                    if (isset($rule['min']) && $value < $rule['min']) return false;
                    if (isset($rule['max']) && $value > $rule['max']) return false;
                    break;
                case 'string':
                    if (!is_string($value)) return false;
                    if (isset($rule['max_length']) && strlen($value) > $rule['max_length']) return false;
                    break;
            }
        }

        if (isset($rule['in']) && !in_array($value, $rule['in'])) {
            return false;
        }

        return true;
    }

    /**
     * Get default settings for category
     */
    private function getDefaultSettings(string $category): array
    {
        $defaults = [
            'general' => [
                'app_name' => 'ATIS - Education Management System',
                'timezone' => 'Asia/Baku',
                'default_language' => 'az',
                'maintenance_mode' => false,
                'registration_enabled' => false
            ],
            'security' => [
                'session_timeout' => 3600,
                'password_expiry_days' => 90,
                'max_login_attempts' => 5,
                'login_throttle_time' => 300,
                'force_https' => true,
                'two_factor_enabled' => false
            ]
        ];

        return $defaults[$category] ?? [];
    }
}