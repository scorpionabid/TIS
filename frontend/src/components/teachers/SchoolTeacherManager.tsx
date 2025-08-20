import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, Download, Upload, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchoolTeacherManager } from './hooks/useSchoolTeacherManager';
import { TeacherCard } from './TeacherCard';
import { TeacherDetailsDialog } from './TeacherDetailsDialog';
import { TeacherStatsCards } from './TeacherStatsCards';
import { TeacherFilters } from './TeacherFilters';
import { UserModal } from '@/components/modals/UserModal';
import { ImportModal } from '@/components/import/ImportModal';

interface SchoolTeacherManagerProps {
  className?: string;
}

export const SchoolTeacherManager: React.FC<SchoolTeacherManagerProps> = ({ className }) => {
  const {
    // State
    searchTerm,
    filters,
    selectedTab,
    selectedTeacher,
    userModalOpen,
    editingUser,
    importModalOpen,
    
    // Data
    teachers,
    filteredTeachers,
    teacherStats,
    isLoading,
    error,
    
    // Mutations
    createTeacherMutation,
    updateTeacherMutation,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSelectedTab,
    setSelectedTeacher,
    setUserModalOpen,
    setEditingUser,
    setImportModalOpen,
    refetch,
    
    // Event handlers
    handleUserSave,
    
    // Utilities
    getDepartmentText,
    getPositionText,
    getPerformanceColor,
    getWorkloadColor
  } = useSchoolTeacherManager();

  const handleEditTeacher = (teacher: any) => {
    setEditingUser(teacher);
    setUserModalOpen(true);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Müəllimlər yüklənərkən xəta baş verdi</h3>
              <p className="text-muted-foreground mb-4">
                Zəhmət olmasa yenidən cəhd edin
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenidən cəhd et
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Müəllim İdarəetməsi</h2>
          <p className="text-muted-foreground">
            Məktəb müəllimlərini idarə edin və izləyin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Yenilə
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            İdxal et
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
          <Button 
            onClick={() => {
              setEditingUser(null);
              setUserModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Müəllim
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <TeacherStatsCards teacherStats={teacherStats} />

      {/* Filters */}
      <TeacherFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilters={setFilters}
      />

      {/* Teacher Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            Hamısı ({teacherStats.total})
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktiv ({teacherStats.active})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Passiv ({teacherStats.inactive})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg" />
                        <div className="space-y-2">
                          <div className="w-24 h-5 bg-muted rounded" />
                          <div className="w-32 h-4 bg-muted rounded" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-3 bg-muted rounded" />
                        <div className="w-3/4 h-3 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTeachers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeachers.map(teacher => (
                <TeacherCard 
                  key={teacher.id} 
                  teacher={teacher}
                  onViewDetails={setSelectedTeacher}
                  onEdit={handleEditTeacher}
                  getDepartmentText={getDepartmentText}
                  getPositionText={getPositionText}
                  getPerformanceColor={getPerformanceColor}
                  getWorkloadColor={getWorkloadColor}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Müəllim tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun müəllim tapılmadı' : 
                      selectedTab === 'all' ? 
                        'Hələ ki məktəbdə yaradılmış müəllim yoxdur' :
                        `${selectedTab === 'active' ? 'Aktiv' : 'Passiv'} müəllim yoxdur`
                    }
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      setEditingUser(null);
                      setUserModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    İlk müəllimi yarat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleUserSave}
        editingUser={editingUser}
        userType="teacher"
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importType="teachers"
        onImportComplete={() => {
          refetch();
          setImportModalOpen(false);
        }}
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
    </div>
  );
};

export default SchoolTeacherManager;