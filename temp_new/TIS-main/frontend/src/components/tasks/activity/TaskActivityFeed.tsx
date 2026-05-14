/**
 * TaskActivityFeed Component
 *
 * Displays a timeline of task activities, changes, and comments
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  Edit,
  Flag,
  Calendar,
  Trash2,
  RefreshCw,
  Forward,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api";
import { format, formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { parseMentions } from "../comments/MentionInput";
import { statusLabels, priorityLabels } from "../config/taskFormFields";

// Activity types
type ActivityType =
  | "created"
  | "updated"
  | "status_changed"
  | "assigned"
  | "delegated"
  | "comment"
  | "progress_update"
  | "deadline_changed"
  | "priority_changed"
  | "approved"
  | "rejected"
  | "completed"
  | "reopened";

interface ActivityItem {
  id: number;
  type: ActivityType;
  task_id: number;
  user_id: number;
  user?: {
    id: number;
    name: string;
    email?: string;
  };
  description?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface TaskActivityFeedProps {
  taskId: number;
  className?: string;
  maxItems?: number;
}

// Fetch task activities
const fetchTaskActivities = async (taskId: number): Promise<ActivityItem[]> => {
  const response = await apiClient.get<{ data: ActivityItem[] }>(`/tasks/${taskId}/activities`);
  return response.data || [];
};

// Activity icon mapping
const activityIcons: Record<ActivityType, typeof Clock> = {
  created: FileText,
  updated: Edit,
  status_changed: ArrowRight,
  assigned: UserPlus,
  delegated: Forward,
  comment: MessageSquare,
  progress_update: RefreshCw,
  deadline_changed: Calendar,
  priority_changed: Flag,
  approved: CheckCircle,
  rejected: AlertTriangle,
  completed: CheckCircle,
  reopened: RefreshCw,
};

// Activity color mapping
const activityColors: Record<ActivityType, string> = {
  created: "bg-blue-100 text-blue-600",
  updated: "bg-gray-100 text-gray-600",
  status_changed: "bg-purple-100 text-purple-600",
  assigned: "bg-green-100 text-green-600",
  delegated: "bg-orange-100 text-orange-600",
  comment: "bg-blue-100 text-blue-600",
  progress_update: "bg-cyan-100 text-cyan-600",
  deadline_changed: "bg-yellow-100 text-yellow-600",
  priority_changed: "bg-red-100 text-red-600",
  approved: "bg-green-100 text-green-600",
  rejected: "bg-red-100 text-red-600",
  completed: "bg-green-100 text-green-600",
  reopened: "bg-orange-100 text-orange-600",
};

// Get activity description
function getActivityDescription(activity: ActivityItem): React.ReactNode {
  const userName = activity.user?.name || "İstifadəçi";

  switch (activity.type) {
    case "created":
      return <><strong>{userName}</strong> tapşırığı yaratdı</>;

    case "updated":
      return <><strong>{userName}</strong> tapşırığı redaktə etdi</>;

    case "status_changed":
      return (
        <>
          <strong>{userName}</strong> statusu{" "}
          <Badge variant="outline" className="mx-1">
            {statusLabels[activity.old_value as string] || activity.old_value}
          </Badge>
          {" "}→{" "}
          <Badge variant="secondary" className="mx-1">
            {statusLabels[activity.new_value as string] || activity.new_value}
          </Badge>
          olaraq dəyişdirdi
        </>
      );

    case "assigned":
      return (
        <>
          <strong>{userName}</strong> tapşırığı{" "}
          <strong>{activity.metadata?.assignee_name || activity.new_value}</strong>-ə təyin etdi
        </>
      );

    case "delegated":
      return (
        <>
          <strong>{userName}</strong> tapşırığı{" "}
          <strong>{activity.metadata?.delegate_name || activity.new_value}</strong>-ə yönləndirdi
        </>
      );

    case "comment":
      return (
        <div>
          <strong>{userName}</strong> şərh yazdı:
          <div className="mt-1 p-2 bg-muted rounded-md text-sm">
            {parseMentions(activity.description || "")}
          </div>
        </div>
      );

    case "progress_update":
      return (
        <>
          <strong>{userName}</strong> irəliləyişi{" "}
          <strong>{activity.old_value}%</strong> → <strong>{activity.new_value}%</strong>
          {" "}olaraq yenilədi
        </>
      );

    case "deadline_changed":
      return (
        <>
          <strong>{userName}</strong> son tarixi{" "}
          <strong>{activity.old_value}</strong> → <strong>{activity.new_value}</strong>
          {" "}olaraq dəyişdirdi
        </>
      );

    case "priority_changed":
      return (
        <>
          <strong>{userName}</strong> prioriteti{" "}
          <Badge variant="outline" className="mx-1">
            {priorityLabels[activity.old_value as string] || activity.old_value}
          </Badge>
          {" "}→{" "}
          <Badge variant="secondary" className="mx-1">
            {priorityLabels[activity.new_value as string] || activity.new_value}
          </Badge>
          olaraq dəyişdirdi
        </>
      );

    case "approved":
      return <><strong>{userName}</strong> tapşırığı təsdiqlədi</>;

    case "rejected":
      return (
        <div>
          <strong>{userName}</strong> tapşırığı rədd etdi
          {activity.description && (
            <div className="mt-1 p-2 bg-red-50 rounded-md text-sm text-red-700">
              Səbəb: {activity.description}
            </div>
          )}
        </div>
      );

    case "completed":
      return <><strong>{userName}</strong> tapşırığı tamamladı</>;

    case "reopened":
      return <><strong>{userName}</strong> tapşırığı yenidən açdı</>;

    default:
      return <><strong>{userName}</strong> {activity.description || "dəyişiklik etdi"}</>;
  }
}

// Get initials for avatar
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function TaskActivityFeed({ taskId, className, maxItems = 50 }: TaskActivityFeedProps) {
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ["task-activities", taskId],
    queryFn: () => fetchTaskActivities(taskId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Sort activities by date (newest first)
  const sortedActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, maxItems);
  }, [activities, maxItems]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};

    sortedActivities.forEach((activity) => {
      const date = format(new Date(activity.created_at), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  }, [sortedActivities]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-4 text-muted-foreground", className)}>
        Aktivliklər yüklənərkən xəta baş verdi
      </div>
    );
  }

  if (sortedActivities.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Hələ aktivlik yoxdur</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-[400px]", className)}>
      <div className="space-y-6 pr-4">
        {Object.entries(groupedActivities).map(([date, items]) => (
          <div key={date}>
            {/* Date header */}
            <div className="sticky top-0 bg-background py-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {format(new Date(date), "d MMMM yyyy", { locale: az })}
              </span>
            </div>

            {/* Activities for this date */}
            <div className="space-y-4 relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              {items.map((activity) => {
                const Icon = activityIcons[activity.type] || Clock;

                return (
                  <div key={activity.id} className="flex gap-3 relative">
                    {/* Icon */}
                    <div
                      className={cn(
                        "relative z-10 flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                        activityColors[activity.type]
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="text-sm">{getActivityDescription(activity)}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: az,
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Compact version for sidebar
export function TaskActivityFeedCompact({ taskId }: { taskId: number }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["task-activities", taskId],
    queryFn: () => fetchTaskActivities(taskId),
  });

  const recentActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [activities]);

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  return (
    <div className="space-y-2">
      {recentActivities.map((activity) => {
        const Icon = activityIcons[activity.type] || Clock;

        return (
          <div key={activity.id} className="flex items-start gap-2 text-xs">
            <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", activityColors[activity.type])} />
            <div className="flex-1 min-w-0">
              <span className="text-muted-foreground">
                {activity.user?.name || "İstifadəçi"} - {activity.type}
              </span>
              <div className="text-muted-foreground/60">
                {formatDistanceToNow(new Date(activity.created_at), {
                  addSuffix: true,
                  locale: az,
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
