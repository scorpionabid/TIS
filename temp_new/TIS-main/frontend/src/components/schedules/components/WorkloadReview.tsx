import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  BookOpen, 
  Clock,
  Eye,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { WorkloadData } from '../ScheduleBuilder';

interface WorkloadReviewProps {
  workloadData: WorkloadData;
  onNext: () => void;
  onBack: () => void;
}

export const WorkloadReview: React.FC<WorkloadReviewProps> = ({
  workloadData,
  onNext,
  onBack
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'validation'>('overview');
  
  const { validation, statistics, teaching_loads } = workloadData;

  const renderValidationStatus = () => {
    if (validation.is_valid) {
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Dərs yükü məlumatları cədvəl yaratmaq üçün hazırdır
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Dərs yükü məlumatlarında problemlər aşkarlandı:
          <ul className="mt-2 list-disc list-inside space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  const renderStatistics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Müəllimlər</p>
              <p className="text-2xl font-bold">{statistics.unique_teachers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Dərs Yükü</p>
              <p className="text-2xl font-bold">{statistics.total_loads}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Həftəlik Saat</p>
              <p className="text-2xl font-bold">{statistics.total_weekly_hours}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Orta Saat/Müəllim</p>
              <p className="text-2xl font-bold">{statistics.average_hours_per_teacher}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTeachingLoads = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium">Dərs Yükləri</h4>
        <Badge variant="outline">{teaching_loads.length} yük</Badge>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3">
        {teaching_loads.map((load) => (
          <Card key={load.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{load.teacher.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {load.subject.name}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Sinif: {load.class.name} • {load.weekly_hours} saat/həftə
                  </div>
                  <div className="text-xs text-gray-500">
                    Prioritet: {load.priority_level}/10 • 
                    Ardıcıl dərs: {load.preferred_consecutive_hours}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {load.weekly_hours}h
                  </div>
                  <div className="text-xs text-gray-500">
                    həftəlik
                  </div>
                </div>
              </div>

              {load.ideal_distribution.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-600 mb-2">İdeal Paylanma:</div>
                  <div className="flex gap-1">
                    {load.ideal_distribution.map((dist, index) => (
                      <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {['B.E', 'Ç.A', 'Çər', 'C.A', 'Cümə', 'Şən', 'Baz'][dist.day - 1]}: {dist.lessons}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTeacherWorkload = () => {
    const teacherWorkloads = teaching_loads.reduce((acc: any, load) => {
      const teacherId = load.teacher.id;
      if (!acc[teacherId]) {
        acc[teacherId] = {
          teacher: load.teacher,
          total_hours: 0,
          subjects: []
        };
      }
      acc[teacherId].total_hours += load.weekly_hours;
      acc[teacherId].subjects.push({
        subject: load.subject.name,
        class: load.class.name,
        hours: load.weekly_hours
      });
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        <h4 className="text-lg font-medium">Müəllim Yük Analizi</h4>
        
        <div className="space-y-3">
          {Object.values(teacherWorkloads).map((teacher: any) => {
            const workloadPercentage = (teacher.total_hours / 25) * 100; // 25 saat maksimum
            const isOverloaded = teacher.total_hours > 25;
            
            return (
              <Card key={teacher.teacher.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-medium">{teacher.teacher.name}</h5>
                      <p className="text-sm text-gray-600">{teacher.teacher.email}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isOverloaded ? 'text-red-600' : 'text-green-600'}`}>
                        {teacher.total_hours}h
                      </div>
                      <div className="text-xs text-gray-500">
                        / 25h maksimum
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Yük səviyyəsi</span>
                      <span className={isOverloaded ? 'text-red-600' : 'text-green-600'}>
                        {Math.round(workloadPercentage)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(workloadPercentage, 100)} 
                      className={`h-2 ${isOverloaded ? 'bg-red-100' : 'bg-green-100'}`}
                    />
                  </div>

                  {isOverloaded && (
                    <div className="mt-2">
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Hədd aşıldı
                      </Badge>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-600 mb-2">Fənnlər:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {teacher.subjects.map((sub: any, index: number) => (
                        <div key={index} className="text-xs bg-gray-50 px-2 py-1 rounded">
                          <div className="font-medium">{sub.subject}</div>
                          <div className="text-gray-600">{sub.class} • {sub.hours}h</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Dərs Yükü Baxışı</h3>
        <p className="text-gray-600">
          Cədvəl yaratmadan əvvəl dərs yüklərini nəzərdən keçirin
        </p>
      </div>

      {renderValidationStatus()}

      <Tabs value={selectedTab} onValueChange={setSelectedTab as any}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Ümumi
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Təfərrüatlı
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Müəllimlər
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderStatistics()}
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dərs Yükü Məlumatları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Fənlər:</span>
                  <div className="font-medium">{statistics.unique_subjects}</div>
                </div>
                <div>
                  <span className="text-gray-600">Siniflər:</span>
                  <div className="font-medium">{statistics.unique_classes}</div>
                </div>
                <div>
                  <span className="text-gray-600">Min saat/müəllim:</span>
                  <div className="font-medium">{statistics.min_hours_per_teacher}</div>
                </div>
                <div>
                  <span className="text-gray-600">Maks saat/müəllim:</span>
                  <div className="font-medium">{statistics.max_hours_per_teacher}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {renderTeachingLoads()}
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          {renderTeacherWorkload()}
          
          {validation.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Xəbərdarlıqlar:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Geri
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!validation.is_valid}
          className={validation.is_valid ? '' : 'opacity-50 cursor-not-allowed'}
        >
          {validation.is_valid ? 'Davam et' : 'Problemləri həll edin'}
        </Button>
      </div>
    </div>
  );
};