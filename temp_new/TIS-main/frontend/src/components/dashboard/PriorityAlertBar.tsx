import React from 'react';
import { AlertTriangle, ClipboardList, CheckSquare, FileCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PriorityAlertBarProps {
  urgentSurveys: number;
  urgentTasks: number;
  pendingApprovals: number;
  todayPriorityItems: number;
  onClick?: (type: 'surveys' | 'tasks' | 'approvals' | 'priority') => void;
  className?: string;
}

export const PriorityAlertBar: React.FC<PriorityAlertBarProps> = ({
  urgentSurveys,
  urgentTasks,
  pendingApprovals,
  todayPriorityItems,
  onClick,
  className,
}) => {
  const hasUrgentItems = urgentSurveys > 0 || urgentTasks > 0 || pendingApprovals > 0;

  if (!hasUrgentItems) return null;

  return (
    <Alert
      variant="destructive"
      className={cn(
        "border-l-4 border-l-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors cursor-pointer",
        className
      )}
      onClick={() => onClick?.('priority')}
    >
      <AlertTriangle className="h-5 w-5" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-destructive">
            Diqqət tələb edən {todayPriorityItems} element var
          </span>

          {urgentSurveys > 0 && (
            <div
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.('surveys');
              }}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="text-sm">
                <Badge variant="destructive" className="mr-1">{urgentSurveys}</Badge>
                urgent sorğu
              </span>
            </div>
          )}

          {urgentTasks > 0 && (
            <div
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.('tasks');
              }}
            >
              <CheckSquare className="h-4 w-4" />
              <span className="text-sm">
                <Badge variant="destructive" className="mr-1">{urgentTasks}</Badge>
                təcili tapşırıq
              </span>
            </div>
          )}

          {pendingApprovals > 0 && (
            <div
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.('approvals');
              }}
            >
              <FileCheck className="h-4 w-4" />
              <span className="text-sm">
                <Badge variant="destructive" className="mr-1">{pendingApprovals}</Badge>
                təsdiq gözləyir
              </span>
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
          Klikləyərək detallara baxın
        </span>
      </AlertDescription>
    </Alert>
  );
};
