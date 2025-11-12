import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Task, taskService } from '@/services/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, Clock, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface TaskDetailsDrawerProps {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackTask?: Task | null;
}

const formatDate = (date?: string) => {
  if (!date) return '—';
  try {
    return format(new Date(date), 'dd.MM.yyyy HH:mm');
  } catch (e) {
    return date;
  }
};

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-medium text-sm">{value ?? '—'}</span>
  </div>
);

export const TaskDetailsDrawer = ({ taskId, open, onOpenChange, fallbackTask }: TaskDetailsDrawerProps) => {
  const {
    data: detailedTask,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => (taskId ? taskService.getById(taskId, false) : Promise.resolve(null)),
    enabled: open && Boolean(taskId),
    staleTime: 60 * 1000,
  });

  const task = useMemo(() => detailedTask ?? fallbackTask ?? null, [detailedTask, fallbackTask]);

  const statusChip = useMemo(() => {
    if (!task) return null;
    switch (task.status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />Tamamlandı
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Clock className="mr-1 h-3 w-3" />İcradadır
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />Gözləyir
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <AlertTriangle className="mr-1 h-3 w-3" />Ləğv edilib
          </Badge>
        );
      default:
        return <Badge variant="outline">{task.status}</Badge>;
    }
  }, [task]);

  const renderAssignments = () => {
    if (!task?.assignments || task.assignments.length === 0) {
      return <p className="text-sm text-muted-foreground">Təyinat məlumatı yoxdur.</p>;
    }

    return (
      <div className="space-y-3">
        {task.assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="rounded-md border p-3 flex flex-col gap-1"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {assignment.assignedUser?.name || 'İstifadəçi təyin edilməyib'}
            </span>
            {assignment.assignedUser?.email && (
              <span className="text-xs text-muted-foreground">{assignment.assignedUser.email}</span>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
              <span>Status: {assignment.assigned_role || '—'}</span>
              <span>İdarə: {assignment.assignedUser?.institution?.name || '—'}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading && !task) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="h-5 w-5" />
          Tapşırıq detalları yüklənə bilmədi.
        </div>
      );
    }

    if (!task) {
      return <p className="text-sm text-muted-foreground">Tapşırıq seçilməyib.</p>;
    }

    return (
      <div className="space-y-4">
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Açıqlama</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {task.description || 'Açıqlama daxil edilməyib.'}
          </p>
        </section>

        <Separator />

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Əsas Məlumatlar</h4>
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Prioritet" value={task.priority} />
            <DetailRow label="Kateqoriya" value={task.category} />
            <DetailRow label="Deadline" value={formatDate(task.deadline)} />
            <DetailRow label="Yaradılma" value={formatDate(task.created_at)} />
            <DetailRow label="Başlanma" value={formatDate(task.started_at)} />
            <DetailRow label="Tamamlama" value={formatDate(task.completed_at)} />
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Təyinatlar</h4>
          {renderAssignments()}
        </section>

        <Separator />

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" /> Yaradan şəxs
            </div>
            <p className="text-sm">{task.creator?.name || '—'}</p>
            {task.creator?.email && (
              <p className="text-xs text-muted-foreground">{task.creator.email}</p>
            )}
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-muted-foreground" /> Məktəb / Müəssisə
            </div>
            <p className="text-sm">{task.assignedInstitution?.name || '—'}</p>
            {task.assignedInstitution?.type && (
              <p className="text-xs text-muted-foreground">{task.assignedInstitution.type}</p>
            )}
          </div>
        </section>
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                {task?.title || 'Tapşırıq detalları'}
                {statusChip}
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                ID: {task?.id ?? taskId ?? '—'}
              </DrawerDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {task?.origin_scope_label || task?.origin_scope || 'Tapşırıq'}
            </Badge>
          </div>
        </DrawerHeader>

        <ScrollArea className="px-6 py-4 h-[60vh]">
          {renderContent()}
        </ScrollArea>

        <DrawerFooter className="border-t pt-4">
          <DrawerClose asChild>
            <Button variant="outline">Bağla</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default TaskDetailsDrawer;
