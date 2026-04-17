import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Grade, gradeService, GradeStudent } from '@/services/grades';
import { 
  Users, 
  Search, 
  Plus, 
  UserMinus, 
  ArrowRightLeft,
  Mail,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { GradeStudentEnrollmentModal } from './GradeStudentEnrollmentModal';

interface GradeStudentsDialogProps {
  grade: Grade;
  open: boolean;
  onClose: () => void;
}

export const GradeStudentsDialog: React.FC<GradeStudentsDialogProps> = ({
  grade,
  open,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  
  // Enrollment modal state
  const [enrollmentModalOpen, setEnrollmentModalOpen] = React.useState(false);

  // Fetch students for this grade
  const { data: studentsResponse, isLoading: studentsLoading } = useQuery({
    queryKey: ['grade-students', grade.id, searchQuery, statusFilter],
    queryFn: () => gradeService.getGradeStudents(grade.id, {
      search: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      per_page: 50
    }),
    enabled: open,
  });

  const rawStudents = studentsResponse?.data?.students;
  const students = React.useMemo(() => {
    if (Array.isArray(rawStudents)) {
      return rawStudents;
    }
    return [];
  }, [rawStudents]);

  // Update enrollment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ studentId, status, notes }: { 
      studentId: number; 
      status: string; 
      notes?: string;
    }) => gradeService.updateEnrollmentStatus(grade.id, studentId, {
      enrollment_status: status,
      notes
    }),
    onSuccess: () => {
      toast({
        title: 'Müvəffəqiyyət',
        description: 'Tələbə statusu yeniləndi',
      });
      queryClient.invalidateQueries({ queryKey: ['grade-students', grade.id] });
    },
    onError: (error: any) => {
      logger.error('Failed to update student status', {
        component: 'GradeStudentsDialog',
        error: error.message
      });
      toast({
        title: 'Xəta',
        description: 'Status yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: (studentId: number) => gradeService.unenrollStudent(grade.id, studentId),
    onSuccess: () => {
      toast({
        title: 'Müvəffəqiyyət',
        description: 'Tələbə sinifdən çıxarıldı',
      });
      queryClient.invalidateQueries({ queryKey: ['grade-students', grade.id] });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    },
    onError: (error: any) => {
      logger.error('Failed to remove student', {
        component: 'GradeStudentsDialog',
        error: error.message
      });
      toast({
        title: 'Xəta',
        description: 'Tələbə çıxarılarkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default' as const;
      case 'inactive': return 'secondary' as const;
      case 'transferred': return 'outline' as const;
      case 'graduated': return 'default' as const;
      default: return 'secondary' as const;
    }
  };

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'inactive': return 'Deaktiv';
      case 'transferred': return 'Köçürülüb';
      case 'graduated': return 'Məzun';
      default: return status;
    }
  };

  // Filter students based on search and status
  const filteredStudents = React.useMemo(() => {
    let filtered = students;

    if (searchQuery) {
      filtered = filtered.filter(student => 
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => student.enrollment_status === statusFilter);
    }

    return filtered;
  }, [students, searchQuery, statusFilter]);

  // Count by status
  const statusCounts = React.useMemo(() => {
    const counts = {
      active: 0,
      inactive: 0,
      transferred: 0,
      graduated: 0,
    };

    students.forEach(student => {
      if (Object.prototype.hasOwnProperty.call(counts, student.enrollment_status)) {
        counts[student.enrollment_status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [students]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {grade.display_name || grade.full_name} - Tələbələr
            <Badge variant="outline" className="ml-2">
              {students.length} tələbə
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
                  <p className="text-xs text-muted-foreground">Aktiv</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-600">{statusCounts.inactive}</p>
                  <p className="text-xs text-muted-foreground">Deaktiv</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{statusCounts.transferred}</p>
                  <p className="text-xs text-muted-foreground">Köçürülüb</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{statusCounts.graduated}</p>
                  <p className="text-xs text-muted-foreground">Məzun</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tələbə adına və ya email-ə görə axtar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status filteri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Deaktiv</SelectItem>
              <SelectItem value="transferred">Köçürülüb</SelectItem>
              <SelectItem value="graduated">Məzun</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            className="flex items-center gap-2"
            onClick={() => setEnrollmentModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Tələbə Əlavə Et
          </Button>
        </div>

        {/* Students Table */}
        {studentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Tələbələr yüklənir...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {searchQuery || statusFilter !== 'all' 
                ? 'Axtarış kriteriyasına uyğun tələbə tapılmadı.'
                : 'Bu sinifdə hələ tələbə yazılmayıb.'
              }
            </AlertDescription>
          </Alert>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Tələbə</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Yazılış Tarixi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Əməliyyatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{student.full_name}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {student.email}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {student.enrollment_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(student.enrollment_date).toLocaleDateString('az-AZ')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(student.enrollment_status)}>
                        {getStatusText(student.enrollment_status)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={student.enrollment_status}
                          onValueChange={(newStatus) => 
                            updateStatusMutation.mutate({
                              studentId: student.id,
                              status: newStatus
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Aktiv</SelectItem>
                            <SelectItem value="inactive">Deaktiv</SelectItem>
                            <SelectItem value="transferred">Köçürülüb</SelectItem>
                            <SelectItem value="graduated">Məzun</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeStudentMutation.mutate(student.id)}
                          disabled={removeStudentMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Capacity Warning */}
        {grade.room && grade.student_count >= grade.room.capacity && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Diqqət:</strong> Bu sinifin tutumu dolub. 
              Maksimum {grade.room.capacity} tələbə yerləşdirilə bilər.
            </AlertDescription>
          </Alert>
        )}

        {/* Footer */}
        <Separator />
        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-muted-foreground">
            Cəmi {filteredStudents.length} tələbə göstərilir
          </div>
          <Button variant="outline" onClick={onClose}>
            Bağla
          </Button>
        </div>
      </DialogContent>

      {/* Student Enrollment Modal */}
      <GradeStudentEnrollmentModal
        open={enrollmentModalOpen}
        onClose={() => setEnrollmentModalOpen(false)}
        grade={grade}
        onSuccess={() => {
          // Refresh students data when enrollment succeeds
          queryClient.invalidateQueries({ queryKey: ['grade-students', grade.id] });
          toast({
            title: "Uğur",
            description: "Tələbələr sinifə uğurla əlavə edildi",
          });
        }}
      />
    </Dialog>
  );
};
