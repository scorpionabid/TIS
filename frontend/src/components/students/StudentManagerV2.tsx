import React from 'react';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
// useEntityManagerV2 handled by GenericManagerV2 internally
import { Student } from '@/services/students';
import { StudentFilters } from './configurations/studentConfig';
import { unifiedStudentConfig, studentCustomLogic } from './configurations/studentConfig';
import { StudentModalModern } from '@/components/modals/student/StudentModalModern';
import { StudentDetailsDialog } from './StudentDetailsDialog';
import { EnrollmentModal } from './EnrollmentModal';
// StudentImportExportModal handled by GenericManagerV2
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { gradeService } from '@/services/grades';
import { studentService } from '@/services/students';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
// Icons now handled by GenericManagerV2

interface StudentManagerV2Props {
  className?: string;
}

/**
 * Modern Student Manager using GenericManagerV2
 * 
 * This component represents the optimized student management system that:
 * - Uses the unified backend API
 * - Implements modern React patterns with hooks
 * - Provides role-based filtering and access control
 * - Features enhanced search and filtering capabilities
 * - Maintains consistent error handling and loading states
 * - Follows the same patterns as GradeManager for consistency
 */
export const StudentManagerV2: React.FC<StudentManagerV2Props> = ({ className }) => {
  // Modal states for student-specific operations  
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = React.useState(false);
  const [enrollmentStudent, setEnrollmentStudent] = React.useState<Student | null>(null);
  // Import/Export modal handled by GenericManagerV2
  // EnrollmentModal expects string ('all' | '1' | '2' | ...)
  const [selectedGradeForEnrollment, setSelectedGradeForEnrollment] = React.useState<string>('all');

  // Role-based access and filtering
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch supporting data for filters
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'for-student-filter'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const institutionId = currentUser?.institution_id;
  const { data: gradesResponse } = useQuery({
    queryKey: ['grades', 'for-enrollment', institutionId],
    queryFn: () => gradeService.get({ institution_id: institutionId, per_page: 200, is_active: true }),
    enabled: !!institutionId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Process available institutions based on user role
  const availableInstitutions = React.useMemo(() => {
    if (!institutionsResponse?.data || !currentUser) return [];
    
    logger.debug('Processing institutions for student filtering', {
      component: 'StudentManagerV2',
      action: 'filterInstitutions',
      data: { userRole: currentUser.role, institutionCount: institutionsResponse.data.length }
    });
    
    const institutions = institutionsResponse.data;
    
    // Role-based institution filtering logic (same as grades)
    switch (currentUser.role) {
      case 'superadmin':
        return institutions.filter((inst: any) => inst.level && inst.level >= 3);
        
      case 'regionadmin':
        return institutions.filter((inst: any) => 
          inst.id === currentUser.institution_id || (inst.level && inst.level >= 3)
        );
        
      case 'sektoradmin':
        return institutions.filter((inst: any) => 
          inst.id === currentUser.institution_id || inst.level === 4
        );
        
      default:
        return institutions.filter((inst: any) => inst.id === currentUser.institution_id);
    }
  }, [institutionsResponse, currentUser]);

  // Process available grades — gradeService.get() returns { items: Grade[] } normalized shape
  const availableGrades = React.useMemo(() => {
    if (!gradesResponse) return [];
    const raw: any = gradesResponse;
    // Normalized shape from useEntityManagerV2: { items: Grade[] }
    if (Array.isArray(raw.items)) return raw.items;
    // Backend wrapped: { data: { grades: [] } }
    if (raw.data?.grades && Array.isArray(raw.data.grades)) return raw.data.grades;
    if (raw.data?.data && Array.isArray(raw.data.data)) return raw.data.data;
    if (raw.data && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [gradesResponse]);

  // Student-specific logic
  const handleStudentCreate = async (data: any) => {
    try {
      await studentService.create(data);
      toast.success('Şagird uğurla yaradıldı');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      // Force immediate refetch to ensure new entity appears in list
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['students'] });
      }, 100);
    } catch (error) {
      toast.error('Şagird yaradıla bilmədi');
      throw error;
    }
  };

  // Simplified configuration - GenericManagerV2 handles most actions automatically
  const enhancedConfig = React.useMemo(() => ({
    ...unifiedStudentConfig,
    
    // Override ALL actions with real handlers
    actions: unifiedStudentConfig.actions.map(action => {
      if (action.key === 'view') {
        return {
          ...action,
          onClick: (student: Student) => {
            logger.debug('Opening student details', { data: { studentId: student.id } });
            setSelectedStudent(student);
          }
        };
      }
      if (action.key === 'edit') {
        return {
          ...action,
          onClick: (student: Student) => {
            logger.debug('Opening student edit', { data: { studentId: student.id } });
            setEditingStudent(student);
          }
        };
      }
      if (action.key === 'enroll') {
        return {
          ...action,
          // Show enroll for ALL students (remove the status check in config)
          isVisible: () => true,
          onClick: (student: Student) => {
            logger.debug('Opening enrollment modal', { data: { studentId: student.id } });
            setEnrollmentStudent(student);
            setEnrollmentModalOpen(true);
          }
        };
      }
      if (action.key === 'soft-delete') {
        return {
          ...action,
          isVisible: (student: Student) => student.is_active !== false,
          onClick: async (student: Student) => {
            if (!confirm(`${student.first_name} ${student.last_name} deaktiv edilsin?`)) return;
            try {
              await studentService.update(student.id, { is_active: false, status: 'inactive' } as any);
              toast.success(`${student.first_name} ${student.last_name} deaktiv edildi`);
              queryClient.invalidateQueries({ queryKey: ['students'] });
            } catch (e) {
              toast.error('Deaktiv etmə uğursuz oldu');
            }
          }
        };
      }
      if (action.key === 'hard-delete') {
        return {
          ...action,
          onClick: async (student: Student) => {
            if (!confirm(`${student.first_name} ${student.last_name} silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`)) return;
            try {
              await studentService.delete(student.id);
              toast.success(`${student.first_name} ${student.last_name} silindi`);
              queryClient.invalidateQueries({ queryKey: ['students'] });
            } catch (e) {
              toast.error('Silmə uğursuz oldu');
            }
          }
        };
      }
      return action;
    })
  }), [queryClient]);

  // Modal control state for GenericManager integration
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = React.useState(false);

  // Custom logic with renderCustomModal to connect GenericManagerV2 with StudentModal
  const customLogic = React.useMemo(() => ({
    ...studentCustomLogic,
    
    // Explicitly handle create click to manage our own state
    onCreateClick: () => {
      console.log('🚀 StudentManagerV2 - onCreateClick triggered');
      setEditingStudent(null);
      setCreateModalOpen(true);
    },
    
    // Import/Export/Template handlers for modern header
    onImportClick: () => {
      logger.debug('Opening student import modal', {
        component: 'StudentManagerV2',
        action: 'openImportModal'
      });
      setImportExportModalOpen(true);
    },
    onExportClick: () => {
      logger.debug('Opening student export modal', {
        component: 'StudentManagerV2',
        action: 'openExportModal'
      });
      setImportExportModalOpen(true);
    },
    onTemplateClick: () => {
      logger.debug('Downloading student template', {
        component: 'StudentManagerV2',
        action: 'downloadTemplate'
      });
      // Template download will be handled by StudentImportExportModal
      setImportExportModalOpen(true);
    },

    // Custom filters showing counts
    renderCustomFilters: () => (
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="text-sm text-muted-foreground">
          {availableInstitutions.length} müəssisə, {availableGrades.length} sinif mövcuddur
        </div>
      </div>
    )
  }), [availableInstitutions, availableGrades]);

  // Handle close modals
  const handleCloseModals = React.useCallback(() => {
    setSelectedStudent(null);
    setEditingStudent(null);
    setEnrollmentModalOpen(false);
    setEnrollmentStudent(null);
    // Import/Export modal closed by GenericManagerV2
    setSelectedGradeForEnrollment('all');
  }, []);

  // Save handler for edit — must invalidate students cache so the list refreshes
  const handleUserSave = React.useCallback(async (studentData: any) => {
    try {
      if (editingStudent) {
        await studentService.update(editingStudent.id, studentData);
        toast.success(`${editingStudent.first_name} ${editingStudent.last_name} uğurla yeniləndi`);
      }
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditingStudent(null);
    } catch (error) {
      logger.error('Failed to save student', error);
      toast.error('Şagird yadda saxlanıla bilmədi');
      throw error;
    }
  }, [editingStudent, queryClient]);

  // Simplified enrollment handler
  const handleEnrollment = React.useCallback(async (classId: number) => {
    try {
      logger.debug('Processing student enrollment', {
        data: {
          studentId: enrollmentStudent?.id,
          classId
        }
      });
      
      if (enrollmentStudent) {
        await studentService.update(enrollmentStudent.id, {
          status: 'active',
          class_id: classId
        } as any);
        toast.success(`${enrollmentStudent.first_name} ${enrollmentStudent.last_name} uğurla qeydiyyatdan keçirildi`);
        
        // Explicitly invalidate cache so the list refreshes immediately
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['grades'] });
        
        // Force refetch to ensure UI updates
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['students'] });
        }, 100);
      }
      
      handleCloseModals();
      
    } catch (error) {
      logger.error('Failed to enroll student', error);
      toast.error('Qeydiyyat əməliyyatı uğursuz oldu');
      throw error;
    }
  }, [enrollmentStudent, handleCloseModals]);

  // Utility functions for student-specific dialogs
  const utilityFunctions = React.useMemo(() => ({
    getStatusText: (status: string) => {
      const statusMap: Record<string, string> = {
        'active': 'Aktiv',
        'inactive': 'Passiv',
        'transferred': 'Köçürülmüş',
        'graduated': 'Məzun',
        'dropped': 'Tərk etmiş',
        'expelled': 'İxrac'
      };
      return statusMap[status] || status;
    },
    
    getStatusColor: (status: string) => {
      const colorMap: Record<string, string> = {
        'active': 'bg-green-100 text-green-800',
        'inactive': 'bg-red-100 text-red-800',
        'transferred': 'bg-blue-100 text-blue-800',
        'graduated': 'bg-purple-100 text-purple-800',
        'dropped': 'bg-yellow-100 text-yellow-800',
        'expelled': 'bg-red-100 text-red-800'
      };
      return colorMap[status] || 'bg-gray-100 text-gray-800';
    },
    
    getGenderText: (gender: string) => {
      const genderMap: Record<string, string> = {
        'male': 'Kişi',
        'female': 'Qadın',
        'other': 'Digər'
      };
      return genderMap[gender] || gender;
    },
    
    getGradeLevelText: (level: string | number) => `${level}-ci sinif`,
  }), []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Generic Manager with integrated modal */}
      <GenericManagerV2
        config={enhancedConfig}
        customLogic={customLogic}
      />
      
      {/* Student Create Modal */}
      <StudentModalModern
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleStudentCreate}
        student={null}
      />
      
      {/* Edit Student Modal — opened via edit action in table */}
      <StudentModalModern
        open={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSave={handleUserSave}
        student={editingStudent}
      />
      
      {/* Student-specific Modals - separate from GenericManagerV2 create modal */}

      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={!!selectedStudent && !enrollmentModalOpen}
        onClose={handleCloseModals}
        onEdit={(student) => {
          setEditingStudent(student);
          setSelectedStudent(null);
        }}
        onEnroll={(student) => {
          setEnrollmentStudent(student);
          setEnrollmentModalOpen(true);
          setSelectedStudent(null);
        }}
        {...utilityFunctions}
      />

      <EnrollmentModal
        isOpen={enrollmentModalOpen}
        onClose={handleCloseModals}
        student={enrollmentStudent}
        classes={availableGrades} // Using grades as classes
        selectedGradeForEnrollment={selectedGradeForEnrollment}
        setSelectedGradeForEnrollment={setSelectedGradeForEnrollment}
        onEnroll={handleEnrollment}
        isEnrolling={false}
        getGradeLevelText={utilityFunctions.getGradeLevelText}
      />

      {/* Import/Export modal handled by GenericManagerV2 */}
    </div>
  );
};

export default StudentManagerV2;