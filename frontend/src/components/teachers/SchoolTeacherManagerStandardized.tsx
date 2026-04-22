import React from 'react';
import { GenericManagerV2 } from '@/components/generic/GenericManagerV2';
import { SchoolTeacher } from '@/services/schoolAdmin';
import { teacherEntityConfig, teacherCustomLogic, calculateTeacherStats } from './configurations/teacherConfig';
import { TeacherModal } from '@/components/modals/TeacherModal';
import { TeacherDetailsDialog } from './TeacherDetailsDialog';
import { TeacherImportExportModal } from '@/components/modals/TeacherImportExportModal';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { cn } from '@/lib/utils';
import { Upload, Calendar, Briefcase, Clock, CalendarRange, Download } from 'lucide-react';
import { logger } from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherWorkloadPanel } from './TeacherWorkloadPanel';
import { TeacherWorkloadStats } from './TeacherWorkloadStats';
import { AvailabilityManager } from './AvailabilityManager';
import { TeacherScheduleStats } from './TeacherScheduleStats';
import { GenericStatsCards } from '@/components/generic/GenericStatsCards';
import { exportWorkloadToExcel } from './utils/workloadExport';
import { toast } from 'sonner';
import { schoolAdminService } from '@/services/schoolAdmin';
import { TeacherWorkloadDetailTable } from './TeacherWorkloadDetailTable';

interface SchoolTeacherManagerStandardizedProps {
  className?: string;
  onAfterCreate?: () => void;
}

/**
 * Phase 3: Standardized Teacher Manager
 * 
 * This component demonstrates the standardized manager pattern using GenericManagerV2.
 * Key improvements:
 * - Reduced from 480+ lines to ~150 lines (69% reduction)
 * - Unified with GenericManagerV2 architecture
 * - Consistent error handling with Phase 2 utilities
 * - Production-safe logging
 * - Type-safe configuration-driven approach
 */
