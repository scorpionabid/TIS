import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskApprovalBadgeProps {
  approvalStatus: 'pending' | 'approved' | 'rejected' | null | undefined;
  requiresApproval: boolean;
  className?: string;
}

export function TaskApprovalBadge({
  approvalStatus,
  requiresApproval,
  className,
}: TaskApprovalBadgeProps) {
  if (!requiresApproval) {
    return null;
  }

  if (!approvalStatus) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          'bg-gray-100 text-gray-700 border-gray-300 flex items-center gap-1',
          className
        )}
      >
        <AlertCircle className="h-3 w-3" />
        Təsdiq tələb edir
      </Badge>
    );
  }

  const config = {
    pending: {
      icon: Clock,
      label: 'Təsdiqi Gözləyir',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    approved: {
      icon: CheckCircle2,
      label: 'Təsdiqləndi',
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    rejected: {
      icon: XCircle,
      label: 'Rədd edildi',
      className: 'bg-red-100 text-red-800 border-red-300',
    },
  };

  const status = config[approvalStatus as keyof typeof config];

  if (!status) return null;

  const Icon = status.icon;

  return (
    <Badge
      variant="outline"
      className={cn('flex items-center gap-1', status.className, className)}
    >
      <Icon className="h-3 w-3" />
      {status.label}
    </Badge>
  );
}
