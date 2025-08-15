<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Performance Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains performance optimization settings for the ATİS 
    | education management system.
    |
    */

    'cache' => [
        'default_ttl' => 3600, // 1 hour
        'long_ttl' => 86400, // 24 hours
        'short_ttl' => 300, // 5 minutes
        
        'keys' => [
            'institutions' => 'institutions_hierarchy',
            'roles' => 'user_roles_permissions',
            'surveys' => 'survey_data',
            'statistics' => 'system_statistics',
        ],
    ],

    'database' => [
        'query_cache' => true,
        'slow_query_threshold' => 1000, // ms
        'connection_pooling' => true,
        'read_write_split' => false, // Enable for production
    ],

    'api' => [
        'rate_limiting' => [
            'enabled' => true,
            'requests_per_minute' => 60,
            'burst_limit' => 10,
        ],
        
        'pagination' => [
            'default_per_page' => 15,
            'max_per_page' => 100,
        ],
        
        'compression' => [
            'enabled' => true,
            'min_length' => 1024, // bytes
        ],
    ],

    'frontend' => [
        'chunk_splitting' => true,
        'lazy_loading' => true,
        'service_worker' => true,
        'cdn_assets' => false, // Enable for production
    ],

    'monitoring' => [
        'performance_metrics' => true,
        'error_tracking' => true,
        'slow_operations' => true,
        'memory_usage' => true,
    ],

    'optimization' => [
        'eager_loading' => [
            'users' => ['roles', 'institution', 'department'],
            'institutions' => ['parent', 'children', 'departments'],
            'surveys' => ['questions', 'responses'],
            'documents' => ['shares', 'downloads'],
        ],
        
        'query_optimization' => [
            'select_specific_columns' => true,
            'avoid_n_plus_1' => true,
            'use_indexes' => true,
            'batch_operations' => true,
        ],
    ],

];