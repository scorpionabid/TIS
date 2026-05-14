import { useQuery } from '@tanstack/react-query';
import { History, ArrowRight, Clock, User, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { taskDelegationService, DelegationHistoryItem } from '@/services/taskDelegation';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';

interface TaskDelegationHistoryProps {
  taskId: number;
  showOnlyCurrentUser?: boolean;
  currentUserId?: number;
}

export function TaskDelegationHistory({
  taskId,
  showOnlyCurrentUser = false,
  currentUserId
}: TaskDelegationHistoryProps) {
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['task-delegation-history', taskId],
    queryFn: () => taskDelegationService.getDelegationHistory(taskId),
  });

  const filteredHistory = showOnlyCurrentUser && currentUserId
    ? history?.filter(item => item.delegated_by_user.id === currentUserId)
    : history;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Delegation tarixçəsi yüklənərkən xəta baş verdi.
        </AlertDescription>
      </Alert>
    );
  }

  if (!filteredHistory || filteredHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">
          {showOnlyCurrentUser
            ? 'Siz hələ bu tapşırığı yönləndirməmisiniz.'
            : 'Bu tapşırıq üçün yönləndirmə tarixçəsi yoxdur.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Yönləndirmə Tarixçəsi
          </h3>
          <p className="text-sm text-muted-foreground">
            Toplam {filteredHistory.length} yönləndirmə
          </p>
        </div>
        {showOnlyCurrentUser && (
          <Badge variant="outline">Mənim yönləndirmələrim</Badge>
        )}
      </div>

      <div className="relative space-y-4">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-border" />

        {filteredHistory.map((item, index) => (
          <DelegationHistoryItem
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === filteredHistory.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface DelegationHistoryItemProps {
  item: DelegationHistoryItem;
  isFirst: boolean;
  isLast: boolean;
}

function DelegationHistoryItem({ item, isFirst, isLast }: DelegationHistoryItemProps) {
  const isMultiDelegation = item.delegation_metadata?.is_multi_delegation;
  const isAdditional = item.delegation_metadata?.is_additional_assignment;

  // Safe access to user data with fallbacks
  const fromUserName = item.delegated_from_user?.name || item.delegated_from_user_id?.toString() || 'İstifadəçi';
  const toUserName = item.delegated_to_user?.name || item.delegated_to_user_id?.toString() || 'İstifadəçi';

  return (
    <Card className="relative ml-10">
      {/* Timeline dot */}
      <div className={`absolute -left-[30px] top-6 h-10 w-10 rounded-full border-4 border-background flex items-center justify-center ${
        isFirst ? 'bg-primary' : 'bg-muted'
      }`}>
        <ArrowRight className={`h-4 w-4 ${isFirst ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{fromUserName}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-primary">{toUserName}</span>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(item.delegated_at), {
                addSuffix: true,
                locale: az
              })}
              <span className="text-muted-foreground">
                ({new Date(item.delegated_at).toLocaleString('az-AZ', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })})
              </span>
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {isFirst && (
              <Badge variant="default" className="text-xs">
                Son
              </Badge>
            )}
            {isMultiDelegation && (
              <Badge variant="secondary" className="text-xs">
                Çoxlu
              </Badge>
            )}
            {isAdditional && (
              <Badge variant="outline" className="text-xs">
                Əlavə
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {item.delegation_reason && (
        <CardContent className="pt-0">
          <div className="flex gap-2 p-3 bg-muted/50 rounded-md">
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Səbəb:</p>
              <p className="text-sm">{item.delegation_reason}</p>
            </div>
          </div>
        </CardContent>
      )}

      {item.delegation_metadata?.previous_status && (
        <CardContent className="pt-0 pb-3">
          <p className="text-xs text-muted-foreground">
            Əvvəlki status: <Badge variant="outline" className="text-xs">{item.delegation_metadata.previous_status}</Badge>
            {item.delegation_metadata.previous_progress !== undefined && (
              <> • Progress: {item.delegation_metadata.previous_progress}%</>
            )}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
