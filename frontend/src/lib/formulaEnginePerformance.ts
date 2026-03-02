/**
 * Formula Engine Performance Monitor
 * Tracks execution metrics and provides performance insights
 */

import { FormulaEngine, FormulaResult, CellContext } from './formulaEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PerformanceMetrics {
  formula: string;
  duration: number; // milliseconds
  timestamp: number;
  success: boolean;
  error?: string;
  contextSize: number;
  complexity: 'low' | 'medium' | 'high';
}

export interface AggregatedMetrics {
  totalEvaluations: number;
  successfulEvaluations: number;
  failedEvaluations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  byComplexity: {
    low: { count: number; avgDuration: number };
    medium: { count: number; avgDuration: number };
    high: { count: number; avgDuration: number };
  };
}

// ─── Performance Monitor Class ────────────────────────────────────────────────

class FormulaPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxHistorySize = 1000;
  private listeners: Array<(metric: PerformanceMetrics) => void> = [];

  /**
   * Track a formula evaluation
   */
  track(
    formula: string,
    duration: number,
    success: boolean,
    error: string | undefined,
    contextSize: number
  ): void {
    const complexity = this.calculateComplexity(formula, contextSize);

    const metric: PerformanceMetrics = {
      formula,
      duration,
      timestamp: Date.now(),
      success,
      error,
      contextSize,
      complexity,
    };

    this.metrics.push(metric);

    // Maintain history size
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(metric));
  }

  /**
   * Calculate formula complexity based on various factors
   */
  private calculateComplexity(formula: string, contextSize: number): 'low' | 'medium' | 'high' {
    const functionCount = (formula.match(/[A-Z][A-Z0-9]*\s*\(/g) || []).length;
    const rangeCount = (formula.match(/:/g) || []).length;
    const nestedDepth = this.calculateNestingDepth(formula);
    const length = formula.length;

    let score = 0;
    score += functionCount * 2;
    score += rangeCount * 3;
    score += nestedDepth * 2;
    score += Math.floor(length / 50);
    score += Math.floor(contextSize / 100);

    if (score <= 5) return 'low';
    if (score <= 15) return 'medium';
    return 'high';
  }

  /**
   * Calculate nesting depth of formula
   */
  private calculateNestingDepth(formula: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of formula) {
      if (char === '(') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get aggregated statistics
   */
  getAggregatedMetrics(timeWindow?: number): AggregatedMetrics {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter((m) => m.timestamp >= cutoff);

    if (relevantMetrics.length === 0) {
      return {
        totalEvaluations: 0,
        successfulEvaluations: 0,
        failedEvaluations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        byComplexity: {
          low: { count: 0, avgDuration: 0 },
          medium: { count: 0, avgDuration: 0 },
          high: { count: 0, avgDuration: 0 },
        },
      };
    }

    const durations = relevantMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const total = relevantMetrics.length;
    const successful = relevantMetrics.filter((m) => m.success).length;
    const failed = total - successful;

    const avg = durations.reduce((a, b) => a + b, 0) / total;
    const min = durations[0];
    const max = durations[durations.length - 1];
    const p95Index = Math.floor(total * 0.95);
    const p99Index = Math.floor(total * 0.99);

    // Complexity breakdown
    const byComplexity = {
      low: this.calculateComplexityStats(relevantMetrics, 'low'),
      medium: this.calculateComplexityStats(relevantMetrics, 'medium'),
      high: this.calculateComplexityStats(relevantMetrics, 'high'),
    };

    return {
      totalEvaluations: total,
      successfulEvaluations: successful,
      failedEvaluations: failed,
      averageDuration: Math.round(avg * 100) / 100,
      minDuration: min,
      maxDuration: max,
      p95Duration: durations[p95Index] || max,
      p99Duration: durations[p99Index] || max,
      byComplexity,
    };
  }

  private calculateComplexityStats(
    metrics: PerformanceMetrics[],
    complexity: 'low' | 'medium' | 'high'
  ): { count: number; avgDuration: number } {
    const relevant = metrics.filter((m) => m.complexity === complexity);
    if (relevant.length === 0) {
      return { count: 0, avgDuration: 0 };
    }
    const avg = relevant.reduce((sum, m) => sum + m.duration, 0) / relevant.length;
    return {
      count: relevant.length,
      avgDuration: Math.round(avg * 100) / 100,
    };
  }

  /**
   * Get slow formulas (top N by duration)
   */
  getSlowFormulas(n: number = 10): PerformanceMetrics[] {
    return [...this.metrics]
      .filter((m) => m.success)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, n);
  }

  /**
   * Get failed formulas
   */
  getFailedFormulas(): PerformanceMetrics[] {
    return this.metrics.filter((m) => !m.success);
  }

  /**
   * Subscribe to performance metrics
   */
  subscribe(listener: (metric: PerformanceMetrics) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        aggregated: this.getAggregatedMetrics(),
        exportTime: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

// ─── Monitored Formula Engine Wrapper ───────────────────────────────────────

const monitor = new FormulaPerformanceMonitor();

export class MonitoredFormulaEngine {
  /**
   * Evaluate formula with performance tracking
   */
  static evaluate(formula: string, context: CellContext): FormulaResult {
    const startTime = performance.now();
    const result = FormulaEngine.evaluate(formula, context);
    const duration = performance.now() - startTime;

    monitor.track(
      formula,
      duration,
      result.error === null,
      result.error || undefined,
      Object.keys(context).length
    );

    return result;
  }

  /**
   * Validate formula with performance tracking
   */
  static validate(formula: string): { valid: boolean; error: string | null } {
    const startTime = performance.now();
    const result = FormulaEngine.validate(formula);
    const duration = performance.now() - startTime;

    monitor.track(formula, duration, result.valid, result.error || undefined, 0);

    return result;
  }

  /**
   * Get formula dependencies (no performance tracking needed)
   */
  static getDependencies(formula: string): string[] {
    return FormulaEngine.getDependencies(formula);
  }

  /**
   * Detect circular references (no performance tracking needed)
   */
  static detectCircular(dependencies: Record<string, string[]>): string[] {
    return FormulaEngine.detectCircular(dependencies);
  }

  /**
   * Get available functions (no performance tracking needed)
   */
  static getFunctionList(): { name: string; description: string; example: string }[] {
    return FormulaEngine.getFunctionList();
  }

  /**
   * Get performance monitor instance
   */
  static getMonitor(): FormulaPerformanceMonitor {
    return monitor;
  }
}

// ─── React Hook for Performance Monitoring ────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';

export function useFormulaPerformance() {
  const [metrics, setMetrics] = useState<AggregatedMetrics>(() =>
    monitor.getAggregatedMetrics()
  );
  const [latestMetric, setLatestMetric] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    const unsubscribe = monitor.subscribe((metric) => {
      setLatestMetric(metric);
      setMetrics(monitor.getAggregatedMetrics());
    });

    return unsubscribe;
  }, []);

  const refreshMetrics = useCallback(() => {
    setMetrics(monitor.getAggregatedMetrics());
  }, []);

  const getSlowFormulas = useCallback((n?: number) => {
    return monitor.getSlowFormulas(n);
  }, []);

  const getFailedFormulas = useCallback(() => {
    return monitor.getFailedFormulas();
  }, []);

  const exportMetrics = useCallback(() => {
    return monitor.exportMetrics();
  }, []);

  const clearMetrics = useCallback(() => {
    monitor.clear();
    setMetrics(monitor.getAggregatedMetrics());
  }, []);

  return {
    metrics,
    latestMetric,
    refreshMetrics,
    getSlowFormulas,
    getFailedFormulas,
    exportMetrics,
    clearMetrics,
  };
}

