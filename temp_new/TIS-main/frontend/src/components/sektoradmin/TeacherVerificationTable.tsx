import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  User,
  Mail,
  Building,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { TeacherVerification as TeacherVerificationType } from "@/services/teacherVerification";

interface TeacherVerificationTableProps {
  teachers: TeacherVerificationType[];
  selectedTeachers: number[];
  onSelectAll: (checked: boolean) => void;
  onSelectTeacher: (teacherId: number, checked: boolean) => void;
  onApprove: (teacher: TeacherVerificationType) => void;
  onReject: (teacher: TeacherVerificationType) => void;
  isLoading?: boolean;
  approvePending?: boolean;
  rejectPending?: boolean;
}

export function TeacherVerificationTable({
  teachers,
  selectedTeachers,
  onSelectAll,
  onSelectTeacher,
  onApprove,
  onReject,
  isLoading = false,
  approvePending = false,
  rejectPending = false,
}: TeacherVerificationTableProps) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedTeachers.length === teachers.length && teachers.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Müəllim</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Müəssisə</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tarix</TableHead>
            <TableHead className="text-right">Əməliyyatlar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id}>
              <TableCell>
                <Checkbox
                  checked={selectedTeachers.includes(teacher.id)}
                  onCheckedChange={(checked) => onSelectTeacher(teacher.id, checked as boolean)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{teacher.name}</div>
                    <div className="text-sm text-gray-500">@{teacher.username}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{teacher.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>{teacher.institution.name}</span>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(teacher.verification_status)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span>
                    {teacher.verification_date
                      ? formatDistanceToNow(new Date(teacher.verification_date), {
                          addSuffix: true,
                          locale: az,
                        })
                      : formatDistanceToNow(new Date(teacher.created_at), {
                          addSuffix: true,
                          locale: az,
                        })}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  {teacher.verification_status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApprove(teacher)}
                        disabled={approvePending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Təsdiq Et
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReject(teacher)}
                        disabled={rejectPending}
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
    </div>
  );
}
