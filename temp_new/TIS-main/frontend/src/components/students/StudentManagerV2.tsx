import React from 'react';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
// useEntityManagerV2 handled by GenericManagerV2 internally
import { Student } from '@/services/students';
import { StudentFilters } from './configurations/studentConfig';
import { unifiedStudentConfig, studentCustomLogic } from './configurations/studentConfig';
import { StudentModalModern } from '@/components/modals/student/StudentModalModern';
import { StudentDetailsDialog } from './StudentDetailsDialog';
import { StudentImportExportModal } from '@/components/modals/StudentImportExportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

  // Role-based access and filtering
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const institutionId = currentUser?.institution_id;

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
      if (action.key === 'activate') {
        return {
          ...action,
          isVisible: (student: Student) => student.is_active === false,
          onClick: async (student: Student) => {
            if (!confirm(`${student.first_name} ${student.last_name} yenidən aktiv edilsin?`)) return;
            try {
              await studentService.update(student.id, { is_active: true, status: 'active' } as any);
              toast.success(`${student.first_name} ${student.last_name} aktiv edildi`);
              queryClient.invalidateQueries({ queryKey: ['students'] });
            } catch (e) {
              toast.error('Aktivləşdirmə uğursuz oldu');
            }
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

  }), []);

  // Handle close modals
  const handleCloseModals = React.useCallback(() => {
    setSelectedStudent(null);
    setEditingStudent(null);
    setImportExportModalOpen(false);
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
        onClose={handleCloseModals}
        onEdit={(student) => {
          setEditingStudent(student);
          setSelectedStudent(null);
        }}
        {...utilityFunctions}
      />


      <StudentImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
      />
    </div>
  );
};

export default StudentManagerV2;