import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AssignedTasksStatistics {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

interface AssignedTasksStatsProps {
  statistics: AssignedTasksStatistics;
}

export function AssignedTasksStats({ statistics }: AssignedTasksStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="border-0 shadow-sm bg-muted/40">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Toplam</p>
          <p className="text-2xl font-bold">{statistics.total}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="p-4">
          <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Gözləyir</p>
          <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{statistics.pending}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">İcrada</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{statistics.in_progress}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-red-50 dark:bg-red-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3 text-red-600 dark:text-red-400" />
            <p className="text-xs text-red-700 dark:text-red-400">Gecikmiş</p>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{statistics.overdue}</p>
        </CardContent>
      </Card>
    </div>
  );
}
