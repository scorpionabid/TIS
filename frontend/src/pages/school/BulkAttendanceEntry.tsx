import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Save,
  BarChart3,
  School,
  User
} from 'lucide-react';
import bulkAttendanceService, { 
  ClassWithAttendance, 
  ClassAttendanceData 
} from '@/services/bulkAttendance';
import { toast } from 'sonner';

interface AttendanceFormData {
  [gradeId: string]: {
    morning_present: number;
    morning_excused: number;
    morning_unexcused: number;
    evening_present: number;
    evening_excused: number;
    evening_unexcused: number;
    morning_notes: string;
    evening_notes: string;
  };
}

const BulkAttendanceEntry: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeSession, setActiveSession] = useState<'morning' | 'evening'>('morning');
  const [attendanceData, setAttendanceData] = useState<AttendanceFormData>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const queryClient = useQueryClient();

  // Fetch classes and existing attendance data
  const { data: classesData, isLoading, error } = useQuery({
    queryKey: ['bulk-attendance-classes', selectedDate],
    queryFn: () => bulkAttendanceService.getClassesForDate(selectedDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: bulkAttendanceService.saveBulkAttendance.bind(bulkAttendanceService),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['bulk-attendance-classes'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Davamiyyət saxlanarkən səhv baş verdi');
    },
  });

  // Initialize form data when classes are loaded
  useEffect(() => {
    if (classesData?.data.classes) {
      const initialData: AttendanceFormData = {};
      
      classesData.data.classes.forEach((cls) => {
        initialData[cls.id] = {
          morning_present: cls.attendance?.morning_present || 0,
          morning_excused: cls.attendance?.morning_excused || 0,
          morning_unexcused: cls.attendance?.morning_unexcused || 0,
          evening_present: cls.attendance?.evening_present || 0,
          evening_excused: cls.attendance?.evening_excused || 0,
          evening_unexcused: cls.attendance?.evening_unexcused || 0,
          morning_notes: cls.attendance?.morning_notes || '',
          evening_notes: cls.attendance?.evening_notes || '',
        };
      });
      
      setAttendanceData(initialData);
    }
  }, [classesData]);

  // Update attendance data for a specific class
  const updateAttendance = (
    gradeId: number, 
    field: keyof AttendanceFormData[string], 
    value: number | string
  ) => {
    setAttendanceData(prev => ({
      ...prev,
      [gradeId]: {
        ...prev[gradeId],
        [field]: value
      }
    }));

    // Clear error for this field
    const errorKey = `${gradeId}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  // Validate attendance counts for a class
  const validateClass = (gradeId: number, totalStudents: number): boolean => {
    const data = attendanceData[gradeId];
    if (!data) return false;

    const session = activeSession;
    const present = data[`${session}_present`];
    const excused = data[`${session}_excused`];
    const unexcused = data[`${session}_unexcused`];

    const isValid = bulkAttendanceService.validateAttendanceCounts(
      totalStudents, present, excused, unexcused
    );

    if (!isValid) {
      setErrors(prev => ({
        ...prev,
        [`${gradeId}_${session}`]: `Ümumi say ${totalStudents} şagirddən çox ola bilməz`
      }));
    }

    return isValid;
  };

  // Save attendance for current session
  const handleSaveSession = () => {
    if (!classesData?.data.classes || !classesData.data.academic_year) return;

    const classes = classesData.data.classes;
    let hasErrors = false;

    // Validate all classes
    classes.forEach((cls) => {
      if (!validateClass(cls.id, cls.total_students)) {
        hasErrors = true;
      }
    });

    if (hasErrors) {
      toast.error('Zəhmət olmasa bütün xətaları düzəldin');
      return;
    }

    // Prepare data for API
    const requestClasses: ClassAttendanceData[] = classes.map((cls) => {
      const data = attendanceData[cls.id];
      const baseData = {
        grade_id: cls.id,
        session: activeSession as 'morning' | 'evening',
      };

      if (activeSession === 'morning') {
        return {
          ...baseData,
          morning_present: data.morning_present,
          morning_excused: data.morning_excused,
          morning_unexcused: data.morning_unexcused,
          morning_notes: data.morning_notes,
        };
      } else {
        return {
          ...baseData,
          evening_present: data.evening_present,
          evening_excused: data.evening_excused,
          evening_unexcused: data.evening_unexcused,
          evening_notes: data.evening_notes,
        };
      }
    });

    saveAttendanceMutation.mutate({
      attendance_date: selectedDate,
      academic_year_id: classesData.data.academic_year.id,
      classes: requestClasses,
    });
  };

  // Calculate attendance rate for display
  const getAttendanceRate = (present: number, total: number): number => {
    return bulkAttendanceService.calculateAttendanceRate(present, total);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Sinif məlumatları yüklənir...</span>
        </div>
      </div>
    );
  }

  if (error || !classesData?.success) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Sinif məlumatları yüklənərkən səhv baş verdi. Səhifəni yenidən yükləyin.
        </AlertDescription>
      </Alert>
    );
  }

  const classes = classesData.data.classes || [];
  const schoolName = classesData.data.school?.name || 'Məktəb';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Toplu Davamiyyət Qeydiyyatı</h1>
          <p className="text-gray-600 mt-1">
            <School className="inline h-4 w-4 mr-1" />
            {schoolName}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Session Tabs */}
      <Tabs value={activeSession} onValueChange={(value) => setActiveSession(value as 'morning' | 'evening')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="morning" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Səhər sessiyası</span>
          </TabsTrigger>
          <TabsTrigger value="evening" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Axşam sessiyası</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="morning" className="space-y-4">
          <MorningSession 
            classes={classes}
            attendanceData={attendanceData}
            updateAttendance={updateAttendance}
            errors={errors}
            getAttendanceRate={getAttendanceRate}
          />
        </TabsContent>

        <TabsContent value="evening" className="space-y-4">
          <EveningSession 
            classes={classes}
            attendanceData={attendanceData}
            updateAttendance={updateAttendance}
            errors={errors}
            getAttendanceRate={getAttendanceRate}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['bulk-attendance-classes'] })}
        >
          Yenilə
        </Button>
        <Button
          onClick={handleSaveSession}
          disabled={saveAttendanceMutation.isPending}
          className="flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>
            {saveAttendanceMutation.isPending
              ? 'Saxlanılır...'
              : `${activeSession === 'morning' ? 'Səhər' : 'Axşam'} Sessiyasını Saxla`
            }
          </span>
        </Button>
      </div>
    </div>
  );
};

// Morning Session Component
const MorningSession: React.FC<{
  classes: ClassWithAttendance[];
  attendanceData: AttendanceFormData;
  updateAttendance: (gradeId: number, field: keyof AttendanceFormData[string], value: number | string) => void;
  errors: { [key: string]: string };
  getAttendanceRate: (present: number, total: number) => number;
}> = ({ classes, attendanceData, updateAttendance, errors, getAttendanceRate }) => {
  return (
    <div className="grid gap-4">
      {classes.map((cls) => {
        const data = attendanceData[cls.id];
        if (!data) return null;

        const morningTotal = data.morning_present + data.morning_excused + data.morning_unexcused;
        const attendanceRate = getAttendanceRate(data.morning_present, cls.total_students);
        const hasError = errors[`${cls.id}_morning`];
        const isRecorded = cls.attendance?.morning_recorded_at;

        return (
          <Card key={cls.id} className={`${hasError ? 'border-red-300' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-lg">{cls.name}</CardTitle>
                  {isRecorded && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Qeyd edilib</span>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>Ümumi: {cls.total_students}</span>
                  </div>
                  {cls.homeroom_teacher && (
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{cls.homeroom_teacher.name}</span>
                    </div>
                  )}
                </div>
              </div>
              {hasError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{hasError}</AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`morning_present_${cls.id}`} className="text-green-700">
                    🟢 Dərsdə olan
                  </Label>
                  <Input
                    id={`morning_present_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data.morning_present}
                    onChange={(e) => updateAttendance(cls.id, 'morning_present', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`morning_excused_${cls.id}`} className="text-yellow-700">
                    🟡 Üzürlü qeyb
                  </Label>
                  <Input
                    id={`morning_excused_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data.morning_excused}
                    onChange={(e) => updateAttendance(cls.id, 'morning_excused', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`morning_unexcused_${cls.id}`} className="text-red-700">
                    🔴 Üzürsüz qeyb
                  </Label>
                  <Input
                    id={`morning_unexcused_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data.morning_unexcused}
                    onChange={(e) => updateAttendance(cls.id, 'morning_unexcused', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Qeyd edilmiş: {morningTotal}/{cls.total_students}</span>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Davamiyyət: {attendanceRate}%</span>
                </div>
              </div>

              <div>
                <Label htmlFor={`morning_notes_${cls.id}`}>Qeydlər (ixtiyari)</Label>
                <Textarea
                  id={`morning_notes_${cls.id}`}
                  value={data.morning_notes}
                  onChange={(e) => updateAttendance(cls.id, 'morning_notes', e.target.value)}
                  placeholder="Səhər sessiyası üçün qeydlər..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Evening Session Component  
const EveningSession: React.FC<{
  classes: ClassWithAttendance[];
  attendanceData: AttendanceFormData;
  updateAttendance: (gradeId: number, field: keyof AttendanceFormData[string], value: number | string) => void;
  errors: { [key: string]: string };
  getAttendanceRate: (present: number, total: number) => number;
}> = ({ classes, attendanceData, updateAttendance, errors, getAttendanceRate }) => {
  return (
    <div className="grid gap-4">
      {classes.map((cls) => {
        const data = attendanceData[cls.id];
        if (!data) return null;

        const eveningTotal = data.evening_present + data.evening_excused + data.evening_unexcused;
        const attendanceRate = getAttendanceRate(data.evening_present, cls.total_students);
        const hasError = errors[`${cls.id}_evening`];
        const isRecorded = cls.attendance?.evening_recorded_at;

        return (
          <Card key={cls.id} className={`${hasError ? 'border-red-300' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-lg">{cls.name}</CardTitle>
                  {isRecorded && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Qeyd edilib</span>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>Ümumi: {cls.total_students}</span>
                  </div>
                  {cls.homeroom_teacher && (
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{cls.homeroom_teacher.name}</span>
                    </div>
                  )}
                </div>
              </div>
              {hasError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{hasError}</AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`evening_present_${cls.id}`} className="text-green-700">
                    🟢 Dərsdə olan
                  </Label>
                  <Input
                    id={`evening_present_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data.evening_present}
                    onChange={(e) => updateAttendance(cls.id, 'evening_present', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`evening_excused_${cls.id}`} className="text-yellow-700">
                    🟡 Üzürlü qeyb
                  </Label>
                  <Input
                    id={`evening_excused_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data.evening_excused}
                    onChange={(e) => updateAttendance(cls.id, 'evening_excused', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`evening_unexcused_${cls.id}`} className="text-red-700">
                    🔴 Üzürsüz qeyb
                  </Label>
                  <Input
                    id={`evening_unexcused_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data.evening_unexcused}
                    onChange={(e) => updateAttendance(cls.id, 'evening_unexcused', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Qeyd edilmiş: {eveningTotal}/{cls.total_students}</span>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Davamiyyət: {attendanceRate}%</span>
                </div>
              </div>

              <div>
                <Label htmlFor={`evening_notes_${cls.id}`}>Qeydlər (ixtiyari)</Label>
                <Textarea
                  id={`evening_notes_${cls.id}`}
                  value={data.evening_notes}
                  onChange={(e) => updateAttendance(cls.id, 'evening_notes', e.target.value)}
                  placeholder="Axşam sessiyası üçün qeydlər..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BulkAttendanceEntry;