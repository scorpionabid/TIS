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
  DirtyClassesState,
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
  dirtyClasses: DirtyClassesState;
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
  // Per-class dirty tracking
  const [dirtyClasses, setDirtyClasses] = useState<DirtyClassesState>({});
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
        Boolean(cls.name)
    );
  }, [classesQuery.data]);

  // Derive global dirty state from per-class state (for UI indicators)
  const dirtySessions: DirtySessionsState = useMemo(() => ({
    morning: Object.values(dirtyClasses).some((c) => c.morning),
    evening: Object.values(dirtyClasses).some((c) => c.evening),
  }), [dirtyClasses]);

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

      // Build save result with shift breakdown
      const savedIds = new Set((payloadData?.saved || []).map((s) => s.grade_id));
      const shift1Count = classes.filter(
        (c) => savedIds.has(c.id) && normalizeShift(c.teaching_shift) === 1
      ).length;
      const shift2Count = classes.filter(
        (c) => savedIds.has(c.id) && normalizeShift(c.teaching_shift) === 2
      ).length;
      const otherCount = (payloadData?.saved?.length ?? 0) - shift1Count - shift2Count;

      const parts: string[] = [];
      if (shift1Count > 0) parts.push(`1 növbə: ${shift1Count}`);
      if (shift2Count > 0) parts.push(`2 növbə: ${shift2Count}`);
      if (otherCount > 0) parts.push(`digər: ${otherCount}`);

      const breakdown = parts.length ? ` (${parts.join(' · ')})` : '';
      const savedTotal = payloadData?.saved?.length ?? 0;

      setLastSaveResult({
        status: "success",
        message:
          status === "completed"
            ? `${savedTotal} sinif saxlanıldı${breakdown}`
            : `Qismən saxlanıldı${breakdown}`,
        timestamp: new Date().toISOString(),
        mode: variables.isAutoSave ? "auto" : "manual",
        session: variables.session,
      });

      // Clear dirty state for successfully saved classes
      const successIds = new Set((payloadData?.saved || []).map((s) => s.grade_id));
      setDirtyClasses((prev) => {
        const next = { ...prev };
        successIds.forEach((id) => {
          if (next[id]) {
            next[id] = { ...next[id], [variables.session]: false };
            if (!next[id].morning && !next[id].evening) {
              delete next[id];
            }
          }
        });
        return next;
      });

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
      setDirtyClasses({});
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
        uniform_violation: cls.attendance?.uniform_violation ?? 0,
        morning_notes: cls.attendance?.morning_notes || "",
        evening_notes: cls.attendance?.evening_notes || "",
      };
    });

    const newDirtyClasses: DirtyClassesState = {};
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
                merged[gradeId] = { ...merged[gradeId], ...entry };
              } else {
                draftPruned = true;
              }
            });

            if (draftPruned) {
              const filteredDraftEntries = Object.entries(parsed.data).filter(
                ([gradeId]) => validClassIds.has(String(gradeId))
              );
              window.localStorage.setItem(
                storageKey,
                JSON.stringify({
                  ...parsed,
                  data: Object.fromEntries(filteredDraftEntries),
                })
              );
            }

            initialData = merged;

            // Restore per-class dirty state (filter to valid classes only)
            if (parsed.dirtyClasses) {
              Object.entries(parsed.dirtyClasses).forEach(([gradeId, state]) => {
                if (validClassIds.has(String(gradeId))) {
                  newDirtyClasses[Number(gradeId)] = state;
                }
              });
            }
            restoredDraft = true;
          }
        } catch (draftError) {
          console.error("[BulkAttendance] Draft parse failed", draftError);
          window.localStorage.removeItem(storageKey);
        }
      }
    }

    setAttendanceData(initialData);
    setDirtyClasses(newDirtyClasses);
    setErrors({});
    setServerErrors({});

    if (restoredDraft) {
      toast.info("Son saxlanılmamış məlumatlar bərpa olundu");
    }
  }, [classes, selectedDate, hasWindow]);

  useEffect(() => {
    if (!hasWindow) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtySessions.morning && !dirtySessions.evening) return;
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

  // Persist draft with per-class dirty state
  useEffect(() => {
    if (!hasWindow) return;

    const storageKey = getDraftStorageKey(selectedDate);

    if (!dirtySessions.morning && !dirtySessions.evening) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const draftPayload: AttendanceDraftPayload = {
      updatedAt: new Date().toISOString(),
      data: attendanceData,
      dirtyClasses,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(draftPayload));
  }, [attendanceData, dirtyClasses, selectedDate, hasWindow, dirtySessions]);

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

    // Include dirty classes + unrecorded classes with students
    const recordedAtKey = session === "morning" ? "morning_recorded_at" : "evening_recorded_at";
    const bakuHour = (new Date().getUTCHours() + 4) % 24;
    const is2ndShiftMorningBlocked = session === "morning" && bakuHour < 12;

    // Warn about 2nd shift classes blocked before 12:00 Baku time
    if (is2ndShiftMorningBlocked) {
      const blocked = classes.filter(
        (c) =>
          normalizeShift(c.teaching_shift) === 2 &&
          (dirtyClasses[c.id]?.morning || (c.total_students > 0 && !c.attendance?.morning_recorded_at))
      );
      if (blocked.length > 0) {
        toast.warning(`2-ci növbə sinifləri ilk dərsi saat 12:00-dan sonra qeyd edilə bilər (${blocked.length} sinif buraxıldı).`);
      }
    }

    const hasClassesToSave = classes.some((c) => {
      if (is2ndShiftMorningBlocked && normalizeShift(c.teaching_shift) === 2) return false;
      return dirtyClasses[c.id]?.[session] || (c.total_students > 0 && !c.attendance?.[recordedAtKey]);
    });
    if (!hasClassesToSave) {
      const sessionLabel = session === "morning" ? "İlk dərs" : "Son dərs";
      toast.info(`${sessionLabel} üçün qeyd ediləcək sinif yoxdur`);
      return null;
    }

    const isValid = validateSession(session);
    if (!isValid) {
      console.warn("[BulkAttendance] Save aborted: validation failed", { session });
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
    if (!classes.length) return false;
    const recordedAtKey = session === "morning" ? "morning_recorded_at" : "evening_recorded_at";
    const bakuHour = (new Date().getUTCHours() + 4) % 24;
    const is2ndShiftMorningBlocked = session === "morning" && bakuHour < 12;
    const classesToValidate = classes.filter((c) => {
      if (is2ndShiftMorningBlocked && normalizeShift(c.teaching_shift) === 2) return false;
      return dirtyClasses[c.id]?.[session] || (c.total_students > 0 && !c.attendance?.[recordedAtKey]);
    });
    return validateSessionAttendance(attendanceData, classesToValidate, session, setErrors);
  };

  const buildPayload = (session: AttendanceSession) => {
    if (!classes.length || !academicYearId) return null;
    return buildSessionPayload(session, {
      classes,
      academicYearId,
      selectedDate,
      attendanceData,
      dirtyClasses,
    });
  };

  const updateAttendance = (
    gradeId: number,
    field: keyof AttendanceFormData[string],
    value: number | string
  ) => {
    const sanitizeNumericValue = (input: number | string) => {
      if (input === null || input === undefined) return 0;
      if (typeof input === "number") {
        return Number.isFinite(input) && !Number.isNaN(input) ? Math.floor(input) : 0;
      }
      const trimmed = String(input).trim();
      if (!trimmed) return 0;
      const parsed = parseInt(trimmed, 10);
      return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : 0;
    };

    const isNumericField =
      String(field).endsWith("_present") ||
      String(field).endsWith("_excused") ||
      String(field).endsWith("_unexcused") ||
      field === "uniform_violation";

    const sanitizedValue = isNumericField
      ? sanitizeNumericValue(value)
      : String(value ?? "");

    if (String(field).endsWith("_present")) return;

    const sessionPrefix = field.startsWith("morning")
      ? "morning"
      : field.startsWith("evening")
      ? "evening"
      : null;

    const isExcusedField = field.endsWith("_excused");
    const isUnexcusedField = field.endsWith("_unexcused");
    const isPresentField = field.endsWith("_present");
    const isUniformViolationField = field === "uniform_violation";

    setAttendanceData((prev) => {
      const defaultEntry = {
        morning_present: 0, morning_excused: 0, morning_unexcused: 0,
        evening_present: 0, evening_excused: 0, evening_unexcused: 0,
        uniform_violation: 0, morning_notes: "", evening_notes: "",
      };

      const prevEntry = (prev[gradeId] ?? defaultEntry) as AttendanceFormData[string];
      const nextEntry: AttendanceFormData[string] = { ...prevEntry };

      const ensureNumber = (input: unknown) => {
        if (input === null || input === undefined) return 0;
        if (typeof input === "number") {
          if (Number.isNaN(input) || !Number.isFinite(input)) return 0;
          return input;
        }
        const parsed = parseInt(String(input), 10);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      if (isPresentField || isExcusedField || isUnexcusedField || isUniformViolationField) {
        nextEntry[field as AttendanceNumericField] = ensureNumber(sanitizedValue);
      } else {
        nextEntry[field as AttendanceNoteField] = String(sanitizedValue ?? "");
      }

      if (sessionPrefix && (isExcusedField || isUnexcusedField)) {
        const presentKey = `${sessionPrefix}_present` as AttendanceNumericField;
        const excusedKey = `${sessionPrefix}_excused` as AttendanceNumericField;
        const unexcusedKey = `${sessionPrefix}_unexcused` as AttendanceNumericField;

        const totalStudents = classTotalsRef.current.get(Number(gradeId)) ?? 0;
        const clamp = (val: number, min: number, max: number) =>
          Math.min(Math.max(val, min), max);

        let excused = clamp(ensureNumber(nextEntry[excusedKey]), 0, totalStudents);
        let unexcused = clamp(ensureNumber(nextEntry[unexcusedKey]), 0, totalStudents);

        if (excused + unexcused > totalStudents) {
          if (isExcusedField) {
            excused = Math.max(0, totalStudents - unexcused);
          } else {
            unexcused = Math.max(0, totalStudents - excused);
          }
        }

        nextEntry[excusedKey] = excused;
        nextEntry[unexcusedKey] = unexcused;
        nextEntry[presentKey] = Math.max(0, totalStudents - (excused + unexcused));
      }

      return { ...prev, [gradeId]: nextEntry };
    });

    // Mark this specific class as dirty for the appropriate session
    const session = sessionPrefix || (isUniformViolationField ? activeSession : null);
    if (session) {
      setDirtyClasses((prev) => ({
        ...prev,
        [gradeId]: { ...(prev[gradeId] ?? { morning: false, evening: false }), [session]: true },
      }));
    }

    setServerErrors((prev) => {
      if (!prev[gradeId]) return prev;
      const next = { ...prev };
      delete next[gradeId];
      return next;
    });
  };

  const handleSessionChange = (nextSession: AttendanceSession) => {
    if (nextSession === activeSession) return;

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
        // prepareSessionPayload returns null either because there are no dirty
        // classes OR because validation failed. Only switch tabs in the first case.
        const hasDirtyForSession = Object.values(dirtyClasses).some((c) => c[activeSession]);
        if (!hasDirtyForSession) {
          setActiveSession(nextSession);
        }
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

  const handleSaveSession = (sessionOverride?: AttendanceSession) => {
    const sessionToSave = sessionOverride ?? activeSession;
    if (import.meta.env.DEV) {
      console.log("[BulkAttendance] handleSaveSession fired", {
        activeSession,
        sessionToSave,
        classesCount: classes.length,
        academicYearId,
        dirtyCount: Object.values(dirtyClasses).filter((c) => c[sessionToSave]).length,
      });
    }

    const payload = prepareSessionPayload(sessionToSave);
    if (!payload) return;

    saveAttendanceMutation.mutate({
      payload,
      session: sessionToSave,
      isAutoSave: false,
    });
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const blob = await bulkAttendanceService.exportCsv(selectedDate, selectedDate);
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

  // Mark all classes of a specific shift as dirty for a session
  const handleMarkAllPresent = (
    sessionOverride?: AttendanceSession,
    shiftFilter?: "1" | "2" | "all"
  ) => {
    if (!classes.length) return;

    const targetSession = sessionOverride ?? activeSession;
    const shift = shiftFilter ?? "all";

    const targetClasses = shift === "all"
      ? classes
      : classes.filter((cls) => normalizeShift(cls.teaching_shift) === Number(shift));

    if (!targetClasses.length) {
      toast.info("Bu növbədə sinif tapılmadı");
      return;
    }

    const newData = { ...attendanceData };
    const newDirty = { ...dirtyClasses };

    targetClasses.forEach((cls) => {
      if (cls.total_students > 0) {
        const previous = newData[cls.id] || {
          morning_present: 0, morning_excused: 0, morning_unexcused: 0,
          evening_present: 0, evening_excused: 0, evening_unexcused: 0,
          uniform_violation: 0, morning_notes: "", evening_notes: "",
        };
        newData[cls.id] = {
          ...previous,
          [`${targetSession}_present`]: cls.total_students,
          [`${targetSession}_excused`]: 0,
          [`${targetSession}_unexcused`]: 0,
        };
        newDirty[cls.id] = {
          ...(newDirty[cls.id] ?? { morning: false, evening: false }),
          [targetSession]: true,
        };
      }
    });

    setAttendanceData(newData);
    setDirtyClasses(newDirty);
    setServerErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next = { ...prev };
      targetClasses.forEach((cls) => { delete next[cls.id]; });
      return next;
    });

    const sessionLabel = targetSession === "morning" ? "İlk dərs" : "Son dərs";
    const shiftLabel = shift === "all" ? "Bütün siniflər" : `${shift} növbə sinifləri`;
    toast.success(`${shiftLabel} "${sessionLabel}" üçün dərsdə işarələndi`);
  };

  const getAttendanceRate = (present: number, total: number): number =>
    bulkAttendanceService.calculateAttendanceRate(present, total);

  const saveDirtySessions = async (): Promise<boolean> => {
    const sessions: AttendanceSession[] = [];
    if (dirtySessions.morning) sessions.push("morning");
    if (dirtySessions.evening) sessions.push("evening");

    if (!sessions.length) return true;
    if (saveAttendanceMutation.isPending) {
      toast.info("Davamiyyət saxlanılır, zəhmət olmasa gözləyin");
      return false;
    }

    for (const session of sessions) {
      const payload = prepareSessionPayload(session);
      if (!payload) continue; // No dirty classes for this session — skip

      try {
        await saveAttendanceMutation.mutateAsync({ payload, session, isAutoSave: true });
      } catch (mutationError) {
        console.error("[BulkAttendance] Dirty session save failed", { session, mutationError });
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
      dirtyClasses,
      isAutoSaving,
      isExporting,
      classes,
      classesData,
      isLoading,
      error,
    }),
    [
      selectedDate, activeSession, attendanceData, errors, serverErrors,
      lastSaveResult, dirtySessions, dirtyClasses, isAutoSaving, isExporting,
      classes, classesData, isLoading, error,
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

// Returns shift number (1, 2, 3) from teaching_shift string, or 0 if unknown
export const normalizeShift = (shift?: string | null): number => {
  if (!shift) return 0;
  const m = shift.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};

export default useBulkAttendanceEntry;
