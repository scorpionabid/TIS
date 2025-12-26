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

const DRAFT_STORAGE_PREFIX = "bulk-attendance-draft";
const getDraftStorageKey = (date: string) =>
  `${DRAFT_STORAGE_PREFIX}:${date}`;

interface AttendanceDraftPayload {
  updatedAt: string;
  data: AttendanceFormData;
  dirty: DirtySessionsState;
}

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
    session: null,
  });

  const queryClient = useQueryClient();
  const autoSaveModeRef = useRef<"manual" | "auto">("manual");
  const pendingSessionRef = useRef<AttendanceSession | null>(null);
  const classTotalsRef = useRef<Map<number, number>>(new Map());
  const hasWindow = typeof window !== "undefined";

  const classesQuery = useQuery<BulkAttendanceResponse>({
    queryKey: ["bulk-attendance-classes", selectedDate],
    queryFn: () => bulkAttendanceService.getClassesForDate(selectedDate),
    staleTime: 5 * 60 * 1000,
  });

  const classes = useMemo(() => {
    const list = classesQuery.data?.data.classes ?? [];
    return list.filter(
      (cls) =>
        typeof cls?.id === "number" &&
        Boolean(cls.name) &&
        !(cls as Record<string, unknown>)?.deleted_at
    );
  }, [classesQuery.data]);

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
        session,
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
        session: variables.session,
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
        session: variables?.session ?? null,
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
    if (!classes.length) {
      setAttendanceData({});
      setDirtySessions({ morning: false, evening: false });
      setErrors({});
      setServerErrors({});
      return;
    }

    let initialData: AttendanceFormData = {};
    const validClassIds = new Set<string>(
      classes.map((cls) => String(cls.id))
    );

    classes.forEach((cls) => {
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

    let dirtyState: DirtySessionsState = {
      morning: false,
      evening: false,
    };
    let restoredDraft = false;

    if (hasWindow) {
      const storageKey = getDraftStorageKey(selectedDate);
      const storedDraft = window.localStorage.getItem(storageKey);
      if (storedDraft) {
        try {
          const parsed = JSON.parse(storedDraft) as AttendanceDraftPayload;
          if (parsed?.data) {
            const merged: AttendanceFormData = { ...initialData };
            let draftPruned = false;

            Object.entries(parsed.data).forEach(([gradeId, entry]) => {
              if (validClassIds.has(String(gradeId))) {
                merged[gradeId] = {
                  ...merged[gradeId],
                  ...entry,
                };
              } else {
                draftPruned = true;
              }
            });

            if (draftPruned) {
              const filteredDraftEntries = Object.entries(parsed.data).filter(
                ([gradeId]) => validClassIds.has(String(gradeId))
              );
              const filteredDraft = Object.fromEntries(filteredDraftEntries);
              window.localStorage.setItem(
                storageKey,
                JSON.stringify({
                  ...parsed,
                  data: filteredDraft,
                })
              );
            }

            initialData = merged;
            dirtyState = parsed.dirty ?? {
              morning: true,
              evening: true,
            };
            restoredDraft = true;
          }
        } catch (draftError) {
          console.error("[BulkAttendance] Draft parse failed", draftError);
          window.localStorage.removeItem(storageKey);
        }
      }
    }

    setAttendanceData(initialData);
    setDirtySessions(dirtyState);
    setErrors({});
    setServerErrors({});

    if (restoredDraft) {
      toast.info("Son saxlanılmamış məlumatlar bərpa olundu");
    }
  }, [classes, selectedDate, hasWindow]);

  useEffect(() => {
    if (!hasWindow) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtySessions.morning && !dirtySessions.evening) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtySessions, hasWindow]);

  const academicYearId = classesQuery.data?.data.academic_year?.id;
  const refetchClasses = () => classesQuery.refetch();

  useEffect(() => {
    const totals = new Map<number, number>();
    classes.forEach((cls) => {
      totals.set(Number(cls.id), cls.total_students);
    });
    classTotalsRef.current = totals;
  }, [classes]);

  useEffect(() => {
    if (!hasWindow) {
      return;
    }

    const storageKey = getDraftStorageKey(selectedDate);

    if (!dirtySessions.morning && !dirtySessions.evening) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const draftPayload: AttendanceDraftPayload = {
      updatedAt: new Date().toISOString(),
      data: attendanceData,
      dirty: dirtySessions,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(draftPayload));
  }, [attendanceData, dirtySessions, selectedDate, hasWindow]);

  const prepareSessionPayload = (session: AttendanceSession) => {
    if (!classes.length) {
      console.warn("[BulkAttendance] Save aborted: no classes available");
      toast.error("Sinif məlumatları tapılmadı");
      return null;
    }

    if (!academicYearId) {
      console.warn("[BulkAttendance] Save aborted: missing academicYearId");
      toast.error("Aktiv tədris ili tapılmadı, davamiyyət saxlanıla bilmədi");
      return null;
    }

    const isValid = validateSession(session);

    if (!isValid) {
      console.warn("[BulkAttendance] Save aborted: validation failed", {
        session,
      });
      toast.error("Zəhmət olmasa bütün xətaları düzəldin");
      return null;
    }

    const payload = buildPayload(session);

    if (!payload) {
      console.error("[BulkAttendance] Save aborted: payload build returned null");
      toast.error("Davamiyyət məlumatı hazırlanarkən səhv baş verdi");
      return null;
    }

    return payload;
  };

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

        const totalStudents =
          classTotalsRef.current.get(Number(gradeId)) ?? 0;

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
      const payload = prepareSessionPayload(activeSession);
      if (!payload) {
        toast.error("Sessiya dəyişmədən əvvəl xətaları düzəldin");
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

  const handleSaveSession = (
    sessionOverride?: AttendanceSession
  ) => {
    const sessionToSave = sessionOverride ?? activeSession;
    if (import.meta.env.DEV) {
      console.log("[BulkAttendance] handleSaveSession fired", {
        activeSession,
        sessionToSave,
        classesCount: classes.length,
        academicYearId,
        dirtySessions,
      });
    }

    const payload = prepareSessionPayload(sessionToSave);
    if (!payload) {
      return;
    }

    saveAttendanceMutation.mutate({
      payload,
      session: sessionToSave,
      isAutoSave: false,
    });

    if (import.meta.env.DEV) {
      console.log("[BulkAttendance] Save mutation dispatched", {
        session: sessionToSave,
        classPayloadCount: payload.classes.length,
      });
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const blob = await bulkAttendanceService.exportCsv(
        selectedDate,
        selectedDate
      );
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

  const handleMarkAllPresent = (
    sessionOverride?: AttendanceSession
  ) => {
    if (!classes.length) {
      return;
    }

    const targetSession = sessionOverride ?? activeSession;
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
          [`${targetSession}_present`]: cls.total_students,
          [`${targetSession}_excused`]: 0,
          [`${targetSession}_unexcused`]: 0,
        };
      }
    });

    setAttendanceData(newData);
    setDirtySessions((prev) => ({
      ...prev,
      [targetSession]: true,
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

    const sessionLabel =
      targetSession === "morning" ? "İlk dərs" : "Son dərs";
    toast.success(
      `Bütün siniflər "${sessionLabel}" üçün dərsdə olan kimi işarələndi`
    );
  };

  const getAttendanceRate = (present: number, total: number): number =>
    bulkAttendanceService.calculateAttendanceRate(present, total);

  const saveDirtySessions = async (): Promise<boolean> => {
    const sessionsToSave: AttendanceSession[] = [];
    if (dirtySessions.morning) {
      sessionsToSave.push("morning");
    }
    if (dirtySessions.evening) {
      sessionsToSave.push("evening");
    }

    if (!sessionsToSave.length) {
      return true;
    }

    if (saveAttendanceMutation.isPending) {
      toast.info("Davamiyyət saxlanılır, zəhmət olmasa gözləyin");
      return false;
    }

    for (const session of sessionsToSave) {
      const payload = prepareSessionPayload(session);
      if (!payload) {
        return false;
      }

      try {
        await saveAttendanceMutation.mutateAsync({
          payload,
          session,
          isAutoSave: true,
        });
      } catch (mutationError) {
        console.error("[BulkAttendance] Dirty session save failed", {
          session,
          mutationError,
        });
        return false;
      }
    }

    return true;
  };

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
    saveDirtySessions,
    saveAttendanceMutation,
    queryClient,
  };
};

export default useBulkAttendanceEntry;
