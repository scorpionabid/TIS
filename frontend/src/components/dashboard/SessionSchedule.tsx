import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  Eye,
  ClipboardList,
  MessageCircle,
  TrendingUp,
  Users,
  Brain
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PsychologySession } from './hooks/usePsixoloquDashboard';

interface SessionScheduleProps {
  sessions: PsychologySession[];
  getSessionTypeLabel: (type: string) => string;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}

export const SessionSchedule: React.FC<SessionScheduleProps> = ({
  sessions,
  getSessionTypeLabel,
  getStatusLabel,
  getStatusColor,
  getPriorityColor
}) => {
  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'assessment': return ClipboardList;
      case 'counseling': return MessageCircle;
      case 'follow_up': return TrendingUp;
      case 'group_therapy': return Users;
      default: return Brain;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planlaşdırılmış Sesiyalar
            </CardTitle>
            <CardDescription>
              Yaxın günlərdə planlaşdırılan psixoloji sesiyalar
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Tam təqvim
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.map((session) => {
          const SessionTypeIcon = getSessionTypeIcon(session.session_type);
          return (
            <div key={session.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className={cn(
                "p-2 rounded-lg",
                session.priority === 'high' ? "bg-destructive/10" :
                session.priority === 'medium' ? "bg-warning/10" : "bg-secondary/10"
              )}>
                <SessionTypeIcon className={cn(
                  "h-4 w-4",
                  session.priority === 'high' ? "text-destructive" :
                  session.priority === 'medium' ? "text-warning" : "text-secondary"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.student_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.student_class} • {getSessionTypeLabel(session.session_type)}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(session.date), 'HH:mm', { locale: az })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {session.duration} dəq
                    </span>
                  </div>
                </div>
                {session.notes && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {session.notes}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Badge variant={getPriorityColor(session.priority)} className="text-xs">
                  {session.priority}
                </Badge>
                <Badge variant={getStatusColor(session.status)} className="text-xs">
                  {getStatusLabel(session.status)}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};