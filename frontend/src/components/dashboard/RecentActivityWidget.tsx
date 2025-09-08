import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlusIcon, 
  FileTextIcon, 
  CheckCircleIcon,
  ShareIcon,
  LogInIcon
} from "lucide-react";
import { memo } from "react";

interface Activity {
  id: number;
  type: 'user_created' | 'survey_created' | 'task_assigned' | 'task_completed' | 'document_shared' | 'login';
  title: string;
  description: string;
  user: {
    id: number;
    name: string;
  };
  created_at: string;
  metadata?: Record<string, any>;
}

interface RecentActivityWidgetProps {
  activities: Activity[];
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'user_created': return UserPlusIcon;
    case 'survey_created': return FileTextIcon;
    case 'task_assigned': return FileTextIcon;
    case 'task_completed': return CheckCircleIcon;
    case 'document_shared': return ShareIcon;
    case 'login': return LogInIcon;
    default: return FileTextIcon;
  }
};

const getActivityColor = (type: Activity['type']) => {
  switch (type) {
    case 'user_created': return 'bg-blue-500';
    case 'survey_created': return 'bg-green-500';
    case 'task_assigned': return 'bg-yellow-500';
    case 'task_completed': return 'bg-green-600';
    case 'document_shared': return 'bg-purple-500';
    case 'login': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
};

const getActivityTypeLabel = (type: Activity['type']) => {
  switch (type) {
    case 'user_created': return 'İstifadəçi yaradıldı';
    case 'survey_created': return 'Sorğu yaradıldı';
    case 'task_assigned': return 'Tapşırıq təyin edildi';
    case 'task_completed': return 'Tapşırıq tamamlandı';
    case 'document_shared': return 'Sənəd paylaşıldı';
    case 'login': return 'Giriş edildi';
    default: return 'Fəaliyyət';
  }
};

export const RecentActivityWidget = memo(({ activities }: RecentActivityWidgetProps) => {
  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Son Fəaliyyətlər</CardTitle>
          <CardDescription>Heç bir fəaliyyət tapılmadı</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Fəaliyyət məlumatları mövcud deyil
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Fəaliyyətlər</CardTitle>
        <CardDescription>
          Sistemdə ən son {activities.length} fəaliyyət
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type);
            const typeLabel = getActivityTypeLabel(activity.type);
            
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">
                      {activity.title}
                    </p>
                    <Badge variant="outline" className="ml-2">
                      {typeLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activity.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{activity.user.name}</span>
                    <span>
                      {new Date(activity.created_at).toLocaleDateString('az-AZ', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

RecentActivityWidget.displayName = 'RecentActivityWidget';

export default RecentActivityWidget;