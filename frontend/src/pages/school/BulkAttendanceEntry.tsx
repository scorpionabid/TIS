import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar,
  Clock,
  Users,
  Save,
  CheckSquare,
  Download,
  School,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import useBulkAttendanceEntry from "./bulkAttendance/hooks/useBulkAttendanceEntry";
import useMediaQuery from "./bulkAttendance/hooks/useMediaQuery";
import BulkAttendanceMobileView from "./bulkAttendance/components/BulkAttendanceMobileView";
import BulkAttendanceTableView from "./bulkAttendance/components/BulkAttendanceTableView";
import { AttendanceSession } from "./bulkAttendance/types";

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

  const schoolName = classesData.data.school?.name || "Məktəb";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Toplu Davamiyyət Qeydiyyatı
          </h1>
          <p className="text-gray-600 mt-1">
            <School className="inline h-4 w-4 mr-1" />
            {schoolName}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateInputChange(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                Sürətli əməliyyatlar:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                className="flex items-center space-x-1"
              >
                <CheckSquare className="h-4 w-4" />
                <span>Hamısını dərsdə işarələ</span>
              </Button>
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
            </div>
            <div className="text-sm text-gray-600">
              <Users className="inline h-4 w-4 mr-1" />
              <span className="font-medium">{classes.length}</span> sinif
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Tabs */}
      <Tabs
        value={activeSession}
        onValueChange={(value) =>
          handleSessionChange(value as AttendanceSession)
        }
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="morning" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>İlk dərs</span>
          </TabsTrigger>
          <TabsTrigger value="evening" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Son dərs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="morning" className="space-y-4">
          {isDesktop ? (
            <BulkAttendanceTableView
              session="morning"
              classes={classes}
              attendanceData={attendanceData}
              updateAttendance={updateAttendance}
              errors={errors}
              serverErrors={serverErrors}
              getAttendanceRate={getAttendanceRate}
            />
          ) : (
            <BulkAttendanceMobileView
              session="morning"
              classes={classes}
              attendanceData={attendanceData}
              updateAttendance={updateAttendance}
              errors={errors}
              serverErrors={serverErrors}
              getAttendanceRate={getAttendanceRate}
            />
          )}
        </TabsContent>

        <TabsContent value="evening" className="space-y-4">
          {isDesktop ? (
            <BulkAttendanceTableView
              session="evening"
              classes={classes}
              attendanceData={attendanceData}
              updateAttendance={updateAttendance}
              errors={errors}
              serverErrors={serverErrors}
              getAttendanceRate={getAttendanceRate}
            />
          ) : (
            <BulkAttendanceMobileView
              session="evening"
              classes={classes}
              attendanceData={attendanceData}
              updateAttendance={updateAttendance}
              errors={errors}
              serverErrors={serverErrors}
              getAttendanceRate={getAttendanceRate}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-2">
          {renderSaveStatus()}
          {renderDirtyIndicators()}
        </div>
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={handleRefreshClick}>
            Yenilə
          </Button>
          <Button
            onClick={handleSaveSession}
            disabled={saveAttendanceMutation.isPending}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>
              {saveAttendanceMutation.isPending
                ? "Saxlanılır..."
                : activeSession === "morning"
                ? "İlk dərsi saxla"
                : "Son dərsi saxla"}
            </span>
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
