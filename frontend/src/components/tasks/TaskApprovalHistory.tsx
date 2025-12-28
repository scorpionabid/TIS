import { useQuery } from '@tanstack/react-query';
import { taskApprovalService } from '@/services/taskApproval';
import { CheckCircle2, XCircle, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TaskApprovalHistoryProps {
  taskId: number;
}

export function TaskApprovalHistory({ taskId }: TaskApprovalHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['task-approval-history', taskId],
    queryFn: () => taskApprovalService.getApprovalHistory(taskId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.history || data.history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
        Hələ təsdiq tarixçəsi yoxdur
      </div>
    );
  }

  const actionConfig = {
    submitted_for_approval: {
      icon: Send,
      label: 'Təsdiq üçün göndərildi',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    approved: {
      icon: CheckCircle2,
      label: 'Təsdiqləndi',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    rejected: {
      icon: XCircle,
      label: 'Rədd edildi',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Təsdiq Tarixçəsi</h3>

      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {data.history.map((item) => {
            const config = actionConfig[item.action as keyof typeof actionConfig];
            if (!config) return null;

            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className={`border-l-2 ${config.borderColor} pl-4 pb-3`}
              >
                <div className="flex gap-3">
                  <div className={`mt-1 ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-sm">
                          {item.action_label || config.label}
                        </span>
                        {item.user && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.user.name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', {
                          locale: az,
                        })}
                      </span>
                    </div>

                    {item.notes && (
                      <div className={`text-sm ${config.bgColor} ${config.borderColor} border p-3 rounded-md`}>
                        <p className="text-sm font-medium mb-1">Qeyd:</p>
                        <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
