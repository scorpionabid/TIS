import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Users, 
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit,
  Eye,
  MoreHorizontal,
  BookOpen,
  Star,
  Clock,
  Award,
  Briefcase,
  Building,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchoolTeacher } from '@/services/schoolAdmin';

interface TeacherCardProps {
  teacher: SchoolTeacher;
  onViewDetails: (teacher: SchoolTeacher) => void;
  onEdit: (teacher: SchoolTeacher) => void;
  getDepartmentText: (department?: string) => string;
  getPositionText: (position?: string) => string;
  getPerformanceColor: (rating?: number) => string;
  getWorkloadColor: (hours?: number) => string;
}

export const TeacherCard: React.FC<TeacherCardProps> = ({ 
  teacher, 
  onViewDetails,
  onEdit,
  getDepartmentText,
  getPositionText,
  getPerformanceColor,
  getWorkloadColor
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Teacher Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {teacher.first_name} {teacher.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getPositionText(teacher.position)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getDepartmentText(teacher.department)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                {teacher.is_active ? 'Aktiv' : 'Passiv'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails(teacher)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ətraflı bax
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(teacher)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Redaktə et
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Users className="h-4 w-4 mr-2" />
                    Siniflər
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Dərslər
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Award className="h-4 w-4 mr-2" />
                    Performans
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopyala
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText className="h-4 w-4 mr-2" />
                    Hesabat al
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 gap-2 text-sm">
            {teacher.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{teacher.email}</span>
              </div>
            )}
            
            {teacher.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{teacher.phone}</span>
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {teacher.performance_rating && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reytinq</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="font-medium">{teacher.performance_rating.toFixed(1)}</span>
                  </div>
                </div>
                <Badge variant={getPerformanceColor(teacher.performance_rating)} className="text-xs">
                  {teacher.performance_rating >= 4.5 ? 'Əla' : 
                   teacher.performance_rating >= 3.5 ? 'Yaxşı' : 
                   teacher.performance_rating >= 2.5 ? 'Orta' : 'Zəif'}
                </Badge>
              </div>
            )}

            {teacher.weekly_hours && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Həftəlik saat</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="font-medium">{teacher.weekly_hours}s</span>
                  </div>
                </div>
                <Badge variant={getWorkloadColor(teacher.weekly_hours)} className="text-xs">
                  {teacher.weekly_hours >= 35 ? 'Həddindən artıq' : 
                   teacher.weekly_hours >= 25 ? 'Yüksək' : 
                   teacher.weekly_hours >= 15 ? 'Normal' : 'Az'}
                </Badge>
              </div>
            )}
          </div>

          {/* Subjects */}
          {teacher.subjects && teacher.subjects.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Dərslər:</div>
              <div className="flex flex-wrap gap-1">
                {teacher.subjects.slice(0, 3).map((subject, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {subject.name}
                  </Badge>
                ))}
                {teacher.subjects.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{teacher.subjects.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Classes */}
          {teacher.classes && teacher.classes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Siniflər:</div>
              <div className="flex flex-wrap gap-1">
                {teacher.classes.slice(0, 4).map((classInfo, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {classInfo.name}
                  </Badge>
                ))}
                {teacher.classes.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{teacher.classes.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" className="flex-1">
              <Users className="h-3 w-3 mr-1" />
              Siniflər
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <BookOpen className="h-3 w-3 mr-1" />
              Dərslər
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Award className="h-3 w-3 mr-1" />
              Performans
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};