import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherVerificationService, TeacherVerification, FilterParams } from "@/services/teacherVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Import components
import { TeacherVerificationFilter } from "./TeacherVerificationFilter";
import { TeacherVerificationStats } from "./TeacherVerificationStats";
import { TeacherVerificationTable } from "./TeacherVerificationTable";
import { TeacherVerificationDialogs } from "./TeacherVerificationDialogs";
import { Pagination } from "./Pagination";

export function TeacherVerification() {
  const [filters, setFilters] = useState<FilterParams>({
    status: 'all',
    institution_id: 'all',
    search: '',
    page: 1,
    per_page: 20,
  });
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherVerification | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isBulkApproveDialogOpen, setIsBulkApproveDialogOpen] = useState(false);
  const [isBulkRejectDialogOpen, setIsBulkRejectDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Get teacher verifications with filters
  const { data: verificationData, isLoading, error } = useQuery({
    queryKey: ["teacher-verifications", filters],
    queryFn: () => teacherVerificationService.getTeacherVerifications(filters),
  });

  // Get sector schools for filter
  const { data: schools } = useQuery({
    queryKey: ["sector-schools"],
    queryFn: () => teacherVerificationService.getSectorSchools(),
  });

  // Single approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ teacherId, verifiedData }: { teacherId: number; verifiedData?: any }) =>
      teacherVerificationService.approveTeacher(teacherId, verifiedData),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["teacher-verifications"] });
      setIsApproveDialogOpen(false);
      setSelectedTeacher(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Təsdiqləmə zamanı xəta baş verdi");
    },
  });

  // Single reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ teacherId, rejectionReason }: { teacherId: number; rejectionReason: string }) =>
      teacherVerificationService.rejectTeacher(teacherId, rejectionReason),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["teacher-verifications"] });
      setIsRejectDialogOpen(false);
      setSelectedTeacher(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Rədd etmə zamanı xəta baş verdi");
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: (teacherIds: number[]) =>
      teacherVerificationService.bulkApproveTeachers(teacherIds),
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.errors.length > 0) {
        data.errors.forEach(error => toast.error(error));
      }
      queryClient.invalidateQueries({ queryKey: ["teacher-verifications"] });
      setIsBulkApproveDialogOpen(false);
      setSelectedTeachers([]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Kütləvi təsdiqləmə zamanı xəta baş verdi");
    },
  });

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: ({ teacherIds, reason }: { teacherIds: number[], reason: string }) =>
      teacherVerificationService.bulkRejectTeachers(teacherIds, reason),
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.errors.length > 0) {
        data.errors.forEach(error => toast.error(error));
      }
      queryClient.invalidateQueries({ queryKey: ["teacher-verifications"] });
      setIsBulkRejectDialogOpen(false);
      setSelectedTeachers([]);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Kütləvi rədd etmə zamanı xəta baş verdi");
    },
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const handleApprove = (teacher: TeacherVerification) => {
    setSelectedTeacher(teacher);
    setIsApproveDialogOpen(true);
  };

  const handleReject = (teacher: TeacherVerification) => {
    setSelectedTeacher(teacher);
    setIsRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedTeacher) {
      approveMutation.mutate({
        teacherId: selectedTeacher.id,
        verifiedData: {
          verified_at: new Date().toISOString(),
          verified_fields: ["name", "email", "institution"],
        },
      });
    }
  };

  const confirmReject = () => {
    if (selectedTeacher && rejectionReason.trim()) {
      rejectMutation.mutate({
        teacherId: selectedTeacher.id,
        rejectionReason: rejectionReason.trim(),
      });
    }
  };

  const confirmBulkApprove = () => {
    if (selectedTeachers.length > 0) {
      bulkApproveMutation.mutate(selectedTeachers);
    }
  };

  const confirmBulkReject = () => {
    if (selectedTeachers.length > 0 && rejectionReason.trim()) {
      bulkRejectMutation.mutate({
        teacherIds: selectedTeachers,
        reason: rejectionReason.trim(),
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTeachers(verificationData?.data?.map(t => t.id) || []);
    } else {
      setSelectedTeachers([]);
    }
  };

  const handleSelectTeacher = (teacherId: number, checked: boolean) => {
    if (checked) {
      setSelectedTeachers(prev => [...prev, teacherId]);
    } else {
      setSelectedTeachers(prev => prev.filter(id => id !== teacherId));
    }
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Məlumatlar yüklənərkən xəta baş verdi</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {verificationData?.statistics && (
        <TeacherVerificationStats statistics={verificationData.statistics} />
      )}

      {/* Filter Panel */}
      <Card>
        <CardHeader>
          <CardContent className="p-0">
            <TeacherVerificationFilter
              filters={filters}
              setFilters={setFilters}
              selectedCount={selectedTeachers.length}
              onBulkApprove={() => setIsBulkApproveDialogOpen(true)}
              onBulkReject={() => setIsBulkRejectDialogOpen(true)}
              schools={schools || []}
            />
          </CardContent>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Müəllim Məlumatlarının Təsdiqi</CardTitle>
          <CardDescription>
            Sektorunuza aid məktəblərin müəllim məlumatlarını yoxlayın və təsdiq edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeacherVerificationTable
            teachers={verificationData?.data || []}
            selectedTeachers={selectedTeachers}
            onSelectAll={handleSelectAll}
            onSelectTeacher={handleSelectTeacher}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={isLoading}
            approvePending={approveMutation.isPending}
            rejectPending={rejectMutation.isPending}
          />

          {/* Pagination */}
          {verificationData?.pagination && (
            <Pagination
              currentPage={verificationData.pagination.current_page}
              lastPage={verificationData.pagination.last_page}
              total={verificationData.pagination.total}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TeacherVerificationDialogs
        selectedTeacher={selectedTeacher}
        isApproveDialogOpen={isApproveDialogOpen}
        isRejectDialogOpen={isRejectDialogOpen}
        isBulkApproveDialogOpen={isBulkApproveDialogOpen}
        isBulkRejectDialogOpen={isBulkRejectDialogOpen}
        selectedCount={selectedTeachers.length}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        setIsApproveDialogOpen={setIsApproveDialogOpen}
        setIsRejectDialogOpen={setIsRejectDialogOpen}
        setIsBulkApproveDialogOpen={setIsBulkApproveDialogOpen}
        setIsBulkRejectDialogOpen={setIsBulkRejectDialogOpen}
        onConfirmApprove={confirmApprove}
        onConfirmReject={confirmReject}
        onConfirmBulkApprove={confirmBulkApprove}
        onConfirmBulkReject={confirmBulkReject}
        approvePending={approveMutation.isPending}
        rejectPending={rejectMutation.isPending}
        bulkApprovePending={bulkApproveMutation.isPending}
        bulkRejectPending={bulkRejectMutation.isPending}
      />
    </div>
  );
}
