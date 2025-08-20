import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  School, 
  MoreHorizontal,
  Eye,
  Edit,
  Users,
  CalendarDays,
  BookOpen,
  Copy,
  FileText,
  MapPin,
  User,
  AlertTriangle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SchoolClass } from '@/services/schoolAdmin';

interface ClassCardProps {
  schoolClass: SchoolClass;
  onViewDetails: (schoolClass: SchoolClass) => void;
  getGradeLevelText: (level: number) => string;
}

export const ClassCard: React.FC<ClassCardProps> = ({ 
  schoolClass, 
  onViewDetails,
  getGradeLevelText 
}) => {
  const capacityPercentage = (schoolClass.current_enrollment / schoolClass.capacity) * 100;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Class Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                <School className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{schoolClass.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {getGradeLevelText(schoolClass.grade_level)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {schoolClass.academic_year} akademik ili
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={schoolClass.is_active ? 'default' : 'secondary'}>
                {schoolClass.is_active ? 'Aktiv' : 'Passiv'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails(schoolClass)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ətraflı bax
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Redaktə et
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Users className="h-4 w-4 mr-2" />
                    Şagirdlər
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Cədvəl
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Davamiyyət
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

          {/* Class Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {schoolClass.room_number && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Otaq: {schoolClass.room_number}</span>
              </div>
            )}
            
            {schoolClass.class_teacher && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="truncate">{schoolClass.class_teacher.name}</span>
              </div>
            )}

            {!schoolClass.class_teacher && schoolClass.is_active && (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Sinif rəhbəri təyin edilməyib</span>
              </div>
            )}
          </div>

          {/* Enrollment Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Şagird sayı</span>
              <span className="font-medium">
                {schoolClass.current_enrollment}/{schoolClass.capacity}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                className={cn(
                  "h-full transition-all",
                  capacityPercentage >= 95 && "bg-red-500",
                  capacityPercentage >= 80 && capacityPercentage < 95 && "bg-orange-500",
                  capacityPercentage < 80 && "bg-green-500"
                )}
                style={{ width: `${capacityPercentage}%` }}
              />
            </div>
            {capacityPercentage >= 95 && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Tutum həddini aşıb
              </p>
            )}
            {capacityPercentage >= 80 && capacityPercentage < 95 && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Tutuma yaxın
              </p>
            )}
          </div>

          {/* Schedule Info */}
          {schoolClass.schedule && schoolClass.schedule.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Bu həftəki dərslər:</div>
              <div className="flex flex-wrap gap-1">
                {schoolClass.schedule.slice(0, 3).map((schedule, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {schedule.subject_name}
                  </Badge>
                ))}
                {schoolClass.schedule.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{schoolClass.schedule.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" className="flex-1">
              <Users className="h-3 w-3 mr-1" />
              Şagirdlər
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <BookOpen className="h-3 w-3 mr-1" />
              Davamiyyət
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <CalendarDays className="h-3 w-3 mr-1" />
              Cədvəl
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};