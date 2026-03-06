import { useState, useMemo, useCallback } from "react";
import { type CheckedState } from "@radix-ui/react-checkbox";
import { ClassData } from "@/services/regionadmin/classes";
import {
  type EditFormState,
  type SortColumn,
  type SortDirection,
  type ActiveTab,
  defaultEditFormState,
} from "./types";

export const useClassManagementState = () => {
  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("classes");

  // Import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Selection
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    ...defaultEditFormState,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ClassData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Region (SuperAdmin)
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState<string>("all");
  const [classLevelFilter, setClassLevelFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // --- Handlers ---

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setInstitutionFilter("all");
    setClassLevelFilter("all");
    setAcademicYearFilter("all");
    setStatusFilter("all");
    setPage(1);
  }, []);

  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(column as SortColumn);
        setSortDirection("asc");
      }
    },
    [sortColumn],
  );

  const handleSelectRow = useCallback((id: number) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleSelectAllOnPage = useCallback(
    (checked: CheckedState, classesOnPageIds: number[]) => {
      const shouldSelect = checked === true || checked === "indeterminate";
      if (shouldSelect) {
        setSelectedClasses((prev) => {
          const combined = new Set(prev);
          classesOnPageIds.forEach((id) => combined.add(id));
          return Array.from(combined);
        });
      } else {
        setSelectedClasses((prev) =>
          prev.filter((id) => !classesOnPageIds.includes(id)),
        );
      }
    },
    [],
  );

  const handleClearSelection = useCallback(() => setSelectedClasses([]), []);

  const openEditDialog = useCallback((cls: ClassData) => {
    setEditingClass(cls);
    setEditForm({
      name: cls.name || "",
      class_level:
        cls.class_level !== undefined && cls.class_level !== null
          ? String(cls.class_level)
          : "",
      specialty: cls.specialty || "",
      class_type: cls.class_type || "",
      class_profile: cls.class_profile || "",
      education_program: cls.education_program || "umumi",
      teaching_shift: cls.teaching_shift || "",
      teaching_week: cls.teaching_week || "",
      student_count:
        cls.student_count !== undefined && cls.student_count !== null
          ? String(cls.student_count)
          : "",
      is_active: !!cls.is_active,
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    if (isSaving) return;
    setIsEditDialogOpen(false);
    setEditingClass(null);
    setEditForm({ ...defaultEditFormState });
  }, [isSaving]);

  const openDeleteDialog = useCallback((cls: ClassData) => {
    setDeleteTarget(cls);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (!isDeleting) setDeleteTarget(null);
  }, [isDeleting]);

  const openBulkDeleteDialog = useCallback(() => {
    setIsBulkDeleteDialogOpen(true);
  }, []);

  const closeBulkDeleteDialog = useCallback(() => {
    if (!isBulkDeleting) setIsBulkDeleteDialogOpen(false);
  }, [isBulkDeleting]);

  const setInstitutionFilterAndReset = useCallback((value: string) => {
    setInstitutionFilter(value);
    setPage(1);
  }, []);

  const setClassLevelFilterAndReset = useCallback((value: string) => {
    setClassLevelFilter(value);
    setPage(1);
  }, []);

  const setAcademicYearFilterAndReset = useCallback((value: string) => {
    setAcademicYearFilter(value);
    setPage(1);
  }, []);

  const setStatusFilterAndReset = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const setRegionIdAndReset = useCallback((value: number | null) => {
    setSelectedRegionId(value);
    setPage(1);
  }, []);

  // --- Derived state ---

  const hasActiveFilters = useMemo(() => {
    return !!(
      searchTerm ||
      institutionFilter !== "all" ||
      classLevelFilter !== "all" ||
      academicYearFilter !== "all" ||
      statusFilter !== "all"
    );
  }, [searchTerm, institutionFilter, classLevelFilter, academicYearFilter, statusFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (institutionFilter !== "all") count++;
    if (classLevelFilter !== "all") count++;
    if (academicYearFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    return count;
  }, [searchTerm, institutionFilter, classLevelFilter, academicYearFilter, statusFilter]);

  return {
    // Tab
    activeTab,
    setActiveTab,

    // Import modal
    isImportModalOpen,
    setIsImportModalOpen,

    // Selection
    selectedClasses,
    setSelectedClasses,

    // Edit dialog
    isEditDialogOpen,
    editingClass,
    editForm,
    setEditForm,
    isSaving,
    setIsSaving,

    // Delete
    deleteTarget,
    isDeleting,
    setIsDeleting,
    isBulkDeleteDialogOpen,
    setIsBulkDeleteDialogOpen,
    isBulkDeleting,
    setIsBulkDeleting,

    // Region
    selectedRegionId,
    setSelectedRegionId,

    // Filters
    searchTerm,
    institutionFilter,
    classLevelFilter,
    academicYearFilter,
    statusFilter,

    // Pagination
    page,
    setPage,
    perPage,
    setPerPage,

    // Sorting
    sortColumn,
    sortDirection,

    // Handlers
    handleSearchChange,
    handleClearFilters,
    handleSort,
    handleSelectRow,
    handleSelectAllOnPage,
    handleClearSelection,
    openEditDialog,
    handleCloseEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    openBulkDeleteDialog,
    closeBulkDeleteDialog,
    setInstitutionFilterAndReset,
    setClassLevelFilterAndReset,
    setAcademicYearFilterAndReset,
    setStatusFilterAndReset,
    setRegionIdAndReset,

    // Derived
    hasActiveFilters,
    activeFilterCount,
  };
};
