import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Grade } from '@/services/grades';
import { 
  Users, 
  MapPin, 
  UserCheck, 
  Calendar,
  School,
  BookOpen,
  Settings,
  Edit,
  UserPlus,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { gradeCustomLogic } from './configurations/gradeConfig';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GradeDetailsDialogProps {
  grade: Grade;
  onClose: () => void;
  onEdit: (grade: Grade) => void;
  onManageStudents: (grade: Grade) => void;
}

export const GradeDetailsDialog: React.FC<GradeDetailsDialogProps> = ({
  grade,
  onClose,
  onEdit,
  onManageStudents,
}) => {
  // Get capacity status color and warnings
  const statusColor = gradeCustomLogic.getStatusColor(grade);
  const warnings = gradeCustomLogic.getCapacityWarnings(grade);

  // Calculate capacity percentage
  const capacityPercentage = grade.room?.capacity 
    ? Math.min((grade.student_count / grade.room.capacity) * 100, 100)
    : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            {grade.display_name || grade.full_name}
            <Badge variant={grade.is_active ? 'default' : 'secondary'} className="ml-2">
              {grade.is_active ? 'Aktiv' : 'Deaktiv'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Əsas Məlumatlar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sinif Adı</p>
                  <p className="font-medium">{grade.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Səviyyə</p>
                  <p className="font-medium">{grade.class_level}. sinif</p>
                </div>
              </div>

              {grade.specialty && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">İxtisas</p>
                  <Badge variant="outline">{grade.specialty}</Badge>
                </div>
              )}

              {grade.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Təsvir</p>
                  <p className="text-sm">{grade.description}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Yaradılma tarixi</p>
                  <p>{new Date(grade.created_at).toLocaleDateString('az-AZ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Son yenilənmə</p>
                  <p>{new Date(grade.updated_at).toLocaleDateString('az-AZ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capacity Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Tutum Məlumatları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tələbə Sayı</span>
                  <span className="font-bold">{grade.student_count}</span>
                </div>
                
                {grade.room?.capacity && (
                  <>
                    <Progress value={capacityPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tutum: {grade.room.capacity}</span>
                      <span>İstifadə: {grade.utilization_rate}%</span>
                    </div>
                    <div className="text-sm">
                      <Badge 
                        variant={
                          grade.capacity_status === 'available' ? 'default' :
                          grade.capacity_status === 'near_capacity' ? 'secondary' :
                          grade.capacity_status === 'full' ? 'outline' :
                          'destructive'
                        }
                      >
                        {
                          grade.capacity_status === 'available' ? 'Müsait' :
                          grade.capacity_status === 'near_capacity' ? 'Dolmağa Yaxın' :
                          grade.capacity_status === 'full' ? 'Dolu' :
                          grade.capacity_status === 'over_capacity' ? 'Həddindən Çox' :
                          'Otaq Yoxdur'
                        }
                      </Badge>
                    </div>
                  </>
                )}

                {!grade.room?.capacity && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Bu sinif üçün otaq təyin edilməyib
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Academic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Təhsil Məlumatları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {grade.academic_year && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Təhsil İli</p>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{grade.academic_year.name}</span>
                    {grade.academic_year.is_active && (
                      <Badge variant="default" className="text-xs">Aktiv</Badge>
                    )}
                  </div>
                </div>
              )}

              {grade.institution && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Məktəb</p>
                  <p className="font-medium">{grade.institution.name}</p>
                  <p className="text-xs text-muted-foreground">{grade.institution.type}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Room & Teacher Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Otaq və Müəllim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Otaq</p>
                {grade.room ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">{grade.room.full_identifier}</p>
                      <p className="text-xs text-muted-foreground">
                        Tutum: {grade.room.capacity} | Növ: {grade.room.room_type}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">Otaq təyin edilməyib</span>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground">Sinif Rəhbəri</p>
                {grade.homeroom_teacher ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">{grade.homeroom_teacher.full_name}</p>
                      <p className="text-xs text-muted-foreground">{grade.homeroom_teacher.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">Sinif rəhbəri təyin edilməyib</span>
                  </div>
                )}
              </div>

              {grade.teacher_assigned_at && (
                <div className="text-xs text-muted-foreground">
                  Müəllim təyin tarixi: {new Date(grade.teacher_assigned_at).toLocaleDateString('az-AZ')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Diqqət tələb edən məsələlər:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button onClick={() => onEdit(grade)} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Redaktə Et
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => onManageStudents(grade)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Tələbələri İdarə Et
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => {
              // TODO: Implement analytics
              console.log('Analytics for grade:', grade.id);
            }}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analitika
          </Button>
          
          <Button variant="outline" onClick={onClose} className="ml-auto">
            Bağla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};