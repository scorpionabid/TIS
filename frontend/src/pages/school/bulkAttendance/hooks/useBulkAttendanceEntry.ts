import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import bulkAttendanceService, {
  BulkAttendanceResponse,
  BulkAttendanceSaveResponse,
} from "@/services/bulkAttendance";
import {
  AttendanceError,
  AttendanceFormData,
  AttendanceSession,
  DirtySessionsState,
  SaveMutationVariables,
  ServerErrorMap,
  SaveResultState,
} from "../types";
import { buildSessionPayload, validateSessionAttendance } from "../utils";

type AttendanceNumericField = `${AttendanceSession}_${
  | "present"
  | "excused"
  | "unexcused"}`;
type AttendanceNoteField = `${AttendanceSession}_notes`;

const useBulkAttendanceEntry = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [activeSession, setActiveSession] =
    useState<AttendanceSession>("morning");
  const [attendanceData, setAttendanceData] = useState<AttendanceFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<ServerErrorMap>({});
  const [dirtySessions, setDirtySessions] = useState<DirtySessionsState>({
    morning: false,
    evening: false,
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState<SaveResultState>({
    status: "idle",
    message: "",
    timestamp: null,
    mode: "manual",
  });

  const queryClient = useQueryClient();
  const autoSaveModeRef = useRef<"manual" | "auto">("manual");
  const pendingSessionRef = useRef<AttendanceSession | null>(null);

  const classesQuery = useQuery<BulkAttendanceResponse>({
    queryKey: ["bulk-attendance-classes", selectedDate],
    queryFn: () => bulkAttendanceService.getClassesForDate(selectedDate),
    staleTime: 5 * 60 * 1000,
  });

  const saveAttendanceMutation = useMutation<
    BulkAttendanceSaveResponse,
    AttendanceError,
    SaveMutationVariables
  >({
    mutationFn: async ({ payload }) =>
      bulkAttendanceService.saveBulkAttendance(payload),
    onMutate: ({ session, isAutoSave }) => {
      if (import.meta.env.DEV) {
        console.log("[BulkAttendance] Mutation starting", {
          session,
          isAutoSave,
        });
      }
      setLastSaveResult({
        status: "saving",
        message: isAutoSave ? "Avto saxlanılır..." : "Saxlanılır...",
        timestamp: new Date().toISOString(),
        mode: isAutoSave ? "auto" : "manual",
      });
      if (isAutoSave) {
        setIsAutoSaving(true);
        autoSaveModeRef.current = "auto";
      } else {
        autoSaveModeRef.current = "manual";
        setServerErrors({});
      }

      setErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.endsWith(session)) {
            delete next[key];
          }
        });
        return next;
      });
    },
    onSuccess: (data, variables) => {
      const { status, message, data: payloadData } = data;
      if (import.meta.env.DEV) {
        console.log("[BulkAttendance] Mutation success", {
          session: variables.session,
          status,
          savedCount: payloadData?.saved?.length ?? 0,
          errorCount: payloadData?.errors?.length ?? 0,
        });
      }

      if (status === "completed") {
        toast.success(message);
      } else if (status === "partial") {
        if (typeof toast.warning === "function") {
          toast.warning(message);
        } else {
          toast.info(message);
        }
      } else {
        toast.error(message);
      }

      const errorMap = (payloadData?.errors || []).reduce((acc, err) => {
        acc[err.grade_id] = err;
        return acc;
      }, {} as ServerErrorMap);

      setServerErrors(errorMap);
      setLastSaveResult({
        status: "success",
        message:
          status === "completed"
            ? "Davamiyyət saxlanıldı"
            : "Qismən saxlanılma tamamlandı",
        timestamp: new Date().toISOString(),
        mode: variables.isAutoSave ? "auto" : "manual",
      });

      setDirtySessions((prev) => ({
        ...prev,
        [variables.session]: false,
      }));

      if (variables.isAutoSave && pendingSessionRef.current) {
        setActiveSession(pendingSessionRef.current);
        pendingSessionRef.current = null;
      }

      queryClient.invalidateQueries({
        queryKey: ["bulk-attendance-classes"],
      });
    },
    onError: (error, variables) => {
      console.error("[BulkAttendance] Mutation error", {
        session: variables?.session,
        isAutoSave: variables?.isAutoSave,
        error,
      });
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Davamiyyət saxlanarkən səhv baş verdi";
      toast.error(errorMessage);
      setLastSaveResult({
        status: "error",
        message: errorMessage,
        timestamp: new Date().toISOString(),
        mode: variables?.isAutoSave ? "auto" : "manual",
      });

      if (variables?.isAutoSave) {
        pendingSessionRef.current = null;
      }
    },
    onSettled: () => {
      if (import.meta.env.DEV) {
        console.log("[BulkAttendance] Mutation settled");
      }
      setIsAutoSaving(false);
      autoSaveModeRef.current = "manual";
    },
  });

  useEffect(() => {
    if (classesQuery.data?.data.classes) {
      const initialData: AttendanceFormData = {};

      classesQuery.data.data.classes.forEach((cls) => {
        initialData[cls.id] = {
          morning_present:
            cls.attendance?.morning_present ?? cls.total_students,
          morning_excused: cls.attendance?.morning_excused ?? 0,
          morning_unexcused: cls.attendance?.morning_unexcused ?? 0,
          evening_present:
            cls.attendance?.evening_present ?? cls.total_students,
          evening_excused: cls.attendance?.evening_excused ?? 0,
          evening_unexcused: cls.attendance?.evening_unexcused ?? 0,
          morning_notes: cls.attendance?.morning_notes || "",
          evening_notes: cls.attendance?.evening_notes || "",
        };
      });

      setAttendanceData(initialData);
    }
  }, [classesQuery.data]);

  const classes = classesQuery.data?.data.classes || [];
  const academicYearId = classesQuery.data?.data.academic_year?.id;
  const refetchClasses = () => classesQuery.refetch();

  const validateSession = (session: AttendanceSession): boolean => {
    if (!classes.length) {
      return false;
    }

    return validateSessionAttendance(
      attendanceData,
      classes,
      session,
      setErrors
    );
  };

  const buildPayload = (session: AttendanceSession) => {
    if (!classes.length || !academicYearId) {
      return null;
    }

    return buildSessionPayload(session, {
      classes,
      academicYearId,
      selectedDate,
      attendanceData,
    });
  };

  const updateAttendance = (
    gradeId: number,
    field: keyof AttendanceFormData[string],
    value: number | string
  ) => {
    if (import.meta.env.DEV) {
      console.log("[BulkAttendance] updateAttendance called", {
        gradeId,
        field,
        value,
      });
    }

    if (String(field).endsWith("_present")) {
      // "Dərsdə" sahəsi yalnız törəmə qiymətdir, manual dəyişiklikləri qəbul etmirik
      if (import.meta.env.DEV) {
        console.log("[BulkAttendance] present field mutation blocked", {
          gradeId,
          field,
        });
      }
      return;
    }

    setAttendanceData((prev) => {
      const defaultEntry = {
        morning_present: 0,
        morning_excused: 0,
        morning_unexcused: 0,
        evening_present: 0,
        evening_excused: 0,
        evening_unexcused: 0,
        morning_notes: "",
        evening_notes: "",
      };

      const prevEntry = (prev[gradeId] ??
        defaultEntry) as AttendanceFormData[string];
      const nextEntry: AttendanceFormData[string] = { ...prevEntry };

      const ensureNumber = (input: unknown) => {
        if (typeof input === "number") {
          return Number.isFinite(input) ? input : 0;
        }
        const parsed = parseInt(String(input ?? ""), 10);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      const sessionPrefix = field.startsWith("morning")
        ? "morning"
        : field.startsWith("evening")
        ? "evening"
        : null;

      const isExcusedField = field.endsWith("_excused");
      const isUnexcusedField = field.endsWith("_unexcused");
      const isPresentField = field.endsWith("_present");

      if (isPresentField || isExcusedField || isUnexcusedField) {
        nextEntry[field as AttendanceNumericField] = ensureNumber(value);
      } else {
        nextEntry[field as AttendanceNoteField] = String(value ?? "");
      }

      if (sessionPrefix && (isExcusedField || isUnexcusedField)) {
        const presentKey = `${sessionPrefix}_present` as AttendanceNumericField;
        const excusedKey = `${sessionPrefix}_excused` as AttendanceNumericField;
        const unexcusedKey =
          `${sessionPrefix}_unexcused` as AttendanceNumericField;

        const targetClass = classes.find(
          (cls) => Number(cls.id) === Number(gradeId)
        );
        const totalStudents = targetClass?.total_students ?? 0;

        const clamp = (val: number, min: number, max: number) =>
          Math.min(Math.max(val, min), max);

        let excused = clamp(
          ensureNumber(nextEntry[excusedKey]),
          0,
          totalStudents
        );
        let unexcused = clamp(
          ensureNumber(nextEntry[unexcusedKey]),
          0,
          totalStudents
        );

        if (excused + unexcused > totalStudents) {
          if (isExcusedField) {
            excused = Math.max(0, totalStudents - unexcused);
          } else {
            unexcused = Math.max(0, totalStudents - excused);
          }
        }

        const present = Math.max(0, totalStudents - (excused + unexcused));

        nextEntry[excusedKey] = excused;
        nextEntry[unexcusedKey] = unexcused;
        nextEntry[presentKey] = present;

        if (import.meta.env.DEV) {
          console.log("[BulkAttendance] Updated counts", {
            gradeId,
            session: sessionPrefix,
            totalStudents,
            excused,
            unexcused,
            present,
          });
        }
      }

      return {
        ...prev,
        [gradeId]: nextEntry,
      };
    });

    const session = field.startsWith("morning")
      ? "morning"
      : field.startsWith("evening")
      ? "evening"
      : null;

    if (session) {
      setDirtySessions((prev) => ({
        ...prev,
        [session]: true,
      }));
    }

    setServerErrors((prev) => {
      if (!prev[gradeId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[gradeId];
      return next;
    });
  };

  const handleSessionChange = (nextSession: AttendanceSession) => {
    if (nextSession === activeSession) {
      return;
    }

    if (saveAttendanceMutation.isPending) {
      if (autoSaveModeRef.current === "auto") {
        pendingSessionRef.current = nextSession;
      } else {
        toast.info("Davamiyyət saxlanılır, zəhmət olmasa gözləyin");
      }
      return;
    }

    if (dirtySessions[activeSession]) {
      const isValid = validateSession(activeSession);
      if (!isValid) {
        toast.error("Sessiya dəyişmədən əvvəl xətaları düzəldin");
        return;
      }

      const payload = buildPayload(activeSession);
      if (!payload) {
        toast.error("Davamiyyət məlumatı hazırlanarkən səhv baş verdi");
        return;
      }

      pendingSessionRef.current = nextSession;
      saveAttendanceMutation.mutate({
        payload,
        session: activeSession,
        isAutoSave: true,
      });
      return;
    }

    setActiveSession(nextSession);
  };

  const handleSaveSession = () => {
    if (import.meta.env.DEV) {
      console.log("[BulkAttendance] handleSaveSession fired", {
        activeSession,
        classesCount: classes.length,
        academicYearId,
        dirtySessions,
      });
    }

    if (!classes.length) {
      console.warn("[BulkAttendance] Save aborted: no classes available");
      toast.error("Sinif məlumatları tapılmadı");
      return;
    }

    if (!academicYearId) {
      console.warn("[BulkAttendance] Save aborted: missing academicYearId");
      toast.error("Aktiv tədris ili tapılmadı, davamiyyət saxlanıla bilmədi");
      return;
    }

    const isValid = validateSession(activeSession);

    if (!isValid) {
      console.warn("[BulkAttendance] Save aborted: validation failed", {
        session: activeSession,
      });
      toast.error("Zəhmət olmasa bütün xətaları düzəldin");
      return;
    }

    const payload = buildPayload(activeSession);

    if (!payload) {
      console.error("[BulkAttendance] Save aborted: payload build returned null");
      toast.error("Davamiyyət məlumatı hazırlanarkən səhv baş verdi");
      return;
    }

    saveAttendanceMutation.mutate({
      payload,
      session: activeSession,
      isAutoSave: false,
    });

    if (import.meta.env.DEV) {
      console.log("[BulkAttendance] Save mutation dispatched", {
        session: activeSession,
        classPayloadCount: payload.classes.length,
      });
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const blob = await bulkAttendanceService.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `toplu-davamiyyet-${selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("CSV faylı endirildi");
    } catch (exportError) {
      console.error(exportError);
      toast.error("CSV export mümkün olmadı");
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkAllPresent = () => {
    if (!classes.length) {
      return;
    }

    const newData = { ...attendanceData };
    classes.forEach((cls) => {
      if (cls.total_students > 0) {
        const previous = newData[cls.id] || {
          morning_present: 0,
          morning_excused: 0,
          morning_unexcused: 0,
          evening_present: 0,
          evening_excused: 0,
          evening_unexcused: 0,
          morning_notes: "",
          evening_notes: "",
        };

        newData[cls.id] = {
          ...previous,
          [`${activeSession}_present`]: cls.total_students,
          [`${activeSession}_excused`]: 0,
          [`${activeSession}_unexcused`]: 0,
        };
      }
    });

    setAttendanceData(newData);
    setDirtySessions((prev) => ({
      ...prev,
      [activeSession]: true,
    }));
    setServerErrors((prev) => {
      if (!Object.keys(prev).length) {
        return prev;
      }
      const next = { ...prev };
      classes.forEach((cls) => {
        if (next[cls.id]) {
          delete next[cls.id];
        }
      });
      return next;
    });

    toast.success('Bütün siniflər "dərsdə olan" olaraq işarələndi');
  };

  const getAttendanceRate = (present: number, total: number): number =>
    bulkAttendanceService.calculateAttendanceRate(present, total);

  const isLoading = classesQuery.isLoading;
  const error = classesQuery.error;
  const classesData = classesQuery.data;

  const state = useMemo(
    () => ({
      selectedDate,
      activeSession,
      attendanceData,
      errors,
      serverErrors,
      lastSaveResult,
      dirtySessions,
      isAutoSaving,
      isExporting,
      classes,
      classesData,
      isLoading,
      error,
    }),
    [
      selectedDate,
      activeSession,
      attendanceData,
      errors,
      serverErrors,
      lastSaveResult,
      dirtySessions,
      isAutoSaving,
      isExporting,
      classes,
      classesData,
      isLoading,
      error,
    ]
  );

  return {
    state,
    setSelectedDate,
    setActiveSession,
    setAttendanceData,
    setErrors,
    setServerErrors,
    updateAttendance,
    handleSessionChange,
    handleSaveSession,
    handleExportData,
    handleMarkAllPresent,
    getAttendanceRate,
    refetchClasses,
    saveAttendanceMutation,
    queryClient,
  };
};

export default useBulkAttendanceEntry;
