import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  FileText,
  Edit,
  Eye,
  MoreHorizontal,
  Download,
  Send,
  Calendar,
  BarChart3,
  Target,
  Award,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Assessment } from '@/services/schoolAdmin';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AssessmentCardProps {
  assessment: Assessment;
  onViewGrades: (assessment: Assessment) => void;
  onEdit: (assessment: Assessment) => void;
  onSubmit: (assessmentId: number) => void;
  getAssessmentTypeText: (type: string) => string;
  calculateClassAverage: (assessment: Assessment) => number;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({ 
  assessment, 
  onViewGrades,
  onEdit,
  onSubmit,
  getAssessmentTypeText,
  calculateClassAverage
}) => {
  const classAverage = calculateClassAverage(assessment);
  const gradeCount = assessment.grades?.length || 0;
  const isSubmitted = assessment.status === 'submitted';
  const isDraft = assessment.status === 'draft';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'default';
      case 'draft': return 'secondary';
      case 'graded': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Təqdim edilib';
      case 'draft': return 'Layihə';
      case 'graded': return 'Qiymətləndirilib';
      default: return 'Naməlum';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{assessment.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{getAssessmentTypeText(assessment.assessment_type)}</Badge>
              <Badge variant={getStatusColor(assessment.status)}>
                {getStatusText(assessment.status)}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewGrades(assessment)}>
                <Eye className="h-4 w-4 mr-2" />
                Qiymətlərə bax
              </DropdownMenuItem>
              {isDraft && (
                <DropdownMenuItem onClick={() => onEdit(assessment)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Redaktə et
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistika
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                İxrac et
              </DropdownMenuItem>
              {isDraft && gradeCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSubmit(assessment.id)}>
                    <Send className="h-4 w-4 mr-2" />
                    Təqdim et
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Assessment Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Fənn</div>
            <div className="font-medium">{assessment.subject}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Ümumi bal</div>
            <div className="font-medium">{assessment.total_points} bal</div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {format(new Date(assessment.date), 'dd MMMM yyyy', { locale: az })}
          </span>
        </div>

        {/* Progress and Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Qiymətləndirilən</span>
            <span className="font-medium">{gradeCount} şagird</span>
          </div>

          {gradeCount > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sinif ortalaması</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-bold",
                      classAverage >= 4.0 ? "text-green-600" :
                      classAverage >= 3.0 ? "text-blue-600" :
                      classAverage >= 2.0 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {classAverage.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {assessment.total_points}
                    </span>
                  </div>
                </div>
                
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className={cn(
                      "h-full transition-all",
                      classAverage >= 4.0 ? "bg-green-500" :
                      classAverage >= 3.0 ? "bg-blue-500" :
                      classAverage >= 2.0 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${(classAverage / assessment.total_points) * 100}%` }}
                  />
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="flex items-center gap-2 text-xs">
                {classAverage >= 4.0 ? (
                  <>
                    <Award className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Əla performans</span>
                  </>
                ) : classAverage >= 3.0 ? (
                  <>
                    <Target className="h-3 w-3 text-blue-600" />
                    <span className="text-blue-600">Yaxşı performans</span>
                  </>
                ) : classAverage >= 2.0 ? (
                  <>
                    <Clock className="h-3 w-3 text-yellow-600" />
                    <span className="text-yellow-600">Orta performans</span>
                  </>
                ) : (
                  <>
                    <Target className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">Zəif performans</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onViewGrades(assessment)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Qiymətlər
          </Button>
          
          {isDraft && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onEdit(assessment)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Redaktə
            </Button>
          )}
          
          {isDraft && gradeCount > 0 && (
            <Button 
              size="sm" 
              onClick={() => onSubmit(assessment.id)}
            >
              <Send className="h-3 w-3 mr-1" />
              Təqdim et
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};