export const SchoolTeacherManagerStandardized: React.FC<SchoolTeacherManagerStandardizedProps> = ({
  className,
  onAfterCreate,
}) => {
  const queryClient = useQueryClient();
  // Local modal state
  const [teacherModalOpen, setTeacherModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<SchoolTeacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = React.useState<SchoolTeacher | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerTeacher, setDrawerTeacher] = React.useState<SchoolTeacher | null>(null);
  const [importExportModalOpen, setImportExportModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [teacherToDelete, setTeacherToDelete] = React.useState<SchoolTeacher | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>('stats');
  
  // Shift configuration state for availability management
  const [shiftConfig, setShiftConfig] = React.useState({
    shift1: { name: 'I NÖVBƏ', lessonCount: 6, startTime: '08:00', color: 'blue', enabled: true },
    shift2: { name: 'II NÖVBƏ', lessonCount: 6, startTime: '14:00', color: 'orange', enabled: false },
  });
  
  // Institution filtering for role-based access
  const [institutionFilter, setInstitutionFilter] = React.useState<string>('all');
  const { currentUser: user } = useAuth();
  
  // Fetch institutions for role-based filtering
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'for-filter'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Process available institutions based on user role
  const availableInstitutions = React.useMemo(() => {
    if (!institutionsResponse?.data?.data || !user) return [];
    
    logger.debug('Processing institutions for role-based filtering', {
      component: 'SchoolTeacherManagerStandardized',
      action: 'filterInstitutions',
      data: { userRole: user.role, institutionCount: institutionsResponse.data.data.length }
    });
    
    const institutions = institutionsResponse.data.data;
    
    // Role-based institution filtering logic
    switch (user.role) {
      case 'superadmin':
        return institutions.filter((inst: any) => inst.level && inst.level >= 3);
        
      case 'regionadmin':
        return institutions.filter((inst: any) => 
          inst.id === user.institution_id || (inst.level && inst.level >= 3)
        );
        
      case 'sektoradmin':
        return institutions.filter((inst: any) => 
          inst.id === user.institution_id || inst.level === 4
        );
        
      default:
        return institutions.filter((inst: any) => inst.id === user.institution_id);
    }
  }, [institutionsResponse, user]);

  // Fetch teachers for stats calculation
  const { data: teachersForStats } = useQuery({
    queryKey: ['teachers', 'for-stats', institutionFilter],
    queryFn: () => {
      return schoolAdminService.getTeachers({ 
        per_page: 500, 
        institution_id: institutionFilter !== 'all' ? Number(institutionFilter) : undefined 
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  const statsCards = React.useMemo(() => {
    if (!teachersForStats) return [];
    // Ensure it's an array
    const teachersArray = Array.isArray(teachersForStats) ? teachersForStats : (teachersForStats as any).data || [];
    if (!Array.isArray(teachersArray)) return [];
    // Filter stats to match other pages (4 columns)
    const allStats = calculateTeacherStats(teachersArray);
    return allStats.filter(s => ['total', 'active', 'inactive', 'full_time'].includes(s.key));
  }, [teachersForStats]);

  // Enhanced configuration with modal and action handlers
  const enhancedConfig = React.useMemo(() => ({
    ...teacherEntityConfig,
    
    // Override actions to connect with local modal handlers
    actions: teacherEntityConfig.actions.map(action => ({
      ...action,
      onClick: (teacher: SchoolTeacher) => {
        logger.debug(`Teacher action triggered: ${action.key}`, {
          component: 'SchoolTeacherManagerStandardized',
          action: `handle${action.key}`,
          data: { teacherId: teacher.id, teacherEmail: teacher.email }
        });
        
        switch (action.key) {
          case 'details':
            setDrawerTeacher(teacher);
            setDrawerOpen(true);
            break;
          case 'view':
            setSelectedTeacher(teacher);
            break;
          case 'edit':
            setEditingUser(teacher);
            setTeacherModalOpen(true);
            break;
          case 'delete':
            setTeacherToDelete(teacher);
            setDeleteModalOpen(true);
            break;
          default:
            logger.warn(`Unhandled teacher action: ${action.key}`);
        }
      },
    })),
    
    // Enhanced filter fields with institution filter
    filterFields: [
      ...teacherEntityConfig.filterFields,
      ...(availableInstitutions.length > 1 ? [{
        key: 'institution_id',
        label: 'Müəssisə',
        type: 'select' as const,
        options: [
          { value: 'all', label: 'Hamısı' },
          ...availableInstitutions.map((inst: any) => ({
            value: inst.id.toString(),
            label: inst.name
          }))
        ],
      }] : []),
    ],
  }), [availableInstitutions, institutionFilter, user]);

  // Enhanced custom logic with modal rendering
  const enhancedCustomLogic = React.useMemo(() => ({
    ...teacherCustomLogic,
    
    // Custom header actions
    headerActions: [
      ...(activeTab === 'workload_distribution' ? [{
        key: 'export-workload',
        label: 'Excel İxrac',
        icon: Download,
        onClick: async () => {
          logger.info('Exporting workload distribution to Excel');
          
          try {
            // Fetch all teachers for the current institution filter
            const response = await schoolAdminService.getTeachers({
              per_page: 1000,
              institution_id: institutionFilter !== 'all' ? Number(institutionFilter) : (user?.institution_id || undefined)
            });
            
            const teachers = Array.isArray(response) ? response : (response as any).data || [];
            
            if (teachers.length === 0) {
              toast.error("İxrac etmək üçün məlumat tapılmadı");
              return;
            }

            const instName = availableInstitutions.find(i => i.id.toString() === institutionFilter)?.name || user?.institution?.name || 'Məktəb';
            
            toast.promise(exportWorkloadToExcel(teachers, instName), {
              loading: 'Excel faylı hazırlanır...',
              success: 'Fayl uğurla yükləndi',
              error: 'Excel ixracı zamanı xəta baş verdi',
            });
          } catch (error) {
            logger.error('Workload export failed', error);
            toast.error("Məlumatları çəkərkən xəta baş verdi");
          }
        },
        variant: 'default' as const,
      }] : []),
      {
        key: 'import-export',
        label: 'İdxal/İxrac',
        icon: Upload,
        onClick: () => {
          logger.debug('Opening import/export modal', {
            component: 'SchoolTeacherManagerStandardized',
            action: 'openImportExportModal'
          });
          setImportExportModalOpen(true);
        },
        variant: 'outline' as const,
      },
    ],
    
    // Custom create handler
    onCreateClick: () => {
      logger.debug('Opening create teacher modal', {
        component: 'SchoolTeacherManagerStandardized',
        action: 'openCreateModal'
      });
      setEditingUser(null);
      setTeacherModalOpen(true);
    },
    
    // Import/Export/Template handlers for modern header
    onImportClick: () => {
      logger.debug('Opening import modal', {
        component: 'SchoolTeacherManagerStandardized',
        action: 'openImportModal'
      });
      setImportExportModalOpen(true);
    },
    onExportClick: () => {
      logger.debug('Opening export modal', {
        component: 'SchoolTeacherManagerStandardized',
        action: 'openExportModal'
      });
      setImportExportModalOpen(true);
    },
    onTemplateClick: () => {
      logger.debug('Downloading template', {
        component: 'SchoolTeacherManagerStandardized',
        action: 'downloadTemplate'
      });
      // Template download will be handled by TeacherImportExportModal
      setImportExportModalOpen(true);
    },

  }), [activeTab, institutionFilter, user, availableInstitutions]);

  // Modal event handlers with error handling
  const handleUserSave = async (userData: any) => {
    try {
      logger.debug('Saving teacher data', {
        component: 'SchoolTeacherManagerStandardized',
        action: 'handleUserSave',
        data: { isEdit: !!editingUser, teacherId: editingUser?.id }
      });
      
      if (editingUser) {
        await teacherEntityConfig.service.update(editingUser.id, userData);
        logger.info(`Successfully updated teacher ${editingUser.id}`);
      } else {
        await teacherEntityConfig.service.create(userData);
        logger.info('Successfully created new teacher');
        onAfterCreate?.();
      }

      // Invalidate queries to refresh data and stats
      queryClient.invalidateQueries({ queryKey: teacherEntityConfig.queryKey });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['schoolAdmin'] });
      
      // Close modal on success
      setTeacherModalOpen(false);
      setEditingUser(null);
      
    } catch (error) {
      logger.error('Failed to save teacher', error, {
        component: 'SchoolTeacherManagerStandardized',
        action: 'handleUserSave'
      });
      throw error; // Re-throw to let modal handle user feedback
    }
  };

  const handleDeleteConfirm = async (deleteType: 'soft' | 'hard') => {
    if (!teacherToDelete) return;
    
    try {
      logger.debug(`Deleting teacher (${deleteType})`, {
        component: 'SchoolTeacherManagerStandardized',
        action: 'handleDeleteConfirm',
        data: { teacherId: teacherToDelete.id, deleteType }
      });
      
      const { schoolAdminService } = await import('@/services/schoolAdmin');
      
      if (deleteType === 'soft') {
        await schoolAdminService.softDeleteTeacher(teacherToDelete.id);
      } else {
        await schoolAdminService.hardDeleteTeacher(teacherToDelete.id);
      }
      
      logger.info(`Successfully ${deleteType} deleted teacher ${teacherToDelete.id}`);
      
      // Close modal and reset state
      setDeleteModalOpen(false);
      setTeacherToDelete(null);
      
    } catch (error) {
      logger.error(`Failed to delete teacher (${deleteType})`, error);
      throw error;
    }
  };

  // Utility functions for TeacherDetailsDialog
  const utilityFunctions = React.useMemo(() => ({
    getDepartmentText: (dept: string) => dept || 'Təyin edilməyib',
    getPositionText: (pos: string) => pos || 'Müəllim',
    getPerformanceColor: () => 'bg-green-100 text-green-800',
    getWorkloadColor: () => 'bg-blue-100 text-blue-800',
  }), []);

  // Main Generic Manager - contains search and table
  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary stats */}
      {statsCards.length > 0 && (
        <GenericStatsCards
          stats={statsCards}
          variant="compact"
          className="mb-4"
        />
      )}

      <GenericManagerV2
        config={{
          ...enhancedConfig,
          onTabChange: (tab) => {
            setActiveTab(tab);
            if (teacherEntityConfig.onTabChange) {
              teacherEntityConfig.onTabChange(tab);
            }
          }
        }}
        customLogic={enhancedCustomLogic}
      />

      {/* Teacher-specific Modals */}
      <TeacherModal
        open={teacherModalOpen}
        onClose={() => {
          logger.debug('Closing teacher modal', {
            component: 'SchoolTeacherManagerStandardized',
            action: 'closeTeacherModal'
          });
          setTeacherModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleUserSave}
        teacher={editingUser}
      />

      <TeacherDetailsDialog
        teacher={selectedTeacher}
        isOpen={!!selectedTeacher}
        onClose={() => {
          logger.debug('Closing teacher details dialog', {
            component: 'SchoolTeacherManagerStandardized',
            action: 'closeDetailsDialog'
          });
          setSelectedTeacher(null);
        }}
        onEdit={(teacher) => {
          setEditingUser(teacher);
          setTeacherModalOpen(true);
          setSelectedTeacher(null);
        }}
        {...utilityFunctions}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          logger.debug('Closing delete modal', {
            component: 'SchoolTeacherManagerStandardized',
            action: 'closeDeleteModal'
          });
          setDeleteModalOpen(false);
          setTeacherToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={
          teacherToDelete?.first_name && teacherToDelete?.last_name 
            ? `${teacherToDelete.first_name} ${teacherToDelete.last_name}`.trim() 
            : teacherToDelete?.email || 'Müəllim'
        }
        itemType="Müəllim"
        isLoading={false}
      />

      <TeacherImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => {
          logger.debug('Closing import/export modal', {
            component: 'SchoolTeacherManagerStandardized',
            action: 'closeImportExportModal'
          });
          setImportExportModalOpen(false);
        }}
      />

      {/* Workload & Availability Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[1800px] sm:max-w-[1800px] p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle>
                {drawerTeacher?.first_name && drawerTeacher?.last_name
                  ? `${drawerTeacher.first_name} ${drawerTeacher.last_name}`
                  : drawerTeacher?.email || 'Müəllim'}
              </SheetTitle>
              <SheetDescription>
                Dərs yükü və iş vaxtı idarəetməsi
              </SheetDescription>
            </SheetHeader>
            
            {drawerTeacher && (
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <Tabs defaultValue="workload" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50 rounded-xl h-14 mb-6">
                    <TabsTrigger value="workload" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all h-11 flex items-center justify-center gap-2 font-medium">
                      <Briefcase className="h-4 w-4" />
                      Dərs Yükü
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all h-11 flex items-center justify-center gap-2 font-medium">
                      <Clock className="h-4 w-4" />
                      İş vaxtı
                    </TabsTrigger>
                    <TabsTrigger value="timetable" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all h-11 flex items-center justify-center gap-2 font-medium">
                      <CalendarRange className="h-4 w-4" />
                      Dərs cədvəli
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="workload" className="mt-0">
                    <div className="grid grid-cols-12 gap-6">
                      {/* Sol sütun - Statistika */}
                      <div className="col-span-3 space-y-4">
                        <TeacherWorkloadStats teacherId={drawerTeacher.id} />
                      </div>
                      {/* Sağ sütun - Əsas məzmun */}
                      <div className="col-span-9">
                        <TeacherWorkloadPanel 
                          teacherId={drawerTeacher.id} 
                          teacherName={drawerTeacher.first_name && drawerTeacher.last_name
                            ? `${drawerTeacher.first_name} ${drawerTeacher.last_name}`.trim()
                            : (drawerTeacher.email || `#${drawerTeacher.id}`)}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="schedule" className="mt-0">
                    <div className="grid grid-cols-12 gap-6">
                      {/* Sol sütun - İş vaxtı statistikası */}
                      <div className="col-span-3 space-y-4">
                        <TeacherScheduleStats teacherId={drawerTeacher.id} shifts={shiftConfig} />
                      </div>
                      {/* Sağ sütun - Əsas məzmun */}
                      <div className="col-span-9">
                        <Card className="h-full">
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                İş vaxtı
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <AvailabilityManager 
                              teacherId={drawerTeacher.id} 
                              externalShifts={shiftConfig}
                              onShiftsChange={setShiftConfig}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="timetable" className="mt-0">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Dərs cədvəli
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          Müəllimin dərs cədvəli bu bölmədə olacaq.
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  

                </Tabs>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SchoolTeacherManagerStandardized;
