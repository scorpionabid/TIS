/**
 * TaskStatsWidget Component
 *
 * Enhanced statistics widgets with mini charts for task dashboard
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskStats = {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  review?: number;
  cancelled?: number;
};

interface TaskStatsWidgetProps {
  stats: TaskStats;
  showCharts?: boolean;
  className?: string;
}

// Color palette for consistency
const COLORS = {
  pending: "#f59e0b",      // amber-500
  in_progress: "#3b82f6",  // blue-500
  completed: "#22c55e",    // green-500
  overdue: "#ef4444",      // red-500
  review: "#8b5cf6",       // violet-500
  cancelled: "#6b7280",    // gray-500
};

export function TaskStatsWidget({
  stats,
  showCharts = true,
  className
}: TaskStatsWidgetProps) {
  // Calculate completion rate
  const completionRate = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }, [stats]);

  // Calculate trend (mock - in real app this would come from API)
  const trend = useMemo(() => {
    // This would be calculated from historical data
    return {
      total: 5,
      completed: 12,
      overdue: -8,
    };
  }, []);

  // Pie chart data for status distribution
  const pieData = useMemo(() => [
    { name: "Gözləyir", value: stats.pending, color: COLORS.pending },
    { name: "İcradadır", value: stats.in_progress, color: COLORS.in_progress },
    { name: "Tamamlandı", value: stats.completed, color: COLORS.completed },
    { name: "Gecikmiş", value: stats.overdue, color: COLORS.overdue },
  ].filter(item => item.value > 0), [stats]);

  // Chart config for recharts
  const chartConfig = {
    pending: { label: "Gözləyir", color: COLORS.pending },
    in_progress: { label: "İcradadır", color: COLORS.in_progress },
    completed: { label: "Tamamlandı", color: COLORS.completed },
    overdue: { label: "Gecikmiş", color: COLORS.overdue },
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Tasks Card */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Aktiv</p>
                <p className="text-2xl font-bold">{stats.in_progress}</p>
                {showCharts && (
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">+{trend.total}%</span>
                    <span className="text-muted-foreground ml-1">həftəlik</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center">
                <Clock className="h-8 w-8 text-blue-500" />
                {showCharts && stats.total > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {Math.round((stats.in_progress / stats.total) * 100)}%
                  </div>
                )}
              </div>
            </div>
            {/* Mini progress bar */}
            {showCharts && (
              <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.in_progress / stats.total) * 100 : 0}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks Card */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Tamamlanan</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
                {showCharts && (
                  <div className="flex items-center text-xs">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">+{trend.completed}%</span>
                    <span className="text-muted-foreground ml-1">həftəlik</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                {showCharts && (
                  <div className="mt-2 text-xs font-medium text-green-500">
                    {completionRate}%
                  </div>
                )}
              </div>
            </div>
            {/* Mini progress bar */}
            {showCharts && (
              <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks Card */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Gecikmiş</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                {showCharts && (
                  <div className="flex items-center text-xs">
                    {trend.overdue < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                        <span className="text-green-500">{trend.overdue}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                        <span className="text-red-500">+{trend.overdue}%</span>
                      </>
                    )}
                    <span className="text-muted-foreground ml-1">həftəlik</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                {showCharts && stats.total > 0 && (
                  <div className="mt-2 text-xs text-red-500 font-medium">
                    {Math.round((stats.overdue / stats.total) * 100)}%
                  </div>
                )}
              </div>
            </div>
            {/* Mini progress bar */}
            {showCharts && (
              <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.overdue / stats.total) * 100 : 0}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Tasks Card */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{stats.total}</p>
                {showCharts && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>Gözləyən: {stats.pending}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center">
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            {/* Mini pie chart visualization */}
            {showCharts && stats.total > 0 && (
              <div className="mt-3 flex gap-1">
                <div
                  className="h-1.5 bg-amber-500 rounded-l-full transition-all duration-500"
                  style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                />
                <div
                  className="h-1.5 bg-blue-500 transition-all duration-500"
                  style={{ width: `${(stats.in_progress / stats.total) * 100}%` }}
                />
                <div
                  className="h-1.5 bg-green-500 transition-all duration-500"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
                <div
                  className="h-1.5 bg-red-500 rounded-r-full transition-all duration-500"
                  style={{ width: `${(stats.overdue / stats.total) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

          </div>
  );
}

// Compact version for smaller spaces
export function TaskStatsCompact({ stats }: { stats: TaskStats }) {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <span className="text-muted-foreground">Aktiv:</span>
        <span className="font-medium">{stats.in_progress}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-muted-foreground">Tamamlanan:</span>
        <span className="font-medium">{stats.completed}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-muted-foreground">Gecikmiş:</span>
        <span className="font-medium">{stats.overdue}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-gray-400" />
        <span className="text-muted-foreground">Ümumi:</span>
        <span className="font-medium">{stats.total}</span>
      </div>
    </div>
  );
}
