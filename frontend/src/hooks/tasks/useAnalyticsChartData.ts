import { useMemo } from "react";
import { format } from "date-fns";
import { az } from "date-fns/locale";
import { statusLabels, priorityLabels, categoryLabels } from "@/components/tasks/config/taskFormFields";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/constants/chartColors";

interface StatusBreakdown {
  count: number;
  percentage: number;
}

interface PriorityData {
  total: number;
  completed: number;
  completion_rate: number;
}

interface CompletionTrends {
  creation_trends: Record<string, number>;
  completion_trends: Record<string, number>;
}

interface TypeDistribution {
  count: number;
  completed: number;
  completion_rate: number;
}

interface AnalyticsData {
  status_breakdown?: Record<string, StatusBreakdown>;
  priority_analysis?: Record<string, PriorityData>;
  completion_trends?: CompletionTrends;
  type_distribution?: Record<string, TypeDistribution>;
}

export function useAnalyticsChartData(analytics: AnalyticsData | undefined) {
  const statusChartData = useMemo(() => {
    if (!analytics?.status_breakdown) return [];
    return Object.entries(analytics.status_breakdown).map(([status, data]) => ({
      name: statusLabels[status] || status,
      value: data.count,
      percentage: data.percentage,
      color: STATUS_COLORS[status] || "#6b7280",
    }));
  }, [analytics?.status_breakdown]);

  const priorityChartData = useMemo(() => {
    if (!analytics?.priority_analysis) return [];
    return Object.entries(analytics.priority_analysis).map(([priority, data]) => ({
      priority: priorityLabels[priority] || priority,
      total: data.total,
      completed: data.completed,
      completion_rate: data.completion_rate,
      color: PRIORITY_COLORS[priority] || "#6b7280",
    }));
  }, [analytics?.priority_analysis]);

  const trendChartData = useMemo(() => {
    if (!analytics?.completion_trends) return [];
    const { creation_trends, completion_trends } = analytics.completion_trends;
    const allDates = new Set([...Object.keys(creation_trends), ...Object.keys(completion_trends)]);
    return Array.from(allDates)
      .sort()
      .map((date) => ({
        date: format(new Date(date), "d MMM", { locale: az }),
        yaradılan: creation_trends[date] || 0,
        tamamlanan: completion_trends[date] || 0,
      }));
  }, [analytics?.completion_trends]);

  const categoryChartData = useMemo(() => {
    if (!analytics?.type_distribution) return [];
    return Object.entries(analytics.type_distribution).map(([type, data]) => ({
      name: categoryLabels[type] || type,
      value: data.count,
      completed: data.completed,
      completion_rate: data.completion_rate,
    }));
  }, [analytics?.type_distribution]);

  return { statusChartData, priorityChartData, trendChartData, categoryChartData };
}
