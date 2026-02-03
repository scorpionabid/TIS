import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherVerificationService, TeacherVerification, VerificationStatistics } from "@/services/teacherVerification";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  User,
  Mail,
  Building,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";

export function TeacherVerification() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherVerification | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Get pending verifications
  const { data: verificationData, isLoading, error } = useQuery({
    queryKey: ["teacher-verifications"],
    queryFn: () => teacherVerificationService.getPendingVerifications(),
  });

  // Approve teacher mutation
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

  // Reject teacher mutation
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Təsdiqləndi</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rədd Edildi</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Gözləmədə</Badge>;
    }
  };

  const filteredTeachers = verificationData?.data?.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.institution.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gözləmədə</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {verificationData.statistics.total_pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Təsdiqləndi</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {verificationData.statistics.total_approved}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rədd Edildi</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {verificationData.statistics.total_rejected}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Müəllim Məlumatlarının Təsdiqi</CardTitle>
          <CardDescription>
            Sektorunuza aid məktəblərin müəllim məlumatlarını yoxlayın və təsdiq edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Müəllim axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8">Yüklənir...</div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Axtarışa uyğun nəticə tapılmadı" : "Təsdiq üçün gözləyən müəllim yoxdur"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müəllim</TableHead>
                  <TableHead>E-poçt</TableHead>
                  <TableHead>Məktəb</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Yaradılma Tarixi</TableHead>
                  <TableHead>Əməliyyatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{teacher.name}</div>
                          <div className="text-sm text-muted-foreground">@{teacher.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{teacher.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span>{teacher.institution.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(teacher.verification_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{formatDistanceToNow(new Date(teacher.created_at), { addSuffix: true, locale: az })}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {teacher.verification_status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(teacher)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Təsdiqlə
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(teacher)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rədd Et
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müəllim Məlumatlarını Təsdiqlə</DialogTitle>
            <DialogDescription>
              {selectedTeacher?.name} adlı müəllimin məlumatlarını təsdiqləmək istədiyinizə əminsiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTeacher && (
              <div className="space-y-2">
                <div><strong>Müəllim:</strong> {selectedTeacher.name}</div>
                <div><strong>E-poçt:</strong> {selectedTeacher.email}</div>
                <div><strong>Məktəb:</strong> {selectedTeacher.institution.name}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Ləğv Et
            </Button>
            <Button onClick={confirmApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Təsdiqlənir..." : "Təsdiqlə"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müəllim Məlumatlarını Rədd Et</DialogTitle>
            <DialogDescription>
              {selectedTeacher?.name} adlı müəllimin məlumatlarını rədd etmək üçün səbəb qeyd edin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTeacher && (
              <div className="space-y-2">
                <div><strong>Müəllim:</strong> {selectedTeacher.name}</div>
                <div><strong>E-poçt:</strong> {selectedTeacher.email}</div>
                <div><strong>Məktəb:</strong> {selectedTeacher.institution.name}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rədd Etmə Səbəbi</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Rədd etmə səbəbini qeyd edin..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Ləğv Et
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? "Rədd edilir..." : "Rədd Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
