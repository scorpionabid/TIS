import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertCircle } from "lucide-react";
import { ClassWithAttendance } from "@/services/bulkAttendance";
import {
  AttendanceFormData,
  AttendanceSession,
  ServerErrorMap,
} from "../types";

interface MobileViewProps {
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

const BulkAttendanceMobileView: React.FC<MobileViewProps> = ({
  session,
  classes,
  attendanceData,
  updateAttendance,
  errors,
  serverErrors = {},
  getAttendanceRate,
}) => {
  const toSafeNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return (
    <div className="space-y-3">
      {classes.map((cls) => {
        const data = attendanceData[cls.id];
        if (!data) return null;

        const excused = toSafeNumber(data[`${session}_excused`]);
        const unexcused = toSafeNumber(data[`${session}_unexcused`]);
        const present = Math.max(0, cls.total_students - (excused + unexcused));
        const sessionTotal = present + excused + unexcused;
        const attendanceRate = getAttendanceRate(present, cls.total_students);
        const hasError = errors[`${cls.id}_${session}`];
        const serverError = serverErrors[cls.id];
        const rowHasError = Boolean(hasError || serverError);
        const isRecorded = cls.attendance?.[`${session}_recorded_at`];
        const hasStudentCount = cls.total_students > 0;
        const isMismatch =
          hasStudentCount && sessionTotal !== cls.total_students;

        return (
          <Card
            key={cls.id}
            className={`${
              rowHasError
                ? "border-red-300"
                : isMismatch
                ? "border-orange-300"
                : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {cls.level || "-"}
                  </Badge>
                  <CardTitle className="text-base">{cls.name}</CardTitle>
                  {isRecorded && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <Badge
                  variant={
                    attendanceRate >= 95
                      ? "default"
                      : attendanceRate >= 85
                      ? "secondary"
                      : "destructive"
                  }
                  className="text-sm"
                >
                  {attendanceRate}%
                </Badge>
              </div>
              {cls.homeroom_teacher && (
                <p className="text-xs text-gray-500">
                  {cls.homeroom_teacher.name}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {!hasStudentCount && (
                <Alert
                  variant="default"
                  className="border-yellow-300 bg-yellow-50"
                >
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-800">
                    Şagird sayı qeyd edilməyib
                  </AlertDescription>
                </Alert>
              )}
              {isMismatch && !hasError && (
                <Alert
                  variant="default"
                  className="border-orange-300 bg-orange-50"
                >
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-xs text-orange-800">
                    Cəmi {sessionTotal}, lakin sinif sayı {cls.total_students}
                  </AlertDescription>
                </Alert>
              )}
              {serverError && (
                <Alert variant="destructive" className="border-red-300 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-xs text-red-800">
                    {serverError.reason}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-green-700">🟢 Dərsdə</Label>
                  <div className="h-10 flex items-center justify-center rounded-md border border-green-100 bg-green-50 text-sm font-semibold text-green-700">
                    {hasStudentCount ? present : "—"}
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor={`mobile_${session}_excused_${cls.id}`}
                    className="text-xs text-yellow-700"
                  >
                    🟡 Üzürlü
                  </Label>
                  <Input
                    id={`mobile_${session}_excused_${cls.id}`}
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
                    className="h-10 text-center"
                    disabled={!hasStudentCount}
                  />
                </div>
                <div>
                  <Label
                    htmlFor={`mobile_${session}_unexcused_${cls.id}`}
                    className="text-xs text-red-700"
                  >
                    🔴 Üzürsüz
                  </Label>
                  <Input
                    id={`mobile_${session}_unexcused_${cls.id}`}
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
                    className="h-10 text-center"
                    disabled={!hasStudentCount}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-600 text-center">
                Ümumi: {cls.total_students} | Qeyd edilmiş: {sessionTotal}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BulkAttendanceMobileView;
