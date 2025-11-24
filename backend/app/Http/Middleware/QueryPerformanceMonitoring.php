<?php

namespace App\Http\Middleware;

/**
 * @deprecated Temporary compatibility shim that routes legacy references to
 *             QueryPerformanceMonitoring through the new PerformanceMiddleware.
 */
class QueryPerformanceMonitoring extends PerformanceMiddleware {}
