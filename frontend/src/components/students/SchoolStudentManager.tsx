import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, Download, Upload, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchoolStudentManager } from './hooks/useSchoolStudentManager';
import { StudentCard } from './StudentCard';
import { StudentDetailsDialog } from './StudentDetailsDialog';
import { StudentStatsCards } from './StudentStatsCards';
import { StudentFilters } from './StudentFilters';
import { EnrollmentModal } from './EnrollmentModal';
import { UserModal } from '@/components/modals/UserModal';
import { ImportModal } from '@/components/import/ImportModal';

interface SchoolStudentManagerProps {
  className?: string;
}

export const SchoolStudentManager: React.FC<SchoolStudentManagerProps> = ({ className }) => {
  const {
    // State
    searchTerm,
    filters,
    selectedTab,
    selectedStudent,
    enrollmentModalOpen,
    selectedGradeForEnrollment,
    userModalOpen,
    editingUser,
    importModalOpen,
    
    // Data
    students,
    filteredStudents,
    studentStats,
    classes,
    isLoading,
    error,
    
    // Mutations
    createStudentMutation,
    updateStudentMutation,
    enrollStudentMutation,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSelectedTab,
    setSelectedStudent,
    setEnrollmentModalOpen,
    setSelectedGradeForEnrollment,
    setUserModalOpen,
    setEditingUser,
    setImportModalOpen,
    refetch,
    
    // Event handlers
    handleUserSave,
    handleEnrollment,
    
    // Utilities
    getStatusText,
    getStatusColor,
    getGenderText,
    getGradeLevelText
  } = useSchoolStudentManager();

  const handleEditStudent = (student: any) => {
    setEditingUser(student);
    setUserModalOpen(true);
  };

  const handleEnrollStudent = (student: any) => {
    setSelectedStudent(student);
    setEnrollmentModalOpen(true);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Şagirdlər yüklənərkən xəta baş verdi</h3>
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
          <h2 className="text-2xl font-bold text-foreground">Şagird İdarəetməsi</h2>
          <p className="text-muted-foreground">
            Məktəb şagirdlərini idarə edin və izləyin
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
            Yeni Şagird
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StudentStatsCards studentStats={studentStats} />

      {/* Filters */}
      <StudentFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilters={setFilters}
        classes={classes}
      />

      {/* Student Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            Hamısı ({studentStats.total})
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktiv ({studentStats.active})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Passiv ({studentStats.inactive})
          </TabsTrigger>
          <TabsTrigger value="transferred">
            Köçürülmüş ({studentStats.transferred})
          </TabsTrigger>
          <TabsTrigger value="graduated">
            Məzun ({studentStats.graduated})
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
          ) : filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map(student => (
                <StudentCard 
                  key={student.id} 
                  student={student}
                  onViewDetails={setSelectedStudent}
                  onEdit={handleEditStudent}
                  onEnroll={handleEnrollStudent}
                  getStatusText={getStatusText}
                  getStatusColor={getStatusColor}
                  getGenderText={getGenderText}
                  getGradeLevelText={getGradeLevelText}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Şagird tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun şagird tapılmadı' : 
                      selectedTab === 'all' ? 
                        'Hələ ki məktəbdə yaradılmış şagird yoxdur' :
                        `${getStatusText(selectedTab)} şagird yoxdur`
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
                    İlk şagirdi yarat
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
        userType="student"
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importType="students"
        onImportComplete={() => {
          refetch();
          setImportModalOpen(false);
        }}
      />

      <EnrollmentModal
        isOpen={enrollmentModalOpen}
        onClose={() => {
          setEnrollmentModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        classes={classes}
        selectedGradeForEnrollment={selectedGradeForEnrollment}
        setSelectedGradeForEnrollment={setSelectedGradeForEnrollment}
        onEnroll={handleEnrollment}
        isEnrolling={enrollStudentMutation.isPending}
        getGradeLevelText={getGradeLevelText}
      />

      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={!!selectedStudent && !enrollmentModalOpen}
        onClose={() => setSelectedStudent(null)}
        onEdit={handleEditStudent}
        onEnroll={handleEnrollStudent}
        getStatusText={getStatusText}
        getStatusColor={getStatusColor}
        getGenderText={getGenderText}
        getGradeLevelText={getGradeLevelText}
      />
    </div>
  );
};

export default SchoolStudentManager;