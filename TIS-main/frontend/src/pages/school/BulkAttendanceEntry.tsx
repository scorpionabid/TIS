import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  School,
  Calendar,
  CheckSquare,
  Download,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import useBulkAttendanceEntry from "./bulkAttendance/hooks/useBulkAttendanceEntry";
import useMediaQuery from "./bulkAttendance/hooks/useMediaQuery";
import BulkAttendanceMobileView from "./bulkAttendance/components/BulkAttendanceMobileView";
import { AttendanceSession } from "./bulkAttendance/types";
import ModernSessionTabs from "./bulkAttendance/components/ModernSessionTabs";
import ModernTableView from "./bulkAttendance/components/ModernTableView";
import ModernSummaryStrip from "./bulkAttendance/components/ModernSummaryStrip";

type PendingAction =
  | { type: "change-date"; value: string }
  | { type: "refresh" };

const BulkAttendanceEntry: React.FC = () => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { currentUser } = useAuth();
  const schoolName = currentUser?.institution?.name || currentUser?.region?.name || "";
  const {
    state: {
      selectedDate,
      activeSession,
      attendanceData,
      errors,
      lastSaveResult,
      serverErrors,
      isExporting,
      classes,
      classesData,
      isLoading,
      error,
      dirtySessions,
    },
    saveAttendanceMutation,
    setSelectedDate,
    handleSessionChange,
    handleSaveSession,
    handleExportData,
    handleMarkAllPresent,
    updateAttendance,
    getAttendanceRate,
    refetchClasses,
    saveDirtySessions,
  } = useBulkAttendanceEntry();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);

  const hasDirtySessions = dirtySessions.morning || dirtySessions.evening;
  const totalFetchedClasses = classesData?.data.classes?.length ?? 0;
  const hiddenClasses = Math.max(totalFetchedClasses - classes.length, 0);
  const savingSession = saveAttendanceMutation.variables?.session ?? null;

  const requestProtectedAction = (action: PendingAction) => {
    if (!hasDirtySessions) {
      executePendingAction(action);
      return;
    }
    setPendingAction(action);
    setShowUnsavedDialog(true);
  };

  const executePendingAction = (action: PendingAction | null) => {
    if (!action) return;
    if (action.type === "change-date" && action.value) {
      setSelectedDate(action.value);
    } else if (action.type === "refresh") {
      refetchClasses();
    }
    setPendingAction(null);
  };

  const handleDateInputChange = (value: string) => {
    if (!value || value === selectedDate) {
      setSelectedDate(value);
      return;
    }
    requestProtectedAction({ type: "change-date", value });
  };

  const handleRefreshClick = () => {
    requestProtectedAction({ type: "refresh" });
  };

  const handleUnsavedConfirm = async () => {
    setDialogSaving(true);
    const saved = await saveDirtySessions();
    setDialogSaving(false);
    if (!saved) {
      return;
    }
    setShowUnsavedDialog(false);
    executePendingAction(pendingAction);
  };

  const handleUnsavedClose = () => {
    if (dialogSaving) {
      return;
    }
    setShowUnsavedDialog(false);
    setPendingAction(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      return;
    }
    handleUnsavedClose();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Sinif məlumatları yüklənir...</span>
        </div>
      </div>
    );
  }

  if (error || !classesData?.success) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Sinif məlumatları yüklənərkən səhv baş verdi. Səhifəni yenidən
          yükləyin.
        </AlertDescription>
      </Alert>
    );
  }

  const toSafeNumber = (value: unknown): number => {
    if (value === undefined || value === null) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const summary = () => {
    return classes.reduce(
      (acc, cls) => {
        const data = attendanceData[cls.id];
        if (!data || cls.total_students === 0) return acc;

        const morningExcused = toSafeNumber(data.morning_excused);
        const morningUnexcused = toSafeNumber(data.morning_unexcused);
        const eveningExcused = toSafeNumber(data.evening_excused);
        const eveningUnexcused = toSafeNumber(data.evening_unexcused);

        const morningPresent = Math.max(0, cls.total_students - (morningExcused + morningUnexcused));
        const eveningPresent = Math.max(0, cls.total_students - (eveningExcused + eveningUnexcused));
        const sessionExcused = activeSession === 'morning' ? morningExcused : eveningExcused;
        const sessionUnexcused = activeSession === 'morning' ? morningUnexcused : eveningUnexcused;
        const sessionPresent = activeSession === 'morning' ? morningPresent : eveningPresent;

        acc.totalStudents += cls.total_students;
        acc.totalPresent += sessionPresent;
        acc.totalExcused += sessionExcused;
        acc.totalUnexcused += sessionUnexcused;
        acc.classesCompleted += sessionPresent + sessionExcused + sessionUnexcused === cls.total_students ? 1 : 0;
        acc.totalStudentSessions += cls.total_students * 2;
        acc.totalPresentSessions += morningPresent + eveningPresent;
        acc.totalUniformViolation += toSafeNumber(data.uniform_violation);

        return acc;
      },
      {
        totalStudents: 0,
        totalPresent: 0,
        totalExcused: 0,
        totalUnexcused: 0,
        classesCompleted: 0,
        totalStudentSessions: 0,
        totalPresentSessions: 0,
        totalUniformViolation: 0,
      }
    );
  };

  const calculatedSummary = summary();

  const sessionRate = calculatedSummary.totalStudents > 0
    ? Math.round((calculatedSummary.totalPresent / calculatedSummary.totalStudents) * 100)
    : 0;

  const uniformComplianceRate = calculatedSummary.totalPresent > 0
    ? Math.round((1 - calculatedSummary.totalUniformViolation / calculatedSummary.totalPresent) * 100)
    : 0;

  const overallDailyRate = calculatedSummary.totalStudentSessions > 0
    ? Math.round((calculatedSummary.totalPresentSessions / calculatedSummary.totalStudentSessions) * 100)
    : 0;

  const renderSaveStatus = () => {
    if (!lastSaveResult || lastSaveResult.status === "idle") {
      return null;
    }

    const timeLabel = lastSaveResult.timestamp
      ? new Date(lastSaveResult.timestamp).toLocaleTimeString("az-AZ", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    let icon = Loader2;
    let color = "text-gray-600";

    if (lastSaveResult.status === "success") {
      icon = CheckCircle;
      color = "text-green-600";
    } else if (lastSaveResult.status === "error") {
      icon = AlertCircle;
      color = "text-red-600";
    }

    const modeLabel =
      lastSaveResult.mode === "auto" && lastSaveResult.status !== "saving"
        ? " (Avtomatik)"
        : "";
    const sessionLabel =
      lastSaveResult.session === "morning"
        ? "İlk dərs"
        : lastSaveResult.session === "evening"
          ? "Son dərs"
          : "";

    const IconComponent = icon;

    return (
      <div className={`flex items-center text-sm ${color}`}>
        <IconComponent
          className={`h-4 w-4 mr-2 ${
            lastSaveResult.status === "saving" ? "animate-spin" : ""
          }`}
        />
        <span>
          {lastSaveResult.message || "Status yeniləndi"}
          {timeLabel ? ` · ${timeLabel}` : ""}
          {modeLabel}
          {sessionLabel ? ` · ${sessionLabel}` : ""}
        </span>
      </div>
    );
  };

  const renderDirtyIndicators = () => {
    const activeBadges = [];
    if (dirtySessions.morning) {
      activeBadges.push("İlk dərs saxlanılmayıb");
    }
    if (dirtySessions.evening) {
      activeBadges.push("Son dərs saxlanılmayıb");
    }

    if (!activeBadges.length) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {activeBadges.map((label) => (
          <Badge
            key={label}
            variant="outline"
            className="border-yellow-400 text-yellow-700"
          >
            {label}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {hiddenClasses > 0 && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {hiddenClasses} sinif siyahıdan çıxarıldı (sistemdə artıq mövcud
            deyil).
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions Toolbar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">
                Sürətli əməliyyatlar
              </span>
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span>Hamısını dərsdə işarələ</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => handleMarkAllPresent("morning")}
                    >
                      İlk dərs üçün işarələ
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMarkAllPresent("evening")}
                    >
                      Son dərs üçün işarələ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>{isExporting ? "Endirilir..." : "Export"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshClick}
                  data-testid="bulk-attendance-refresh"
                >
                  Yenilə
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <Users className="inline h-4 w-4 mr-1" />
                <span className="font-medium">{classes.length}</span> aktiv sinif
                {hiddenClasses > 0 && (
                  <span className="text-xs text-amber-600 ml-2">
                    ({hiddenClasses} sinif siyahıdan çıxarıldı)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-md border border-gray-200">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  className="w-32 border-0 p-0 h-auto focus-visible:ring-0"
                  data-testid="bulk-attendance-date"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Tabs */}
      <ModernSessionTabs
        activeSession={activeSession}
        onSessionChange={handleSessionChange}
        morningHasData={classes.some((cls) => attendanceData[cls.id]?.morning_present !== undefined)}
        eveningHasData={classes.some((cls) => attendanceData[cls.id]?.evening_present !== undefined)}
        morningDirty={dirtySessions.morning}
        eveningDirty={dirtySessions.evening}
      />

      {/* Table View - Desktop */}
      {isDesktop ? (
        <ModernTableView
          session={activeSession}
          classes={classes}
          attendanceData={attendanceData}
          updateAttendance={updateAttendance}
          errors={errors}
          serverErrors={serverErrors}
          getAttendanceRate={getAttendanceRate}
        />
      ) : (
        <BulkAttendanceMobileView
          session={activeSession}
          classes={classes}
          attendanceData={attendanceData}
          updateAttendance={updateAttendance}
          errors={errors}
          serverErrors={serverErrors}
          getAttendanceRate={getAttendanceRate}
        />
      )}

      {/* Modern Summary Strip - Statistika siniflerden sonra */}
      <ModernSummaryStrip
        classCount={classes.length}
        totalStudents={calculatedSummary.totalStudents}
        totalPresent={calculatedSummary.totalPresent}
        totalExcused={calculatedSummary.totalExcused}
        totalUnexcused={calculatedSummary.totalUnexcused}
        uniformViolationTotal={calculatedSummary.totalUniformViolation}
        uniformComplianceRate={uniformComplianceRate}
        sessionRate={sessionRate}
        overallDailyRate={overallDailyRate}
        classesCompleted={calculatedSummary.classesCompleted}
        totalClasses={classes.length}
        sessionLabel={activeSession === 'morning' ? 'İlk dərs' : 'Son dərs'}
      />

      {/* Modern Footer Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          {renderSaveStatus()}
          {renderDirtyIndicators()}
        </div>
        <div className="flex justify-center gap-4 flex-wrap">
          <Button
            onClick={() => handleSaveSession("morning")}
            disabled={saveAttendanceMutation.isPending}
            className="flex items-center justify-center gap-2"
            data-testid="bulk-attendance-save-morning"
          >
            {saveAttendanceMutation.isPending && savingSession === "morning" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="mr-1">💾</span>
            )}
            İlk dərsi saxla
          </Button>
          <Button
            onClick={() => handleSaveSession("evening")}
            disabled={saveAttendanceMutation.isPending}
            className="flex items-center justify-center gap-2"
            data-testid="bulk-attendance-save-evening"
          >
            {saveAttendanceMutation.isPending && savingSession === "evening" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="mr-1">✅</span>
            )}
            Son dərsi saxla
          </Button>
        </div>
      </div>

      <AlertDialog
        open={showUnsavedDialog}
        onOpenChange={handleDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saxlanılmamış dəyişikliklər var</AlertDialogTitle>
            <AlertDialogDescription>
              Davam etməzdən əvvəl mövcud sessiya məlumatlarını saxlayaq?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dialogSaving}>
              Ləğv et
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={handleUnsavedConfirm} disabled={dialogSaving}>
                {dialogSaving && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                İndi saxla
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BulkAttendanceEntry;
