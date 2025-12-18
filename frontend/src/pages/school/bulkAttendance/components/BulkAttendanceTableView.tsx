import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StickyNote, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ClassWithAttendance } from "@/services/bulkAttendance";
import {
  AttendanceFormData,
  AttendanceSession,
  ServerErrorMap,
} from "../types";

interface TableViewProps {
  session: AttendanceSession;
  classes: ClassWithAttendance[];
  attendanceData: AttendanceFormData;
  updateAttendance: (
    gradeId: number,
    field: keyof AttendanceFormData[string],
    value: number | string
  ) => void;
  errors: Record<string, string>;
  serverErrors?: ServerErrorMap;
  getAttendanceRate: (present: number, total: number) => number;
}

const BulkAttendanceTableView: React.FC<TableViewProps> = ({
  session,
  classes,
  attendanceData,
  updateAttendance,
  errors,
  serverErrors = {},
  getAttendanceRate,
}) => {
  const [notePopoverOpen, setNotePopoverOpen] = useState<number | null>(null);

  const toSafeNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const summary = useMemo(() => {
    return classes.reduce(
      (acc, cls) => {
        const data = attendanceData[cls.id];
        if (!data || cls.total_students === 0) return acc;

        const excused = toSafeNumber(data[`${session}_excused`]);
        const unexcused = toSafeNumber(data[`${session}_unexcused`]);
        const present = Math.max(
          0,
          cls.total_students - (excused + unexcused)
        );

        acc.totalStudents += cls.total_students;
        acc.totalPresent += present;
        acc.totalExcused += excused;
        acc.totalUnexcused += unexcused;
        acc.classesCompleted +=
          present + excused + unexcused === cls.total_students ? 1 : 0;

        return acc;
      },
      {
        totalStudents: 0,
        totalPresent: 0,
        totalExcused: 0,
        totalUnexcused: 0,
        classesCompleted: 0,
      }
    );
  }, [attendanceData, classes, session]);

  const overallRate =
    summary.totalStudents > 0
      ? Math.round((summary.totalPresent / summary.totalStudents) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-20 text-center">Səviyyə</TableHead>
              <TableHead className="min-w-[100px]">Sinif</TableHead>
              <TableHead className="w-16 text-center">Say</TableHead>
              <TableHead className="w-24 text-center">🟢 Dərsdə</TableHead>
              <TableHead className="w-24 text-center">🟡 Üzürlü</TableHead>
              <TableHead className="w-24 text-center">🔴 Üzürsüz</TableHead>
              <TableHead className="w-28 text-center">Davamiyyət</TableHead>
              <TableHead className="w-20 text-center">Qeyd</TableHead>
              <TableHead className="w-16 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls, index) => {
              const data = attendanceData[cls.id];
              if (!data) return null;

              const excused = toSafeNumber(data[`${session}_excused`]);
              const unexcused = toSafeNumber(data[`${session}_unexcused`]);
              const present = Math.max(
                0,
                cls.total_students - (excused + unexcused)
              );
              const sessionTotal = present + excused + unexcused;
              const attendanceRate = getAttendanceRate(
                present,
                cls.total_students
              );
              const hasError = errors[`${cls.id}_${session}`];
              const serverError = serverErrors[cls.id];
              const rowHasError = Boolean(hasError || serverError);
              const isRecorded = cls.attendance?.[`${session}_recorded_at`];
              const hasStudentCount = cls.total_students > 0;
              const isMismatch =
                hasStudentCount && sessionTotal !== cls.total_students;

              const statusColor = !hasStudentCount
                ? "text-yellow-500"
                : rowHasError
                ? "text-red-500"
                : isMismatch
                ? "text-orange-500"
                : isRecorded
                ? "text-green-500"
                : "text-gray-400";

              const statusIcon = !hasStudentCount ? (
                <AlertCircle className="h-4 w-4" />
              ) : rowHasError ? (
                <AlertCircle className="h-4 w-4" />
              ) : isRecorded ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              );

              return (
                <TableRow
                  key={cls.id}
                  className={`${
                    rowHasError
                      ? "bg-red-50"
                      : isMismatch
                      ? "bg-orange-50"
                      : ""
                  } hover:bg-gray-50`}
                >
                  <TableCell className="text-center font-medium text-gray-500">
                    {index + 1}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-semibold">
                      {cls.level || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{cls.name}</div>
                    {cls.homeroom_teacher && (
                      <div className="text-xs text-gray-500">
                        {cls.homeroom_teacher.name}
                      </div>
                    )}
                    {serverError && (
                      <div className="text-xs text-red-600 mt-1">
                        {serverError.reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {cls.total_students}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-green-600">
                    {hasStudentCount ? present : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min="0"
                      max={cls.total_students}
                      value={excused}
                      onChange={(e) =>
                        updateAttendance(
                          cls.id,
                          `${session}_excused`,
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-16 h-8 text-center"
                      disabled={!hasStudentCount}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min="0"
                      max={cls.total_students}
                      value={unexcused}
                      onChange={(e) =>
                        updateAttendance(
                          cls.id,
                          `${session}_unexcused`,
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-16 h-8 text-center"
                      disabled={!hasStudentCount}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        attendanceRate >= 95
                          ? "default"
                          : attendanceRate >= 85
                          ? "secondary"
                          : "destructive"
                      }
                      className="font-medium"
                    >
                      {attendanceRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Popover
                      open={notePopoverOpen === cls.id}
                      onOpenChange={(open) =>
                        setNotePopoverOpen(open ? cls.id : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant={
                            data[`${session}_notes`] ? "default" : "ghost"
                          }
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">
                            Qeydlər - {cls.name}
                          </h4>
                          <Textarea
                            value={data[`${session}_notes`]}
                            onChange={(e) =>
                              updateAttendance(
                                cls.id,
                                `${session}_notes`,
                                e.target.value
                              )
                            }
                            placeholder={`${
                              session === "morning" ? "Səhər" : "Axşam"
                            } sessiyası üçün qeydlər...`}
                            rows={3}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className={`text-center ${statusColor}`}>
                    {statusIcon}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {summary.totalStudents}
              </div>
              <div className="text-sm text-gray-600">Ümumi Şagird</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.totalPresent}
              </div>
              <div className="text-sm text-gray-600">Dərsdə</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.totalExcused}
              </div>
              <div className="text-sm text-gray-600">Üzürlü</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.totalUnexcused}
              </div>
              <div className="text-sm text-gray-600">Üzürsüz</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {overallRate}%
              </div>
              <div className="text-sm text-gray-600">
                Ümumi Davamiyyət
                <span className="text-xs">
                  ({summary.classesCompleted}/{classes.length} tamamlandı)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkAttendanceTableView;
