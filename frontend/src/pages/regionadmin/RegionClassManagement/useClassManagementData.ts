import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  regionAdminClassService,
  ClassData,
  ClassFilters as ClassFiltersType,
  UpdateClassPayload,
} from "@/services/regionadmin/classes";
import { institutionService } from "@/services/institutions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import type { EditFormState, SortColumn, SortDirection } from "./types";

interface RegionOption {
  id: number;
  name: string;
  level: number;
}

interface UseClassManagementDataProps {
  isSuperAdmin: boolean;
  selectedRegionId: number | null;
  setSelectedRegionId: (id: number | null) => void;
  searchTerm: string;
  institutionFilter: string;
  classLevelFilter: string;
  academicYearFilter: string;
  statusFilter: string;
  page: number;
  perPage: number;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  selectedClasses: number[];
  setSelectedClasses: React.Dispatch<React.SetStateAction<number[]>>;
  // Mutation callbacks
  onEditSuccess: () => void;
  setIsSaving: (v: boolean) => void;
  setIsDeleting: (v: boolean) => void;
  setDeleteTarget: (v: ClassData | null) => void;
  setIsBulkDeleting: (v: boolean) => void;
  setIsBulkDeleteDialogOpen: (v: boolean) => void;
}

export const useClassManagementData = ({
  isSuperAdmin,
  selectedRegionId,
  setSelectedRegionId,
  searchTerm,
  institutionFilter,
  classLevelFilter,
  academicYearFilter,
  statusFilter,
  page,
  perPage,
  sortColumn,
  sortDirection,
  selectedClasses,
  setSelectedClasses,
  onEditSuccess,
  setIsSaving,
  setIsDeleting,
  setDeleteTarget,
  setIsBulkDeleting,
  setIsBulkDeleteDialogOpen,
}: UseClassManagementDataProps) => {
  const { currentUser } = useAuth();

  // --- Regions query (SuperAdmin only) ---
  const { data: regionsResponse, isLoading: regionsLoading } = useQuery({
    queryKey: ["regionadmin", "regions", currentUser?.id],
    queryFn: () => institutionService.getAll({ per_page: 200, level: 2 }),
    enabled: isSuperAdmin,
    staleTime: 10 * 60 * 1000,
  });

  const regionOptions = useMemo((): RegionOption[] => {
    if (!regionsResponse) return [];

    let payload: RegionOption[] | undefined;
    const resp = regionsResponse as Record<string, unknown>;

    if (Array.isArray((resp?.data as Record<string, unknown>)?.data)) {
      payload = (resp.data as Record<string, unknown>).data as RegionOption[];
    } else if (Array.isArray(resp?.data)) {
      payload = resp.data as RegionOption[];
    } else if (Array.isArray(regionsResponse)) {
      payload = regionsResponse as unknown as RegionOption[];
    }

    if (!Array.isArray(payload)) return [];

    return payload
      .filter((inst) => inst.level === 2)
      .sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""));
  }, [regionsResponse]);

  // Auto-select first region for SuperAdmin
  useEffect(() => {
    if (!isSuperAdmin) {
      if (selectedRegionId !== null) {
        setSelectedRegionId(null);
      }
      return;
    }

    if (selectedRegionId || regionOptions.length === 0) return;

    const firstRegionId = Number(regionOptions[0]?.id);
    if (!Number.isNaN(firstRegionId)) {
      setSelectedRegionId(firstRegionId);
    }
  }, [isSuperAdmin, selectedRegionId, regionOptions, setSelectedRegionId]);

  // --- Filter params ---
  const filterParams: ClassFiltersType = useMemo(() => {
    const params: ClassFiltersType = { page, per_page: perPage };

    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (institutionFilter !== "all")
      params.institution_id = parseInt(institutionFilter);
    if (classLevelFilter !== "all")
      params.class_level = parseInt(classLevelFilter);
    if (academicYearFilter !== "all")
      params.academic_year_id = parseInt(academicYearFilter);
    if (statusFilter !== "all") params.is_active = statusFilter === "active";
    if (isSuperAdmin && selectedRegionId) params.region_id = selectedRegionId;

    return params;
  }, [
    searchTerm,
    institutionFilter,
    classLevelFilter,
    academicYearFilter,
    statusFilter,
    page,
    perPage,
    selectedRegionId,
    isSuperAdmin,
  ]);

  const waitingForRegionSelection = isSuperAdmin && !selectedRegionId;

  // --- Statistics query ---
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: [
      "regionadmin",
      "class-statistics",
      isSuperAdmin ? selectedRegionId : null,
    ],
    queryFn: () =>
      regionAdminClassService.getStatistics(
        isSuperAdmin ? selectedRegionId || undefined : undefined,
      ),
    enabled: !!currentUser && (!isSuperAdmin || !!selectedRegionId),
  });

  // --- Classes query ---
  const {
    data: classesData,
    isLoading: classesLoading,
    isFetching,
    error: classesError,
    refetch,
  } = useQuery({
    queryKey: ["regionadmin", "classes", filterParams],
    queryFn: () => regionAdminClassService.getClasses(filterParams),
    enabled: !!currentUser && (isSuperAdmin ? !!selectedRegionId : true),
    keepPreviousData: true,
  });

  // --- Filter options ---
  const { data: institutions } = useQuery({
    queryKey: [
      "regionadmin",
      "institutions",
      isSuperAdmin ? selectedRegionId : null,
    ],
    queryFn: () =>
      regionAdminClassService.getAvailableInstitutions(
        isSuperAdmin ? selectedRegionId || undefined : undefined,
      ),
    enabled: !!currentUser && (isSuperAdmin ? !!selectedRegionId : true),
    staleTime: 10 * 60 * 1000,
  });

  const { data: academicYears } = useQuery({
    queryKey: ["regionadmin", "academic-years"],
    queryFn: () => regionAdminClassService.getAvailableAcademicYears(),
    enabled: !!currentUser,
    staleTime: 10 * 60 * 1000,
  });

  // --- Data extraction ---
  const rawClasses: ClassData[] = classesData?.data?.data || [];
  const totalItems: number = classesData?.data?.total || 0;
  const totalPages: number = classesData?.data?.last_page || 1;
  const currentPage: number = classesData?.data?.current_page || page;
  const classesErrorMessage: string | null =
    classesError instanceof Error
      ? classesError.message
      : classesError
        ? "Siniflər yüklənə bilmədi"
        : null;

  // Error toast
  useEffect(() => {
    if (classesErrorMessage) {
      toast({
        title: "Sinifləri yükləmək mümkün olmadı",
        description: classesErrorMessage,
        variant: "destructive",
      });
    }
  }, [classesErrorMessage]);

  // --- Client-side sorting ---
  const classes = useMemo(() => {
    if (!sortColumn || rawClasses.length === 0) return rawClasses;

    const sorted = [...rawClasses].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "institution":
          aValue = a.institution?.name || "";
          bValue = b.institution?.name || "";
          break;
        case "utis":
          aValue = a.institution?.utis_code || "";
          bValue = b.institution?.utis_code || "";
          break;
        case "level":
          aValue = a.class_level || 0;
          bValue = b.class_level || 0;
          break;
        case "name":
          aValue = a.name || "";
          bValue = b.name || "";
          break;
        case "specialty":
          aValue = a.specialty || "";
          bValue = b.specialty || "";
          break;
        case "students":
          aValue = a.student_count || 0;
          bValue = b.student_count || 0;
          break;
        case "teacher":
          aValue = a.homeroomTeacher
            ? `${a.homeroomTeacher.first_name} ${a.homeroomTeacher.last_name}`
            : "";
          bValue = b.homeroomTeacher
            ? `${b.homeroomTeacher.first_name} ${b.homeroomTeacher.last_name}`
            : "";
          break;
        case "year":
          aValue = a.academicYear?.year || "";
          bValue = b.academicYear?.year || "";
          break;
        case "status":
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      return sortDirection === "asc"
        ? aStr.localeCompare(bStr, "az-AZ")
        : bStr.localeCompare(aStr, "az-AZ");
    });

    return sorted;
  }, [rawClasses, sortColumn, sortDirection]);

  // Cleanup stale selections when data changes
  useEffect(() => {
    setSelectedClasses((prev) =>
      prev.filter((id) => rawClasses.some((cls) => cls.id === id)),
    );
  }, [rawClasses, setSelectedClasses]);

  // --- Page selection computed ---
  const classesOnPageIds = classes.map((cls) => cls.id);
  const allPageSelected =
    classesOnPageIds.length > 0 &&
    classesOnPageIds.every((id) => selectedClasses.includes(id));
  const partiallySelected =
    !allPageSelected &&
    classesOnPageIds.some((id) => selectedClasses.includes(id));

  // --- Mutation handlers ---

  const handleEditSubmit = async (
    editForm: EditFormState,
    editingClass: ClassData,
  ) => {
    if (!editForm.name.trim()) {
      toast({
        title: "Ad tələb olunur",
        description: "Sinif adı boş ola bilməz.",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.class_level) {
      toast({
        title: "Sinif səviyyəsi tələb olunur",
        description: "Zəhmət olmasa sinif səviyyəsini seçin.",
        variant: "destructive",
      });
      return;
    }

    const classLevelValue = parseInt(editForm.class_level, 10);
    if (Number.isNaN(classLevelValue)) {
      toast({
        title: "Yanlış səviyyə",
        description: "Sinif səviyyəsi düzgün seçilməyib.",
        variant: "destructive",
      });
      return;
    }

    const payload: UpdateClassPayload = {
      name: editForm.name.trim(),
      class_level: classLevelValue,
      specialty: editForm.specialty.trim() || null,
      class_type: editForm.class_type.trim() || null,
      class_profile: editForm.class_profile.trim() || null,
      education_program: editForm.education_program || "umumi",
      teaching_shift: editForm.teaching_shift.trim() || null,
      teaching_week: editForm.teaching_week.trim() || null,
      is_active: editForm.is_active,
    };

    if (editForm.student_count) {
      const parsed = parseInt(editForm.student_count, 10);
      if (!Number.isNaN(parsed)) {
        payload.student_count = parsed;
      }
    }

    setIsSaving(true);
    try {
      await regionAdminClassService.updateClass(editingClass.id, payload);
      toast({
        title: "Sinif yeniləndi",
        description: `${payload.name || editingClass.name} məlumatları uğurla yeniləndi.`,
      });
      onEditSuccess();
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message =
        err?.response?.data?.message || err?.message || "Sinif yenilənmədi";
      toast({
        title: "Xəta",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async (target: ClassData) => {
    setIsDeleting(true);
    const classLabelBase =
      `${target.class_level ?? ""}${target.name ?? ""}`.trim();
    const classLabel = classLabelBase || target.name || "Sinif";
    try {
      await regionAdminClassService.deleteClass(target.id);
      toast({
        title: "Sinif silindi",
        description: `${classLabel} sinifi silindi.`,
      });
      setSelectedClasses((prev) => prev.filter((id) => id !== target.id));
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Sinif silinə bilmədi";
      toast({
        title: "Xəta",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleConfirmBulkDelete = async (selectedIds: number[]) => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await regionAdminClassService.bulkDeleteClasses(selectedIds);
      toast({
        title: "Seçilən siniflər silindi",
        description: `${selectedIds.length} sinif siyahıdan silindi.`,
      });
      setSelectedClasses([]);
      setIsBulkDeleteDialogOpen(false);
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Siniflər silinə bilmədi";
      toast({
        title: "Xəta",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response =
        await regionAdminClassService.exportClasses(filterParams);

      const blob = response instanceof Blob ? response : (response as { data?: Blob })?.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("İxrac üçün fayl yaradıla bilmədi");
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sinifler-eksport-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "İxrac hazırdır",
        description: "Sinif siyahısı uğurla yükləndi.",
      });
    } catch (error) {
      toast({
        title: "İxrac zamanı xəta",
        description:
          error instanceof Error
            ? error.message
            : "Fayl hazırlanmadı. Yenidən cəhd edin.",
        variant: "destructive",
      });
    }
  };

  // --- Statistics ---
  const stats = statistics?.data;
  const statsUnavailable =
    statsLoading || (isSuperAdmin && waitingForRegionSelection);

  return {
    // Region
    regionOptions,
    regionsLoading,

    // Classes data
    classesData,
    classes,
    rawClasses,
    totalItems,
    totalPages,
    currentPage,
    classesLoading,
    isFetching,
    classesErrorMessage,
    waitingForRegionSelection,
    refetch,

    // Filter options
    institutions,
    academicYears,

    // Statistics
    stats,
    statsUnavailable,

    // Selection computed
    classesOnPageIds,
    allPageSelected,
    partiallySelected,

    // Mutation handlers
    handleEditSubmit,
    handleConfirmDelete,
    handleConfirmBulkDelete,
    handleExport,
  };
};
