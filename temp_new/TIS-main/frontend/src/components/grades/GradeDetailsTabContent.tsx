/**
 * GradeDetailsTabContent Component
 *
 * Details tab content for grade information (extracted from GradeDetailsDialog)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Grade } from '@/services/grades';
import {
  Users,
  MapPin,
  Calendar,
  Settings,
  Edit,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { gradeCustomLogic } from './configurations/gradeConfig';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GradeDetailsTabContentProps {
  grade: Grade;
  onEdit: (grade: Grade) => void;
  onManageStudents: (grade: Grade) => void;
  onClose: () => void;
}

export const GradeDetailsTabContent: React.FC<GradeDetailsTabContentProps> = ({
  grade,
  onEdit,
  onManageStudents,
  onClose,
}) => {
  const statusColor = gradeCustomLogic.getStatusColor(grade);
  const warnings = gradeCustomLogic.getCapacityWarnings(grade);

  const capacityPercentage = grade.room?.capacity
    ? Math.min((grade.student_count / grade.room.capacity) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
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

            {grade.academic_year && (
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Tədris İli
                </p>
                <p className="font-medium">{grade.academic_year.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Capacity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tələbə Sayı və Tutum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{grade.student_count}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Oğlan</p>
                <p className="text-2xl font-bold">{grade.male_student_count}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Qız</p>
                <p className="text-2xl font-bold">{grade.female_student_count}</p>
              </div>
            </div>

            {grade.room && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tutum Dolumu</span>
                    <span className="font-medium">{Math.round(capacityPercentage)}%</span>
                  </div>
                  <Progress value={capacityPercentage} className={statusColor} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cari: {grade.student_count}</span>
                    <span>Maksimum: {grade.room.capacity}</span>
                  </div>
                </div>
              </>
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
        <Alert>
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

        <Button variant="outline" onClick={onClose} className="ml-auto">
          Bağla
        </Button>
      </div>
    </div>
  );
};
