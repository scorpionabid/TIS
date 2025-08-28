import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Plus, AlertTriangle } from "lucide-react";
import { useSectors } from "@/hooks/sectors/useSectors";
import { SectorFilters } from "@/components/sectors/SectorFilters";
import { SectorStatistics } from "@/components/sectors/SectorStatistics";
import { SectorCard } from "@/components/sectors/SectorCard";
import { SectorCreateDialog } from "@/components/sectors/SectorCreateDialog";
import { SectorDetailsDialog } from "@/components/sectors/SectorDetailsDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function Sectors() {
  const { currentUser } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Security check - only administrative roles can access sector management
  if (!currentUser || !['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız sektor idarəçiləri daxil ola bilər
          </p>
        </div>
      </div>
    );
  }
  
  const {
    // State
    selectedType,
    setSelectedType,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    selectedSector,
    setSelectedSector,
    
    // Data
    sectors,
    stats,
    sectorsLoading,
    statsLoading,
    error,
    
    // Mutations
    createMutation,
    toggleStatusMutation,
    
    // Actions
    clearFilters,
  } = useSectors();

  const handleViewDetails = (sector: any) => {
    setSelectedSector(sector);
    setShowDetailsDialog(true);
  };

  const handleCreateSector = (data: any) => {
    createMutation.mutate(data);
  };

  const handleToggleStatus = (id: number) => {
    toggleStatusMutation.mutate(id);
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Sektor məlumatları yüklənərkən problem yarandı.</p>
        <p className="text-sm text-muted-foreground mt-2">Mock məlumatlarla davam edilir</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sektorlar</h1>
          <p className="text-muted-foreground">Regional sektorların idarə edilməsi</p>
        </div>
        <SectorFilters
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onCreateSector={() => setShowCreateDialog(true)}
        />
      </div>

      {/* Statistics Overview */}
      <SectorStatistics stats={stats} statsLoading={statsLoading} />

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectorsLoading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-secondary rounded"></div>
                  <div className="h-4 w-32 bg-secondary rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-secondary rounded"></div>
                  <div className="h-3 w-3/4 bg-secondary rounded"></div>
                </div>
                <div className="h-8 w-full bg-secondary rounded"></div>
              </div>
            </Card>
          ))
        ) : !sectors || sectors.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Sektor tapılmadı</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seçilmiş filterlərə uyğun sektor yoxdur
            </p>
            <Button onClick={clearFilters}>
              Filterləri sıfırla
            </Button>
          </div>
        ) : (
          (sectors || []).map((sector: any) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              onViewDetails={handleViewDetails}
              onToggleStatus={handleToggleStatus}
              isToggling={toggleStatusMutation.isPending}
            />
          ))
        )}

        {/* Add New Sector Card - Only for SuperAdmin and RegionAdmin */}
        {['superadmin', 'regionadmin'].includes(currentUser?.role || '') && (
          <Card className="border-dashed hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setShowCreateDialog(true)}>
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <Plus className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Yeni sektor əlavə et</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <SectorCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateSector}
        isCreating={createMutation.isPending}
      />

      {/* Details Dialog */}
      <SectorDetailsDialog
        isOpen={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        sector={selectedSector}
      />
    </div>
  );
}