// ─── Performance Dashboard Component ─────────────────────────────────────────

import React from 'react';

export const FormulaPerformanceDashboard: React.FC = () => {
  const { metrics, latestMetric, getSlowFormulas, clearMetrics } = useFormulaPerformance();
  const [slowFormulas, setSlowFormulas] = React.useState(() => getSlowFormulas(5));

  React.useEffect(() => {
    setSlowFormulas(getSlowFormulas(5));
  }, [metrics, getSlowFormulas]);

  if (metrics.totalEvaluations === 0) {
    return (
      <div className="p-4 text-gray-500">
        <p>Hələ heç bir formula qiymətləndirilməyib.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Formula Performance</h3>
        <button
          onClick={clearMetrics}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Clear History
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-xl font-bold">{metrics.totalEvaluations}</p>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <p className="text-sm text-gray-600">Success</p>
          <p className="text-xl font-bold text-green-600">
            {metrics.successfulEvaluations}
          </p>
        </div>
        <div className="bg-red-50 p-3 rounded">
          <p className="text-sm text-gray-600">Failed</p>
          <p className="text-xl font-bold text-red-600">{metrics.failedEvaluations}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <p className="text-sm text-gray-600">Avg Time</p>
          <p className="text-xl font-bold">{metrics.averageDuration.toFixed(2)}ms</p>
        </div>
      </div>

      {/* Timing Stats */}
      <div className="bg-gray-50 p-3 rounded">
        <h4 className="font-medium mb-2">Timing Statistics</h4>
        <div className="grid grid-cols-5 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Min:</span>{' '}
            <span className="font-medium">{metrics.minDuration.toFixed(2)}ms</span>
          </div>
          <div>
            <span className="text-gray-500">Max:</span>{' '}
            <span className="font-medium">{metrics.maxDuration.toFixed(2)}ms</span>
          </div>
          <div>
            <span className="text-gray-500">Avg:</span>{' '}
            <span className="font-medium">{metrics.averageDuration.toFixed(2)}ms</span>
          </div>
          <div>
            <span className="text-gray-500">P95:</span>{' '}
            <span className="font-medium">{metrics.p95Duration.toFixed(2)}ms</span>
          </div>
          <div>
            <span className="text-gray-500">P99:</span>{' '}
            <span className="font-medium">{metrics.p99Duration.toFixed(2)}ms</span>
          </div>
        </div>
      </div>

      {/* Complexity Breakdown */}
      <div className="bg-gray-50 p-3 rounded">
        <h4 className="font-medium mb-2">By Complexity</h4>
        <div className="grid grid-cols-3 gap-4">
          {(['low', 'medium', 'high'] as const).map((level) => (
            <div key={level} className="text-center">
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  level === 'low'
                    ? 'bg-green-100 text-green-700'
                    : level === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {level.toUpperCase()}
              </span>
              <p className="mt-1 text-lg font-bold">
                {metrics.byComplexity[level].count}
              </p>
              <p className="text-xs text-gray-500">
                avg: {metrics.byComplexity[level].avgDuration.toFixed(2)}ms
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Slow Formulas */}
      {slowFormulas.length > 0 && (
        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium mb-2">Slowest Formulas</h4>
          <div className="space-y-1">
            {slowFormulas.map((formula, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-sm p-2 bg-white rounded"
              >
                <code className="text-xs truncate max-w-[60%]">{formula.formula}</code>
                <span className="font-medium text-red-600">
                  {formula.duration.toFixed(2)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Evaluation */}
      {latestMetric && (
        <div className="text-xs text-gray-500">
          Latest: {latestMetric.formula.substring(0, 50)}...
          {' · '}
          {latestMetric.duration.toFixed(2)}ms
          {' · '}
          {latestMetric.success ? '✓' : '✗'}
        </div>
      )}
    </div>
  );
};

export { FormulaPerformanceMonitor, monitor };
export default MonitoredFormulaEngine;
