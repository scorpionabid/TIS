import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, CheckSquare, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { TodayPriorityItem } from '@/services/schoolAdmin';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';

interface TodayPriorityPanelProps {
  items: TodayPriorityItem[];
  isLoading?: boolean;
  onItemClick: (item: TodayPriorityItem) => void;
  className?: string;
}

export const TodayPriorityPanel: React.FC<TodayPriorityPanelProps> = ({
  items,
  isLoading,
  onItemClick,
  className,
}) => {
  const getItemIcon = (type: string) => {
    return type === 'survey' ? ClipboardList : CheckSquare;
  };

  const getPriorityColor = (item: TodayPriorityItem) => {
    if (item.is_overdue) return 'destructive';
    if (item.hours_remaining <= 3) return 'destructive';
    if (item.hours_remaining <= 6) return 'warning';
    return 'secondary';
  };

  const getTimeText = (item: TodayPriorityItem) => {
    if (item.is_overdue) {
      return `${item.hours_remaining} saat gecikib`;
    }
    return `${item.hours_remaining} saat qalıb`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Bugünkü PRİORİTET
          </CardTitle>
          <CardDescription>Diqqət tələb edən elementlər</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-muted rounded" />
                  <div className="w-1/2 h-3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-success" />
            Bugünkü PRİORİTET
          </CardTitle>
          <CardDescription>Diqqət tələb edən elementlər</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Bugün üçün prioritet element yoxdur</p>
            <p className="text-xs text-muted-foreground mt-2">Bütün tapşırıqlar vaxtında yerinə yetirilib</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-4 border-l-destructive", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive animate-pulse" />
              Bugünkü PRİORİTET
            </CardTitle>
            <CardDescription>
              {items.length} element diqqət tələb edir
            </CardDescription>
          </div>
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => {
            const ItemIcon = getItemIcon(item.type);
            const priorityColor = getPriorityColor(item);

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                  "hover:shadow-md hover:scale-[1.02]",
                  item.is_overdue && "border-destructive bg-destructive/5"
                )}
                onClick={() => onItemClick(item)}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  priorityColor === 'destructive' ? "bg-destructive/10" :
                  priorityColor === 'warning' ? "bg-warning/10" : "bg-secondary/10"
                )}>
                  <ItemIcon className={cn(
                    "h-4 w-4",
                    priorityColor === 'destructive' ? "text-destructive" :
                    priorityColor === 'warning' ? "text-warning" : "text-secondary"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium truncate">{item.title}</p>
                    <Badge variant={priorityColor} className="text-xs whitespace-nowrap">
                      {item.type === 'survey' ? 'Sorğu' : 'Tapşırıq'}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      <span className={cn(
                        "font-medium",
                        item.is_overdue ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {getTimeText(item)}
                      </span>
                    </div>

                    {item.is_overdue && (
                      <Badge variant="destructive" className="text-xs">
                        GECİKİB
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onItemClick(item);
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
