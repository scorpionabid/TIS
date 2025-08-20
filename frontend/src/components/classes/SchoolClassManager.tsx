import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, Download, AlertTriangle, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchoolClassManager } from './hooks/useSchoolClassManager';
import { ClassCard } from './ClassCard';
import { ClassCreateDialog } from './ClassCreateDialog';
import { ClassDetailsDialog } from './ClassDetailsDialog';
import { ClassStatsCards } from './ClassStatsCards';
import { ClassFilters } from './ClassFilters';

interface SchoolClassManagerProps {
  className?: string;
}

export const SchoolClassManager: React.FC<SchoolClassManagerProps> = ({ className }) => {
  const {
    // State
    searchTerm,
    filters,
    selectedTab,
    selectedClass,
    createModalOpen,
    newClassData,
    
    // Data
    classes,
    teachers,
    classStats,
    isLoading,
    error,
    
    // Mutations
    createClassMutation,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSelectedTab,
    setSelectedClass,
    setCreateModalOpen,
    setNewClassData,
    refetch,
    
    // Event handlers
    handleCreateClass,
    
    // Utilities
    getGradeLevelText,
    getCurrentAcademicYear
  } = useSchoolClassManager();

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Siniflər yüklənərkən xəta baş verdi</h3>
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
          <h2 className="text-2xl font-bold text-foreground">Sinif İdarəetməsi</h2>
          <p className="text-muted-foreground">
            Məktəb siniflərini idarə edin və izləyin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Yenilə
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Sinif
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <ClassStatsCards classStats={classStats} />

      {/* Filters */}
      <ClassFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilters={setFilters}
        getCurrentAcademicYear={getCurrentAcademicYear}
      />

      {/* Class Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            Hamısı ({classStats.total})
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktiv ({classStats.active})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Passiv ({classStats.inactive})
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
          ) : classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map(schoolClass => (
                <ClassCard 
                  key={schoolClass.id} 
                  schoolClass={schoolClass}
                  onViewDetails={setSelectedClass}
                  getGradeLevelText={getGradeLevelText}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sinif tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun sinif tapılmadı' : 
                      selectedTab === 'all' ? 
                        'Hələ ki məktəbdə yaradılmış sinif yoxdur' :
                        `${selectedTab === 'active' ? 'Aktiv' : 'Passiv'} sinif yoxdur`
                    }
                  </p>
                  <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlk sinifi yarat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ClassCreateDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        newClassData={newClassData}
        setNewClassData={setNewClassData}
        onCreateClass={handleCreateClass}
        teachers={teachers}
        getCurrentAcademicYear={getCurrentAcademicYear}
        isCreating={createClassMutation.isPending}
      />

      <ClassDetailsDialog
        schoolClass={selectedClass}
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        getGradeLevelText={getGradeLevelText}
      />
    </div>
  );
};

export default SchoolClassManager;