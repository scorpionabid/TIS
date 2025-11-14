<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Feature Flags
    |--------------------------------------------------------------------------
    |
    | This file contains feature flag configurations for gradual rollouts,
    | A/B testing, and production-safe deployments.
    |
    | USAGE:
    | - Set to true to enable new feature
    | - Set to false to use legacy implementation
    | - Can be overridden via .env file
    |
    */

    /**
     * REFACTOR: SurveyAnalytics Modular Architecture
     *
     * ENABLED: Uses new domain-driven refactored services
     * DISABLED: Uses legacy monolithic SurveyAnalyticsService
     *
     * REFACTORED: 2025-11-14
     * FROM: Monolithic SurveyAnalyticsService (1,227 lines)
     * TO: 7 domain services (~220 lines each) + Facade
     *
     * BENEFITS:
     * - Improved maintainability (smaller files)
     * - Better testability (isolated domains)
     * - Enhanced performance (lazy loading)
     * - Cleaner code organization
     *
     * BACKWARD COMPATIBLE: Yes (same API via facade)
     * PRODUCTION READY: Yes (all tests passing)
     *
     * ROLLOUT PLAN:
     * - Week 1: 10% users (staging + early adopters)
     * - Week 2: 50% users (monitor performance)
     * - Week 3: 100% users (full rollout)
     */
    'use_refactored_analytics' => env('FEATURE_REFACTORED_ANALYTICS', true),

    /**
     * DEBUG: Analytics Performance Monitoring
     *
     * ENABLED: Logs analytics method execution times
     * DISABLED: No performance logging
     *
     * PRODUCTION: false (only enable for debugging)
     */
    'log_analytics_performance' => env('FEATURE_LOG_ANALYTICS_PERFORMANCE', false),

    /**
     * FUTURE: Additional feature flags can be added here
     *
     * Examples:
     * - 'use_refactored_approvals' => env('FEATURE_REFACTORED_APPROVALS', false),
     * - 'use_refactored_grades' => env('FEATURE_REFACTORED_GRADES', false),
     * - 'enable_new_dashboard' => env('FEATURE_NEW_DASHBOARD', false),
     */

];
