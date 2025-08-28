import React from 'react';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
import { SchoolTeacher } from '@/services/schoolAdmin';
import { TeacherFilters, NewTeacherData } from './hooks/useSchoolTeacherManagerGeneric';
import { teacherEntityConfig, teacherCustomLogic } from './configurations/teacherConfig';
import { UserModal } from '@/components/modals/UserModal';
import { TeacherDetailsDialog } from './TeacherDetailsDialog';
import { TeacherImportExportModal } from '@/components/modals/TeacherImportExportModal';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useEntityManagerV2 } from '@/hooks/useEntityManagerV2';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { GenericFilters } from '@/components/generic/GenericFilters';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';

interface SchoolTeacherManagerV2Props {
  className?: string;
}

export const SchoolTeacherManagerV2: React.FC<SchoolTeacherManagerV2Props> = ({ className }) => {
  // Local state for modals
  const [userModalOpen, setUserModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<SchoolTeacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = React.useState<SchoolTeacher | null>(null);
  const [importExportModalOpen, setImportExportModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [teacherToDelete, setTeacherToDelete] = React.useState<SchoolTeacher | null>(null);
  
  // Institution filtering state
  const [institutionFilter, setInstitutionFilter] = React.useState<string>('all');
  
  // Auth context for role-based filtering
  const { currentUser: user } = useAuth();
  
  // Use the V2 manager with enhanced configuration
  const manager = useEntityManagerV2(teacherEntityConfig, {
    ...teacherCustomLogic,
    
    // Override action handlers with modal logic
    renderCustomModal: (props) => (
      <UserModal
        open={props.open}
        onClose={props.onClose}
        onSave={props.onSave}
        user={props.entity}
        isLoading={props.isLoading}
      />
    ),
    
    // Override header actions to handle import/export
    headerActions: [
      {
        key: 'import-export',
        label: 'İdxal/İxrac',
        icon: Upload,
        onClick: () => setImportExportModalOpen(true),
        variant: 'outline',
      },
    ],
  });

  // Fetch institutions for filter (based on user role)
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'for-filter'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
  });

  const availableInstitutions = React.useMemo(() => {
    if (!institutionsResponse?.data?.data) return [];
    
    // Filter institutions based on user role
    let institutions = institutionsResponse.data.data;
    
    if (!user) return [];
    
    // SuperAdmin sees all institutions
    if (user.role === 'superadmin') {
      return institutions.filter((inst: any) => inst.level && inst.level >= 3); // Schools and sectors
    }
    
    // RegionAdmin sees institutions in their region
    if (user.role === 'regionadmin') {
      const userInstitutionId = user.institution_id;
      return institutions.filter((inst: any) => 
        inst.id === userInstitutionId || 
        (inst.level && inst.level >= 3) // Schools under their region
      );
    }
    
    // SectorAdmin sees schools in their sector
    if (user.role === 'sektoradmin') {
      const userInstitutionId = user.institution_id;
      return institutions.filter((inst: any) => 
        inst.id === userInstitutionId ||
        (inst.level === 4) // Only schools
      );
    }
    
    // School staff see only their institution
    if (user.role === 'schooladmin' || user.role === 'müəllim') {
      return institutions.filter((inst: any) => inst.id === user.institution_id);
    }
    
    return [];
  }, [institutionsResponse, user]);

  // Update filters when institution filter changes
  React.useEffect(() => {
    manager.setFilters(prev => ({
      ...prev,
      institution_id: institutionFilter === 'all' ? undefined : parseInt(institutionFilter)
    }));
  }, [institutionFilter, manager.setFilters]);

  // Custom action handlers
  const handleViewTeacher = (teacher: SchoolTeacher) => {
    setSelectedTeacher(teacher);
  };

  const handleEditTeacher = (teacher: SchoolTeacher) => {
    setEditingUser(teacher);
    setUserModalOpen(true);
  };

  const handleDeleteTeacher = (teacher: SchoolTeacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (deleteType: 'soft' | 'hard') => {
    if (!teacherToDelete) return;
    
    try {
      const { schoolAdminService } = await import('@/services/schoolAdmin');
      
      if (deleteType === 'soft') {
        await schoolAdminService.softDeleteTeacher(teacherToDelete.id);
      } else {
        await schoolAdminService.hardDeleteTeacher(teacherToDelete.id);
      }
      
      // Refresh data
      manager.refetch();
      
      // Close modal and reset state
      setDeleteModalOpen(false);
      setTeacherToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Handler for user save
  const handleUserSave = async (userData: any) => {
    try {
      if (editingUser) {
        await manager.handleUpdate(editingUser.id, userData);
      } else {
        await manager.handleCreate(userData);
      }
    } catch (error) {
      throw error; // Re-throw to let modal handle the error
    }
  };

  // Utility functions
  const getDepartmentText = (dept: string) => dept || 'Təyin edilməyib';
  const getPositionText = (pos: string) => pos || 'Müəllim';
  const getPerformanceColor = () => 'bg-green-100 text-green-800';
  const getWorkloadColor = () => 'bg-blue-100 text-blue-800';

  // Update action handlers in configuration
  const enhancedConfig = {
    ...teacherEntityConfig,
    actions: teacherEntityConfig.actions.map(action => ({
      ...action,
      onClick: (teacher: SchoolTeacher) => {
        switch (action.key) {
          case 'view':
            handleViewTeacher(teacher);
            break;
          case 'edit':
            handleEditTeacher(teacher);
            break;
          case 'delete':
            handleDeleteTeacher(teacher);
            break;
          default:
            action.onClick(teacher);
        }
      },
    })),
  };

  const enhancedCustomLogic = {
    ...teacherCustomLogic,
    
    // Custom filter rendering with institution filter
    renderCustomFilters: (managerInstance: any) => (
      <div className="space-y-4">
        <GenericFilters
          searchTerm={managerInstance.searchTerm}
          setSearchTerm={managerInstance.setSearchTerm}
          filters={managerInstance.filters}
          setFilters={managerInstance.setFilters}
          filterFields={teacherEntityConfig.filterFields}
        />
        
        {/* Institution Filter Row */}
        {availableInstitutions.length > 1 && (
          <div className="flex items-center gap-4 px-4">
            <label className="text-sm font-medium whitespace-nowrap">
              Müəssisə:
            </label>
            <select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">Hamısı</option>
              {availableInstitutions.map((institution: any) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    ),
  };

  return (
    <div className={cn("space-y-6", className)}>
      <GenericManagerV2
        config={enhancedConfig}
        customLogic={enhancedCustomLogic}
      />
      
      {/* Modals */}
      <UserModal
        open={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleUserSave}
        user={editingUser}
        isLoading={manager.isCreating || manager.isUpdating}
      />

      <TeacherDetailsDialog
        teacher={selectedTeacher}
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        onEdit={handleEditTeacher}
        getDepartmentText={getDepartmentText}
        getPositionText={getPositionText}
        getPerformanceColor={getPerformanceColor}
        getWorkloadColor={getWorkloadColor}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTeacherToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={teacherToDelete?.first_name && teacherToDelete?.last_name 
          ? `${teacherToDelete.first_name} ${teacherToDelete.last_name}`.trim() 
          : teacherToDelete?.email || 'Müəllim'}
        itemType="Müəllim"
        isLoading={manager.isUpdating}
      />

      <TeacherImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
      />
    </div>
  );
};

export default SchoolTeacherManagerV2;