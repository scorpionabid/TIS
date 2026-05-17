import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Edit,
  Eye,
  Activity,
  BookOpen,
  Heart,
  Users,
  User,
  Brain
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { StudentCase } from './hooks/usePsixoloquDashboard';

interface ActiveCasesProps {
  cases: StudentCase[];
  getCaseTypeLabel: (type: string) => string;
  getSeverityLabel: (severity: string) => string;
  getStatusLabel: (status: string) => string;
  getSeverityColor: (severity: string) => string;
  getStatusColor: (status: string) => string;
}

export const ActiveCases: React.FC<ActiveCasesProps> = ({
  cases,
  getCaseTypeLabel,
  getSeverityLabel,
  getStatusLabel,
  getSeverityColor,
  getStatusColor
}) => {
  const getCaseTypeIcon = (type: string) => {
    switch (type) {
      case 'behavioral': return Activity;
      case 'academic': return BookOpen;
      case 'emotional': return Heart;
      case 'social': return Users;
      case 'family': return User;
      default: return Brain;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktiv Psixoloji Hallar</CardTitle>
        <CardDescription>Hazırda izlənilən və müalicə olunan hallar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cases.map((caseItem) => {
            const CaseTypeIcon = getCaseTypeIcon(caseItem.case_type);
            return (
              <div key={caseItem.id} className="flex items-start gap-3 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                <div className={cn(
                  "p-2 rounded-lg",
                  caseItem.severity === 'severe' ? "bg-destructive/10" :
                  caseItem.severity === 'moderate' ? "bg-warning/10" : "bg-secondary/10"
                )}>
                  <CaseTypeIcon className={cn(
                    "h-4 w-4",
                    caseItem.severity === 'severe' ? "text-destructive" :
                    caseItem.severity === 'moderate' ? "text-warning" : "text-secondary"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{caseItem.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {caseItem.student_class} • {getCaseTypeLabel(caseItem.case_type)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getSeverityColor(caseItem.severity)} className="text-xs">
                        {getSeverityLabel(caseItem.severity)}
                      </Badge>
                      <Badge variant={getStatusColor(caseItem.status)} className="text-xs">
                        {getStatusLabel(caseItem.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        Açılıb: {format(new Date(caseItem.opened_date), 'dd MMM yyyy', { locale: az })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        Son sesiya: {formatDistanceToNow(new Date(caseItem.last_session), { addSuffix: true, locale: az })}
                      </span>
                    </div>
                  </div>
                  {caseItem.next_appointment && (
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Növbəti: {format(new Date(caseItem.next_appointment), 'dd MMM HH:mm', { locale: az })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};