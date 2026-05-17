/**
 * TaskAnalyticsDashboard Component
 *
 * Comprehensive analytics dashboard for task management
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Building,
  Target,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api";
import { format, subDays, subMonths } from "date-fns";
import { CHART_COLORS } from "@/constants/chartColors";
import { AnalyticsStatsCard } from "./AnalyticsStatsCard";
import { PerformanceTable } from "./PerformanceTable";
import { useAnalyticsChartData } from "@/hooks/tasks/useAnalyticsChartData";

// Analytics data types
interface TaskAnalytics {
  overview: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    pending_tasks: number;
    completion_rate: number;
    average_completion_days: number;
    trend: {
      tasks_change: number;
      period_comparison: {
        current_period: number;
        previous_period: number;
      };
    };
  };
  status_breakdown: Record<string, { count: number; percentage: number }>;
  priority_analysis: Record<
    string,
    { priority: string; total: number; completed: number; completion_rate: number; avg_completion_days: number }
  >;
  completion_trends: {
    period_type: "day" | "week";
    creation_trends: Record<string, number>;
    completion_trends: Record<string, number>;
  };
  institutional_performance: Array<{
    institution: { id: number; name: string; type: string };
    metrics: {
      total_tasks: number;
      completed_tasks: number;
      overdue_tasks: number;
      completion_rate: number;
      performance_score: number;
    };
  }>;
  user_performance: Array<{
    user: { id: number; name: string; email: string };
    metrics: {
      total_assignments: number;
      completed_assignments: number;
      overdue_assignments: number;
      completion_rate: number;
      reliability_score: number;
    };
  }>;
  overdue_analysis: {
    total_overdue: number;
    by_priority: Record<string, number>;
    by_overdue_period: Record<string, number>;
    critical_overdue: number;
  };
  type_distribution: Record<
    string,
    { type: string; count: number; completed: number; completion_rate: number }
  >;
}

// COLORS alias for backward compat within this file
const COLORS = CHART_COLORS;

// Fetch analytics data
const fetchAnalytics = async (dateRange: string): Promise<TaskAnalytics> => {
  const params: Record<string, string> = {};

  if (dateRange === "7d") {
    params.date_from = format(subDays(new Date(), 7), "yyyy-MM-dd");
  } else if (dateRange === "30d") {
    params.date_from = format(subDays(new Date(), 30), "yyyy-MM-dd");
  } else if (dateRange === "90d") {
    params.date_from = format(subDays(new Date(), 90), "yyyy-MM-dd");
  } else if (dateRange === "1y") {
    params.date_from = format(subMonths(new Date(), 12), "yyyy-MM-dd");
  }

  params.date_to = format(new Date(), "yyyy-MM-dd");

  const response = await apiClient.get<TaskAnalytics>("/tasks/statistics", params);
  return response;
};

interface TaskAnalyticsDashboardProps {
  className?: string;
}

export function TaskAnalyticsDashboard({ className }: TaskAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState("30d");

  const { data: analytics, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["task-analytics", dateRange],
    queryFn: () => fetchAnalytics(dateRange),
  });

  const { statusChartData, priorityChartData, trendChartData, categoryChartData } = useAnalyticsChartData(analytics);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={cn("text-center py-12", className)}>
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg font-medium">Analitika yüklənərkən xəta baş verdi</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenidən cəhd et
        </Button>
      </div>
    );
  }

  const { overview, overdue_analysis, institutional_performance, user_performance } = analytics;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with date range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tapşırıq Analitikası</h2>
          <p className="text-muted-foreground">Performans və statistika icmalı</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Son 7 gün</SelectItem>
              <SelectItem value="30d">Son 30 gün</SelectItem>
              <SelectItem value="90d">Son 90 gün</SelectItem>
              <SelectItem value="1y">Son 1 il</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsStatsCard
          title="Ümumi Tapşırıqlar"
          value={overview.total_tasks}
          trend={overview.trend.tasks_change}
          icon={<Target className="h-10 w-10 text-blue-500 opacity-80" />}
        />
        <AnalyticsStatsCard
          title="Tamamlanma Faizi"
          value={`${overview.completion_rate}%`}
          subtitle={`${overview.completed_tasks} / ${overview.total_tasks}`}
          icon={<CheckCircle className="h-10 w-10 text-green-500 opacity-80" />}
        />
        <AnalyticsStatsCard
          title="Orta Tamamlanma"
          value={overview.average_completion_days}
          subtitle="gün"
          icon={<Clock className="h-10 w-10 text-blue-500 opacity-80" />}
        />
        <AnalyticsStatsCard
          title="Gecikmiş"
          value={overdue_analysis.total_overdue}
          subtitle={`${overdue_analysis.critical_overdue} kritik`}
          valueClassName="text-red-500"
          icon={<AlertTriangle className="h-10 w-10 text-red-500 opacity-80" />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Paylanması</CardTitle>
            <CardDescription>Tapşırıqların status üzrə bölgüsü</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    labelLine={false}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Sayı: {data.value} ({data.percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {statusChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-sm">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completion Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Tamamlanma Trendi</CardTitle>
            <CardDescription>Yaradılan vs tamamlanan tapşırıqlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="yaradılan"
                    stackId="1"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="tamamlanan"
                    stackId="2"
                    stroke={COLORS.success}
                    fill={COLORS.success}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Priority Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Prioritet Analizi</CardTitle>
            <CardDescription>Prioritet üzrə tamamlanma faizi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="priority" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="total" name="Ümumi" fill={COLORS.gray} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="completed" name="Tamamlanan" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Kateqoriya Paylanması</CardTitle>
            <CardDescription>Tapşırıqların kateqoriya üzrə bölgüsü</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Sayı" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        <PerformanceTable
          title="Müəssisə Performansı"
          description="Ən yaxşı performans göstərən müəssisələr"
          icon={<Building className="h-5 w-5" />}
          items={institutional_performance.map(item => ({
            id: item.institution.id,
            name: item.institution.name,
            completedLabel: `${item.metrics.completed_tasks}/${item.metrics.total_tasks} tamamlanan`,
            score: item.metrics.performance_score,
          }))}
        />
        <PerformanceTable
          title="İstifadəçi Performansı"
          description="Ən yaxşı performans göstərən istifadəçilər"
          icon={<Users className="h-5 w-5" />}
          items={user_performance.map(item => ({
            id: item.user.id,
            name: item.user.name,
            completedLabel: `${item.metrics.completed_assignments}/${item.metrics.total_assignments} tamamlanan`,
            score: item.metrics.reliability_score,
          }))}
        />
      </div>
    </div>
  );
}
