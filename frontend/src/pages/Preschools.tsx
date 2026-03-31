import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  AlertTriangle,
  Building2,
  Users,
  BookOpen,
  CheckCircle,
  Upload,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  preschoolsService,
  type Preschool,
  type PreschoolFilters,
  type PreschoolCreateData,
} from "../services/preschools";
import { sectorsService } from "../services/sectors";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PreschoolCreateModal } from "../components/modals/PreschoolCreateModal";
import { PreschoolEditModal } from "../components/modals/PreschoolEditModal";
import { PreschoolDetailModal } from "../components/modals/PreschoolDetailModal";
import { PreschoolsImportExportModal } from "../components/modals/PreschoolsImportExportModal";
import { PreschoolsList } from "./Preschools/PreschoolsList";
import { useRoleCheck } from "@/hooks/useRoleCheck";

const PRESCHOOL_TYPES = [
  { value: "kindergarten", label: "Uşaq Bağçası", icon: "🏫" },
  {
    value: "preschool_center",
    label: "Məktəbəqədər Təhsil Mərkəzi",
    icon: "🎓",
  },
  { value: "nursery", label: "Uşaq Evləri", icon: "🏡" },
] as const;

export default function Preschools() {
  const { currentUser } = useAuth();
  const { isSuperAdmin, isRegionAdmin, isSektorAdmin } = useRoleCheck();

  // State hooks - all at the top
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [selectedPreschool, setSelectedPreschool] = useState<Preschool | null>(
    null,
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const queryClient = useQueryClient();

  // Check access permissions
  const hasAccess =
    currentUser &&
    [
      "superadmin",
      "regionadmin",
      "sektoradmin",
      "schooladmin",
      "müəllim",
    ].includes(currentUser.role);

  // Build filters
  const filters: PreschoolFilters = {
    ...(searchTerm && { search: searchTerm }),
    ...(selectedType !== "all" && { type: selectedType as any }),
    ...(selectedSector !== "all" && { sector_id: parseInt(selectedSector) }),
    ...(selectedStatus !== "all" && { is_active: selectedStatus === "active" }),
    sort_by: "name",
    sort_order: "asc",
  };

  // Fetch preschools - use enabled prop
  const {
    data: preschoolsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "preschools",
      filters,
      currentUser?.role,
      currentUser?.institution?.id,
    ],
    queryFn: () => preschoolsService.getPreschools(filters),
    refetchOnWindowFocus: false,
    enabled: hasAccess,
  });

  // Load sectors for filters - role-based - use enabled prop
  const { data: sectorsResponse } = useQuery({
    queryKey: ["sectors", currentUser?.role, currentUser?.institution?.id],
    queryFn: async () => {
      if (currentUser?.role === "superadmin") {
        // SuperAdmin can see all sectors
        return await sectorsService.getSectors();
      } else if (currentUser?.role === "regionadmin") {
        // RegionAdmin can only see sectors under their region
        if (currentUser.institution?.id) {
          return await sectorsService.getSectorsByRegion(
            currentUser.institution.id,
          );
        }
      } else if (currentUser?.role === "sektoradmin") {
        // SektorAdmin can only see their own sector
        if (currentUser.institution) {
          return { data: [currentUser.institution] };
        }
      }
      return { data: [] };
    },
    enabled: hasAccess,
    refetchOnWindowFocus: false,
  });

  // Fetch statistics - use enabled prop
  const { data: statisticsResponse } = useQuery({
    queryKey: [
      "preschool-statistics",
      currentUser?.role,
      currentUser?.institution?.id,
    ],
    queryFn: () => preschoolsService.getPreschoolStatistics(),
    refetchOnWindowFocus: false,
    enabled: hasAccess,
  });

  const preschools = Array.isArray(preschoolsResponse?.data)
    ? preschoolsResponse.data
    : [];
  const sectors = Array.isArray(sectorsResponse?.data)
    ? sectorsResponse.data
    : [];
  const statistics = statisticsResponse?.data;

  // Log statistics for debugging if needed
  if (!statistics && currentUser) {
    console.log(
      "⚠️ No preschool statistics loaded for user role:",
      currentUser.role,
    );
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: preschoolsService.createPreschool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preschools"] });
      queryClient.invalidateQueries({ queryKey: ["preschool-statistics"] });
      setIsCreateModalOpen(false);
      toast.success("Məktəbəqədər müəssisə uğurla yaradıldı");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Məktəbəqədər müəssisə yaratmaq mümkün olmadı",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      preschoolsService.updatePreschool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preschools"] });
      setIsEditModalOpen(false);
      toast.success("Məktəbəqədər müəssisə uğurla yeniləndi");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Məktəbəqədər müəssisə yeniləmək mümkün olmadı",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: preschoolsService.deletePreschool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preschools"] });
      queryClient.invalidateQueries({ queryKey: ["preschool-statistics"] });
      toast.success("Məktəbəqədər müəssisə uğurla silindi");
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Məktəbəqədər müəssisə silmək mümkün olmadı",
      );
    },
  });

  // Security check - only administrative and educational roles can access preschools
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız təhsil idarəçiləri və müəllimlər daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  const handleOpenCreateModal = () => {
    setSelectedPreschool(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (preschool: Preschool) => {
    setSelectedPreschool(preschool);
    setIsEditModalOpen(true);
  };

  const handleOpenDetailModal = (preschool: Preschool) => {
    setSelectedPreschool(preschool);
    setIsDetailModalOpen(true);
  };

  const handleCreate = (data: PreschoolCreateData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: any) => {
    if (selectedPreschool) {
      updateMutation.mutate({ id: selectedPreschool.id, data });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bu məktəbəqədər müəssisəni silmək istədiyinizə əminsiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  // Get type icon and color
  const getTypeInfo = (type: string) => {
    const typeInfo = PRESCHOOL_TYPES.find((t) => t.value === type);
    return typeInfo || { icon: "🏫", label: type };
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Xəta baş verdi</h3>
          <p className="text-muted-foreground">
            Məktəbəqədər müəssisələr yüklənərkən xəta baş verdi
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Məktəbəqədər Müəssisələr
          </h1>
          <p className="text-muted-foreground">
            Uşaq bağçaları, məktəbəqədər təhsil mərkəzləri və uşaq evlərini
            idarə edin
          </p>
        </div>
        {/* Only superadmin, regionadmin, and sektoradmin can create preschools */}
        {currentUser?.role &&
          ["superadmin", "regionadmin", "sektoradmin"].includes(
            currentUser.role,
          ) && (
            <div className="flex gap-2">
              <Button
                onClick={() => setIsImportExportModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                İdxal/İxrac
              </Button>
              <Button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Yeni Məktəbəqədər Müəssisə
              </Button>
            </div>
          )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Ümumi
                  </p>
                  <p className="text-2xl font-bold">
                    {statistics?.total_preschools || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Aktiv
                  </p>
                  <p className="text-2xl font-bold">
                    {statistics?.active_preschools || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Uşaqlar
                  </p>
                  <p className="text-2xl font-bold">
                    {statistics?.performance_summary?.total_children || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Müəllimlər
                  </p>
                  <p className="text-2xl font-bold">
                    {statistics?.performance_summary?.total_teachers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Məktəbəqədər müəssisə axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Növ seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün növlər</SelectItem>
                {PRESCHOOL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sektor seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün sektorlar</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id.toString()}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Qeyri-aktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {preschools.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {preschools.length} məktəbəqədər müəssisə tapıldı
        </div>
      )}

      {/* Preschools Table */}
      <PreschoolsList
        preschools={preschools}
        pagination={{
          currentPage: currentPage,
          perPage: perPage,
          total: preschools.length,
          lastPage: Math.ceil(preschools.length / perPage) || 1,
        }}
        isLoading={isLoading}
        onEdit={handleOpenEditModal}
        onDelete={(preschool) => handleDelete(preschool.id)}
        onViewDetails={handleOpenDetailModal}
        onPageChange={setCurrentPage}
        onPerPageChange={setPerPage}
        isSuperAdmin={isSuperAdmin}
        isRegionAdmin={isRegionAdmin}
        isSektorAdmin={isSektorAdmin}
      />

      {/* Modal Components */}
      <PreschoolCreateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
      />

      <PreschoolEditModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        preschool={selectedPreschool}
        onSave={handleUpdate}
      />

      <PreschoolDetailModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        preschool={selectedPreschool}
        onEdit={handleOpenEditModal}
      />

      <PreschoolsImportExportModal
        open={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["preschools"] });
          queryClient.invalidateQueries({ queryKey: ["preschool-statistics"] });
          toast.success("Siyahı yeniləndi");
        }}
      />
    </div>
  );
}
