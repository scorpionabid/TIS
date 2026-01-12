import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle, Clock, AlertCircle, XCircle, Play } from 'lucide-react';
import { Task } from '@/services/tasks';

interface TaskAssignmentsSummaryProps {
  task: Task;
  compact?: boolean;
}

interface AssignmentStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  rejected: number;
  accepted: number;
  completionRate: number;
  averageProgress: number;
}

export function TaskAssignmentsSummary({ task, compact = false }: TaskAssignmentsSummaryProps) {
  const stats = useMemo<AssignmentStats>(() => {
    if (!task.assignments || task.assignments.length === 0) {
      return {
        total: 0,
        completed: 0,
        in_progress: 0,
        pending: 0,
        rejected: 0,
        accepted: 0,
        completionRate: 0,
        averageProgress: 0,
      };
    }

    const total = task.assignments.length;
    const completed = task.assignments.filter(a => a.assignment_status === 'completed').length;
    const in_progress = task.assignments.filter(a => a.assignment_status === 'in_progress').length;
    const pending = task.assignments.filter(a => a.assignment_status === 'pending').length;
    const rejected = task.assignments.filter(a => a.assignment_status === 'rejected').length;
    const accepted = task.assignments.filter(a => a.assignment_status === 'accepted').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate average progress from all assignments
    const totalProgress = task.assignments.reduce((sum, a) => sum + (a.progress || 0), 0);
    const averageProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    return {
      total,
      completed,
      in_progress,
      pending,
      rejected,
      accepted,
      completionRate,
      averageProgress,
    };
  }, [task.assignments]);

  if (stats.total === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{stats.total} nəfər</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={stats.completionRate} className="w-24 h-2" />
          <span className="text-xs font-medium">{stats.completionRate}%</span>
        </div>
        <div className="flex gap-1">
          {stats.completed > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              ✓ {stats.completed}
            </Badge>
          )}
          {stats.in_progress > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              ⟳ {stats.in_progress}
            </Badge>
          )}
          {stats.pending > 0 && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
              ⏳ {stats.pending}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          Təyinatların Vəziyyəti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ümumi İcra</span>
            <span className="font-semibold">{stats.averageProgress}%</span>
          </div>
          <Progress value={stats.averageProgress} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {stats.completed} / {stats.total} təyinat tamamlandı ({stats.completionRate}%)
          </p>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {/* Completed */}
          {stats.completed > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50/50 border-green-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Tamamlandı</p>
                <p className="text-lg font-semibold text-green-700">{stats.completed}</p>
              </div>
            </div>
          )}

          {/* In Progress */}
          {stats.in_progress > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 border-blue-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Play className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">İcradadır</p>
                <p className="text-lg font-semibold text-blue-700">{stats.in_progress}</p>
              </div>
            </div>
          )}

          {/* Accepted */}
          {stats.accepted > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-cyan-50/50 border-cyan-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Qəbul edildi</p>
                <p className="text-lg font-semibold text-cyan-700">{stats.accepted}</p>
              </div>
            </div>
          )}

          {/* Pending */}
          {stats.pending > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-50/50 border-yellow-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Gözləyir</p>
                <p className="text-lg font-semibold text-yellow-700">{stats.pending}</p>
              </div>
            </div>
          )}

          {/* Rejected */}
          {stats.rejected > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-red-50/50 border-red-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Rədd edildi</p>
                <p className="text-lg font-semibold text-red-700">{stats.rejected}</p>
              </div>
            </div>
          )}
        </div>

        {/* Individual Assignments List */}
        {stats.total > 1 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">Fərdi Vəziyyətlər:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {task.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-2 rounded-md border bg-muted/30 text-xs"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-medium truncate">
                      {assignment.assignedUser?.name || 'İstifadəçi təyin edilməyib'}
                    </span>
                    <StatusBadge status={assignment.assignment_status} />
                  </div>
                  {assignment.progress !== undefined && assignment.progress > 0 && (
                    <span className="text-muted-foreground ml-2">
                      {assignment.progress}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0">
          Tamamlandı
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0">
          İcradadır
        </Badge>
      );
    case 'accepted':
      return (
        <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] px-1.5 py-0">
          Qəbul edildi
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] px-1.5 py-0">
          Gözləyir
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
          Rədd
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {status}
        </Badge>
      );
  }
}
