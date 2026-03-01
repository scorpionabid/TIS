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
} from "lucide-react";
import useBulkAttendanceEntry from "./bulkAttendance/hooks/useBulkAttendanceEntry";
import useMediaQuery from "./bulkAttendance/hooks/useMediaQuery";
import BulkAttendanceMobileView from "./bulkAttendance/components/BulkAttendanceMobileView";
import { AttendanceSession } from "./bulkAttendance/types";
import ModernTopBar from "./bulkAttendance/components/ModernTopBar";
import ModernSessionTabs from "./bulkAttendance/components/ModernSessionTabs";
import ModernTableView from "./bulkAttendance/components/ModernTableView";
import ModernSummaryStrip from "./bulkAttendance/components/ModernSummaryStrip";

type PendingAction =
  | { type: "change-date"; value: string }
  | { type: "refresh" };

const BulkAttendanceEntry: React.FC = () => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
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
    null
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
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      {/* Session Tabs (left) + Top Actions (right) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ModernSessionTabs
          activeSession={activeSession}
          onSessionChange={handleSessionChange}
          morningHasData={classes.some((c) => c.attendance?.morning_recorded_at)}
          eveningHasData={classes.some((c) => c.attendance?.evening_recorded_at)}
          morningDirty={dirtySessions.morning}
          eveningDirty={dirtySessions.evening}
        />

        <ModernTopBar
          classCount={classes.length}
          selectedDate={selectedDate}
          onDateChange={handleDateInputChange}
          onMarkAllPresent={handleMarkAllPresent}
          onRefresh={handleRefreshClick}
        />
      </div>

      {hiddenClasses > 0 && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {hiddenClasses} sinif siyahıdan çıxarıldı (sistemdə artıq mövcud deyil).
          </AlertDescription>
        </Alert>
      )}

      {/* Modern Table Content */}
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

      {/* Modern Summary Strip */}
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
            className="px-8 py-3 h-auto rounded-2xl border-none text-sm font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 bg-gradient-to-r from-[#1e88e5] to-[#42a5f5] hover:shadow-[0_6px_20px_rgba(30,136,229,0.3)]"
          >
            {saveAttendanceMutation.isPending && savingSession === "morning" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <span className="mr-1">💾</span>
            )}
            İlk dərsi saxla
          </Button>
          <Button
            onClick={() => handleSaveSession("evening")}
            disabled={saveAttendanceMutation.isPending}
            className="px-8 py-3 h-auto rounded-2xl border-none text-sm font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 bg-gradient-to-r from-[#43a047] to-[#66bb6a] hover:shadow-[0_6px_20px_rgba(67,160,71,0.3)]"
          >
            {saveAttendanceMutation.isPending && savingSession === "evening" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <span className="mr-1">✅</span>
            )}
            Son dərsi saxla
          </Button>
        </div>
      </div>

      <AlertDialog open={showUnsavedDialog} onOpenChange={handleDialogOpenChange}>
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
