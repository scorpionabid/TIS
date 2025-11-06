import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Save,
  BarChart3,
  School,
  User,
  CheckSquare,
  StickyNote,
  Download
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

interface AttendanceError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

// Media query hook for responsive design
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

const BulkAttendanceEntry: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeSession, setActiveSession] = useState<'morning' | 'evening'>('morning');
  const [attendanceData, setAttendanceData] = useState<AttendanceFormData>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Responsive design
  const isDesktop = useMediaQuery('(min-width: 1024px)');
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
    onError: (error: AttendanceError) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Davamiyyət saxlanarkən səhv baş verdi';
      toast.error(errorMessage);
    },
  });

  // Initialize form data when classes are loaded
  useEffect(() => {
    if (classesData?.data.classes) {
      const initialData: AttendanceFormData = {};

      classesData.data.classes.forEach((cls) => {
        // If attendance data exists, use it. Otherwise, default to all students present
        initialData[cls.id] = {
          morning_present: cls.attendance?.morning_present ?? cls.total_students,
          morning_excused: cls.attendance?.morning_excused ?? 0,
          morning_unexcused: cls.attendance?.morning_unexcused ?? 0,
          evening_present: cls.attendance?.evening_present ?? cls.total_students,
          evening_excused: cls.attendance?.evening_excused ?? 0,
          evening_unexcused: cls.attendance?.evening_unexcused ?? 0,
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

  // Bulk actions handlers
  const handleMarkAllPresent = () => {
    const newData = { ...attendanceData };
    classes.forEach((cls) => {
      if (cls.total_students > 0) {
        newData[cls.id] = {
          ...newData[cls.id],
          [`${activeSession}_present`]: cls.total_students,
          [`${activeSession}_excused`]: 0,
          [`${activeSession}_unexcused`]: 0,
        };
      }
    });
    setAttendanceData(newData);
    toast.success('Bütün siniflər "dərsdə olan" olaraq işarələndi');
  };

  const handleExportData = () => {
    // TODO: Export to CSV functionality
    toast.info('Export funksiyası tezliklə əlavə olunacaq');
  };

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

      {/* Quick Actions Toolbar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Sürətli əməliyyatlar:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                className="flex items-center space-x-1"
              >
                <CheckSquare className="h-4 w-4" />
                <span>Hamısını dərsdə işarələ</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                className="flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              <Users className="inline h-4 w-4 mr-1" />
              <span className="font-medium">{classes.length}</span> sinif
            </div>
          </div>
        </CardContent>
      </Card>

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
          {isDesktop ? (
            <BulkAttendanceTableView
              session="morning"
              classes={classes}
              attendanceData={attendanceData}
              updateAttendance={updateAttendance}
              errors={errors}
              getAttendanceRate={getAttendanceRate}
            />
          ) : (
            <BulkAttendanceMobileView
              session="morning"
              classes={classes}
              attendanceData={attendanceData}
              updateAttendance={updateAttendance}
              errors={errors}
              getAttendanceRate={getAttendanceRate}
            />
          )}
        </TabsContent>

        <TabsContent value="evening" className="space-y-4">
          {isDesktop ? (
            <BulkAttendanceTableView
              session="evening"
              classes={classes}
              attendanceData={attendanceData}
              updateAttendance={updateAttendance}
              errors={errors}
              getAttendanceRate={getAttendanceRate}
            />
          ) : (
            <BulkAttendanceMobileView
              session="evening"
              classes={classes}
              attendanceData={attendanceData}
              updateAttendance={updateAttendance}
              errors={errors}
              getAttendanceRate={getAttendanceRate}
            />
          )}
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

// Mobile Card View Component (for tablets and phones)
const BulkAttendanceMobileView: React.FC<{
  session: 'morning' | 'evening';
  classes: ClassWithAttendance[];
  attendanceData: AttendanceFormData;
  updateAttendance: (gradeId: number, field: keyof AttendanceFormData[string], value: number | string) => void;
  errors: { [key: string]: string };
  getAttendanceRate: (present: number, total: number) => number;
}> = ({ session, classes, attendanceData, updateAttendance, errors, getAttendanceRate }) => {
  return (
    <div className="space-y-3">
      {classes.map((cls) => {
        const data = attendanceData[cls.id];
        if (!data) return null;

        const sessionTotal = data[`${session}_present`] + data[`${session}_excused`] + data[`${session}_unexcused`];
        const attendanceRate = getAttendanceRate(data[`${session}_present`], cls.total_students);
        const hasError = errors[`${cls.id}_${session}`];
        const isRecorded = cls.attendance?.[`${session}_recorded_at`];
        const hasStudentCount = cls.total_students > 0;
        const isMismatch = hasStudentCount && sessionTotal !== cls.total_students;

        return (
          <Card
            key={cls.id}
            className={`${hasError ? 'border-red-300' : isMismatch ? 'border-orange-300' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {cls.level || '-'}
                  </Badge>
                  <CardTitle className="text-base">{cls.name}</CardTitle>
                  {isRecorded && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <Badge
                  variant={attendanceRate >= 95 ? 'default' : attendanceRate >= 85 ? 'secondary' : 'destructive'}
                  className="text-sm"
                >
                  {attendanceRate}%
                </Badge>
              </div>
              {cls.homeroom_teacher && (
                <p className="text-xs text-gray-500">{cls.homeroom_teacher.name}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {!hasStudentCount && (
                <Alert variant="default" className="border-yellow-300 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-800">
                    Şagird sayı qeyd edilməyib
                  </AlertDescription>
                </Alert>
              )}
              {isMismatch && !hasError && (
                <Alert variant="default" className="border-orange-300 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-xs text-orange-800">
                    Cəmi {sessionTotal}, lakin sinif sayı {cls.total_students}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor={`mobile_${session}_present_${cls.id}`} className="text-xs text-green-700">
                    🟢 Dərsdə
                  </Label>
                  <Input
                    id={`mobile_${session}_present_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data[`${session}_present`]}
                    onChange={(e) => updateAttendance(cls.id, `${session}_present`, parseInt(e.target.value) || 0)}
                    className="h-10 text-center"
                    disabled={!hasStudentCount}
                  />
                </div>
                <div>
                  <Label htmlFor={`mobile_${session}_excused_${cls.id}`} className="text-xs text-yellow-700">
                    🟡 Üzürlü
                  </Label>
                  <Input
                    id={`mobile_${session}_excused_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data[`${session}_excused`]}
                    onChange={(e) => updateAttendance(cls.id, `${session}_excused`, parseInt(e.target.value) || 0)}
                    className="h-10 text-center"
                    disabled={!hasStudentCount}
                  />
                </div>
                <div>
                  <Label htmlFor={`mobile_${session}_unexcused_${cls.id}`} className="text-xs text-red-700">
                    🔴 Üzürsüz
                  </Label>
                  <Input
                    id={`mobile_${session}_unexcused_${cls.id}`}
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data[`${session}_unexcused`]}
                    onChange={(e) => updateAttendance(cls.id, `${session}_unexcused`, parseInt(e.target.value) || 0)}
                    className="h-10 text-center"
                    disabled={!hasStudentCount}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-600 text-center">
                Ümumi: {cls.total_students} | Qeyd edilmiş: {sessionTotal}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Compact Table View Component (for desktop)
const BulkAttendanceTableView: React.FC<{
  session: 'morning' | 'evening';
  classes: ClassWithAttendance[];
  attendanceData: AttendanceFormData;
  updateAttendance: (gradeId: number, field: keyof AttendanceFormData[string], value: number | string) => void;
  errors: { [key: string]: string };
  getAttendanceRate: (present: number, total: number) => number;
}> = ({ session, classes, attendanceData, updateAttendance, errors, getAttendanceRate }) => {
  const [notePopoverOpen, setNotePopoverOpen] = useState<number | null>(null);

  // Calculate summary statistics
  const summary = classes.reduce(
    (acc, cls) => {
      const data = attendanceData[cls.id];
      if (!data || cls.total_students === 0) return acc;

      acc.totalStudents += cls.total_students;
      acc.totalPresent += data[`${session}_present`] || 0;
      acc.totalExcused += data[`${session}_excused`] || 0;
      acc.totalUnexcused += data[`${session}_unexcused`] || 0;
      acc.classesCompleted += (data[`${session}_present`] + data[`${session}_excused`] + data[`${session}_unexcused`] === cls.total_students) ? 1 : 0;

      return acc;
    },
    { totalStudents: 0, totalPresent: 0, totalExcused: 0, totalUnexcused: 0, classesCompleted: 0 }
  );

  const overallRate = summary.totalStudents > 0
    ? Math.round((summary.totalPresent / summary.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-20 text-center">Səviyyə</TableHead>
              <TableHead className="min-w-[100px]">Sinif</TableHead>
              <TableHead className="w-16 text-center">Say</TableHead>
              <TableHead className="w-24 text-center">🟢 Dərsdə</TableHead>
              <TableHead className="w-24 text-center">🟡 Üzürlü</TableHead>
              <TableHead className="w-24 text-center">🔴 Üzürsüz</TableHead>
              <TableHead className="w-28 text-center">Davamiyyət</TableHead>
              <TableHead className="w-20 text-center">Qeyd</TableHead>
              <TableHead className="w-16 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {classes.map((cls, index) => {
            const data = attendanceData[cls.id];
            if (!data) return null;

            const sessionTotal = data[`${session}_present`] + data[`${session}_excused`] + data[`${session}_unexcused`];
            const attendanceRate = getAttendanceRate(data[`${session}_present`], cls.total_students);
            const hasError = errors[`${cls.id}_${session}`];
            const isRecorded = cls.attendance?.[`${session}_recorded_at`];
            const hasStudentCount = cls.total_students > 0;
            const isMismatch = hasStudentCount && sessionTotal !== cls.total_students;

            // Status indicator
            const statusColor = !hasStudentCount
              ? 'text-yellow-500'
              : hasError
                ? 'text-red-500'
                : isMismatch
                  ? 'text-orange-500'
                  : isRecorded
                    ? 'text-green-500'
                    : 'text-gray-400';

            const statusIcon = !hasStudentCount
              ? <AlertCircle className="h-4 w-4" />
              : hasError
                ? <AlertCircle className="h-4 w-4" />
                : isRecorded
                  ? <CheckCircle className="h-4 w-4" />
                  : <AlertCircle className="h-4 w-4" />;

            return (
              <TableRow
                key={cls.id}
                className={`${hasError ? 'bg-red-50' : isMismatch ? 'bg-orange-50' : ''} hover:bg-gray-50`}
              >
                {/* Row Number */}
                <TableCell className="text-center font-medium text-gray-500">
                  {index + 1}
                </TableCell>

                {/* Grade Level */}
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-semibold">
                    {cls.level || '-'}
                  </Badge>
                </TableCell>

                {/* Class Name */}
                <TableCell>
                  <div className="font-medium">{cls.name}</div>
                  {cls.homeroom_teacher && (
                    <div className="text-xs text-gray-500">{cls.homeroom_teacher.name}</div>
                  )}
                </TableCell>

                {/* Student Count */}
                <TableCell className="text-center font-medium">
                  {cls.total_students}
                </TableCell>

                {/* Present */}
                <TableCell className="text-center">
                  <Input
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data[`${session}_present`]}
                    onChange={(e) => updateAttendance(cls.id, `${session}_present`, parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-center"
                    disabled={!hasStudentCount}
                  />
                </TableCell>

                {/* Excused */}
                <TableCell className="text-center">
                  <Input
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data[`${session}_excused`]}
                    onChange={(e) => updateAttendance(cls.id, `${session}_excused`, parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-center"
                    disabled={!hasStudentCount}
                  />
                </TableCell>

                {/* Unexcused */}
                <TableCell className="text-center">
                  <Input
                    type="number"
                    min="0"
                    max={cls.total_students}
                    value={data[`${session}_unexcused`]}
                    onChange={(e) => updateAttendance(cls.id, `${session}_unexcused`, parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-center"
                    disabled={!hasStudentCount}
                  />
                </TableCell>

                {/* Attendance Rate */}
                <TableCell className="text-center">
                  <Badge
                    variant={attendanceRate >= 95 ? 'default' : attendanceRate >= 85 ? 'secondary' : 'destructive'}
                    className="font-medium"
                  >
                    {attendanceRate}%
                  </Badge>
                </TableCell>

                {/* Notes */}
                <TableCell className="text-center">
                  <Popover
                    open={notePopoverOpen === cls.id}
                    onOpenChange={(open) => setNotePopoverOpen(open ? cls.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant={data[`${session}_notes`] ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <StickyNote className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Qeydlər - {cls.name}</h4>
                        <Textarea
                          value={data[`${session}_notes`]}
                          onChange={(e) => updateAttendance(cls.id, `${session}_notes`, e.target.value)}
                          placeholder={`${session === 'morning' ? 'Səhər' : 'Axşam'} sessiyası üçün qeydlər...`}
                          rows={3}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>

                {/* Status */}
                <TableCell className={`text-center ${statusColor}`}>
                  {statusIcon}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>

      {/* Summary Footer */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{summary.totalStudents}</div>
              <div className="text-sm text-gray-600">Ümumi Şagird</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.totalPresent}</div>
              <div className="text-sm text-gray-600">Dərsdə</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.totalExcused}</div>
              <div className="text-sm text-gray-600">Üzürlü</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.totalUnexcused}</div>
              <div className="text-sm text-gray-600">Üzürsüz</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{overallRate}%</div>
              <div className="text-sm text-gray-600">
                Ümumi Davamiyyət <span className="text-xs">({summary.classesCompleted}/{classes.length} tamamlandı)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkAttendanceEntry;