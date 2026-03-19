import React from 'react';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
import { SchoolStudent } from '@/services/schoolAdmin';
import { StudentFilters } from './configurations/studentConfig';
import { studentEntityConfig, studentCustomLogic } from './configurations/studentConfig';
import { StudentModalModern } from '@/components/modals/student/StudentModalModern';
import { StudentDetailsDialog } from './StudentDetailsDialog';
import { EnrollmentModal } from './EnrollmentModal';
import { ImportModal } from '@/components/import/ImportModal';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gradeService, Grade } from '@/services/grades';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/services/students';
import { toast } from 'sonner';

interface SchoolStudentManagerStandardizedProps {
  className?: string;
}

export const SchoolStudentManagerStandardized: React.FC<SchoolStudentManagerStandardizedProps> = ({ 
  className 
}) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // Local modal state for student-specific features
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<SchoolStudent | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<SchoolStudent | null>(null);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [selectedGradeForEnrollment, setSelectedGradeForEnrollment] = React.useState<string>('all');
  const [isEnrolling, setIsEnrolling] = React.useState(false);

  // Fetch grades for the current institution so the enrollment modal shows real classes
  const institutionId = currentUser?.institution_id;
  const { data: gradesResponse } = useQuery({
    queryKey: ['grades', 'for-enrollment', institutionId],
    queryFn: () => gradeService.get({ institution_id: institutionId, per_page: 200, is_active: true }),
    enabled: !!institutionId,
    staleTime: 1000 * 60 * 5,
  });

  const availableGrades: Grade[] = React.useMemo(() => {
    if (!gradesResponse) return [];
    const raw: any = gradesResponse;
    // Handle various response shapes from gradeService.get()
    if (Array.isArray(raw.items)) return raw.items;
    if (raw.data && Array.isArray(raw.data.grades)) return raw.data.grades;
    if (raw.data && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [gradesResponse]);

  // Enhanced configuration with student-specific modal handlers
  const enhancedConfig = React.useMemo(() => ({
    ...studentEntityConfig,
    actions: studentEntityConfig.actions.map(action => ({
      ...action,
      onClick: (student: SchoolStudent) => {
        logger.debug(`Student action triggered: ${action.key}`, {
          component: 'SchoolStudentManagerStandardized',
          action: `handle${action.key}`,
          data: { studentId: student.id }
        });
        
        switch (action.key) {
          case 'view':
            setSelectedStudent(student);
            break;
          case 'edit':
            setEditingUser(student);
            setUserModalOpen(true);
            break;
          case 'enroll':
            setSelectedStudent(student);
            setEnrollmentModalOpen(true);
            break;
          case 'delete':
            logger.info(`Delete action for student ${student.id}`);
            break;
          default:
            logger.warn(`Unhandled student action: ${action.key}`);
        }
      },
    })),
  }), []);

  // Enhanced custom logic
  const enhancedCustomLogic = React.useMemo(() => ({
    ...studentCustomLogic,
    headerActions: [
      {
        key: 'import',
        label: 'İdxal Et',
        icon: Upload,
        onClick: () => setImportModalOpen(true),
        variant: 'outline' as const,
      },
    ],
    onCreateClick: () => {
      setEditingUser(null);
      setUserModalOpen(true);
    },
    bulkActions: [
      ...studentCustomLogic.bulkActions,
    ],
  }), []);

  // Save handler with cache invalidation so the list refreshes after create/edit
  const handleUserSave = async (userData: any) => {
    try {
      if (editingUser) {
        await studentService.update(editingUser.id, userData);
        logger.info(`Successfully updated student ${editingUser.id}`);
        toast.success('Şagird uğurla yeniləndi');
      } else {
        await studentService.create(userData);
        logger.info('Successfully created new student');
        toast.success('Şagird uğurla yaradıldı');
      }

      // Invalidate query cache so GenericManagerV2 re-fetches the list
      queryClient.invalidateQueries({ queryKey: ['students'] });

      setUserModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      logger.error('Failed to save student', error, {
        component: 'SchoolStudentManagerStandardized',
        action: 'handleUserSave'
      });
      throw error;
    }
  };

  // Enrollment handler
  const handleEnrollment = async (classId: number) => {
    if (!selectedStudent) return;
    try {
      setIsEnrolling(true);
      await studentService.update(selectedStudent.id, {
        class_id: classId,
        status: 'active',
      } as any);
      toast.success(`${selectedStudent.first_name} ${selectedStudent.last_name} sinfə uğurla yazıldı`);

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['grades'] });

      setEnrollmentModalOpen(false);
      setSelectedStudent(null);
      setSelectedGradeForEnrollment('all');
    } catch (error) {
      logger.error('Failed to enroll student', error);
      toast.error('Qeydiyyat əməliyyatı uğursuz oldu');
      throw error;
    } finally {
      setIsEnrolling(false);
    }
  };

  // Utility functions
  const utilityFunctions = React.useMemo(() => ({
    getStatusText: (status: string) => {
      const map: Record<string, string> = {
        active: 'Aktiv', inactive: 'Passiv', transferred: 'Köçürülmüş', graduated: 'Məzun'
      };
      return map[status] || status;
    },
    getStatusColor: (status: string) => {
      const map: Record<string, string> = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-red-100 text-red-800',
        transferred: 'bg-blue-100 text-blue-800',
        graduated: 'bg-purple-100 text-purple-800',
      };
      return map[status] || 'bg-gray-100 text-gray-800';
    },
    getGenderText: (gender: string) => {
      const map: Record<string, string> = { male: 'Kişi', female: 'Qadın', other: 'Digər' };
      return map[gender] || gender;
    },
    getGradeLevelText: (level?: number) => {
      if (level === undefined || level === null) return 'Naməlum';
      if (level === 0) return 'Anasinifi';
      return `${level}-ci sinif`;
    },
  }), []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Generic Manager */}
      <GenericManagerV2
        config={enhancedConfig}
        customLogic={enhancedCustomLogic}
      />
      
      {/* Student Modal - Modern */}
      <StudentModalModern
        open={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        student={editingUser}
        onSave={async (studentData) => {
          if (editingUser) {
            // Update existing student
            await studentService.update(editingUser.id, studentData);
          } else {
            // Create new student
            await studentService.create(studentData);
          }
          queryClient.invalidateQueries({ queryKey: ['students'] });
          setUserModalOpen(false);
          setEditingUser(null);
        }}
      />

      {/* Student details dialog */}
      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={!!selectedStudent && !enrollmentModalOpen}
        onClose={() => setSelectedStudent(null)}
        onEdit={(student) => {
          setEditingUser(student);
          setUserModalOpen(true);
          setSelectedStudent(null);
        }}
        onEnroll={(student) => {
          setSelectedStudent(student);
          setEnrollmentModalOpen(true);
        }}
      />

      {/* Enrollment modal — now receives real grades */}
      <EnrollmentModal
        isOpen={enrollmentModalOpen}
        onClose={() => {
          setEnrollmentModalOpen(false);
          setSelectedStudent(null);
          setSelectedGradeForEnrollment('all');
        }}
        student={selectedStudent}
        classes={availableGrades}
        selectedGradeForEnrollment={selectedGradeForEnrollment}
        setSelectedGradeForEnrollment={setSelectedGradeForEnrollment}
        onEnroll={handleEnrollment}
        isEnrolling={isEnrolling}
        getGradeLevelText={utilityFunctions.getGradeLevelText}
      />

      {/* Import modal */}
      <ImportModal
        open={importModalOpen}
        onOpenChange={(open) => {
          setImportModalOpen(open);
          if (!open) queryClient.invalidateQueries({ queryKey: ['students'] });
        }}
        type="students"
        onImportComplete={() => {
          setImportModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['students'] });
        }}
      />
    </div>
  );
};

export default SchoolStudentManagerStandardized;
