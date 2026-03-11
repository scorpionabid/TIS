import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Calendar,
  RefreshCw,
  Save,
  CheckSquare,
  Camera,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  preschoolAttendanceService,
  type PreschoolGroupWithAttendance,
  type SaveAttendanceGroupItem,
} from '@/services/preschoolAttendance';
import { PreschoolPhotoModal } from './components/PreschoolPhotoModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

const todayStr = (): string => format(new Date(), 'yyyy-MM-dd');

const getRateBadgeVariant = (
  rate: number
): 'default' | 'secondary' | 'destructive' => {
  if (rate >= 90) return 'default';
  if (rate >= 75) return 'secondary';
  return 'destructive';
};

// ─── Component ───────────────────────────────────────────────────────────────

const PreschoolAttendanceEntry: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  // group_id → present_count (local edits)
  const [localPresent, setLocalPresent] = useState<Record<number, number>>({});
  const [localNotes, setLocalNotes] = useState<Record<number, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [photoModalGroupId, setPhotoModalGroupId] = useState<number | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['preschool-attendance', selectedDate],
    queryFn: () => preschoolAttendanceService.getForDate(selectedDate),
    staleTime: 0,
  });

  const groups: PreschoolGroupWithAttendance[] = data?.data?.groups ?? [];

  // ── Sync server data → local state when date changes ──────────────────────
  const syncFromServer = useCallback(
    (serverGroups: PreschoolGroupWithAttendance[]) => {
      const presentMap: Record<number, number> = {};
      const notesMap: Record<number, string> = {};
      for (const g of serverGroups) {
        presentMap[g.group_id] =
          g.attendance?.present_count ?? g.total_enrolled;
        notesMap[g.group_id] = g.attendance?.notes ?? '';
      }
      setLocalPresent(presentMap);
      setLocalNotes(notesMap);
      setIsDirty(false);
    },
    []
  );

  React.useEffect(() => {
    if (groups.length > 0) {
      syncFromServer(groups);
    }
  }, [data, groups.length, syncFromServer]);

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: {
      attendance_date: string;
      groups: SaveAttendanceGroupItem[];
    }) => preschoolAttendanceService.saveAttendance(payload),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Davamiyyət saxlandı');
      void queryClient.invalidateQueries({
        queryKey: ['preschool-attendance', selectedDate],
      });
      setIsDirty(false);
    },
    onError: () => toast.error('Davamiyyət saxlanılmadı. Yenidən cəhd edin.'),
  });

  // ── Upload photos mutation ─────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: ({
      attendanceId,
      files,
    }: {
      attendanceId: number;
      files: File[];
    }) => preschoolAttendanceService.uploadPhotos(attendanceId, files),
    onSuccess: () => {
      toast.success('Şəkillər yükləndi');
      void queryClient.invalidateQueries({
        queryKey: ['preschool-attendance', selectedDate],
      });
    },
    onError: (err: Error) =>
      toast.error(err.message ?? 'Şəkil yüklənmədi'),
  });

  // ── Delete photo mutation ─────────────────────────────────────────────────
  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) =>
      preschoolAttendanceService.deletePhoto(photoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['preschool-attendance', selectedDate],
      });
    },
    onError: () => toast.error('Şəkil silinmədi'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePresentChange = (
    groupId: number,
    value: number,
    maxEnrolled: number
  ) => {
    const clamped = Math.max(0, Math.min(value, maxEnrolled));
    setLocalPresent((prev) => ({ ...prev, [groupId]: clamped }));
    setIsDirty(true);
  };

  const handleMarkAllPresent = () => {
    const allPresent: Record<number, number> = {};
    for (const g of groups) {
      allPresent[g.group_id] = g.total_enrolled;
    }
    setLocalPresent(allPresent);
    setIsDirty(true);
    toast.info('Bütün qruplar: hamı iştirak edir olaraq işarələndi');
  };

  const handleSave = () => {
    const payload = {
      attendance_date: selectedDate,
      groups: groups.map((g) => ({
        group_id: g.group_id,
        present_count: localPresent[g.group_id] ?? g.total_enrolled,
        notes: localNotes[g.group_id] || undefined,
      })),
    };
    saveMutation.mutate(payload);
  };

  const handleDateChange = (newDate: string) => {
    if (isDirty) {
      const confirmed = window.confirm(
        'Saxlanılmamış dəyişikliklər var. Davam etmək istəyirsiniz?'
      );
      if (!confirmed) return;
    }
    setSelectedDate(newDate);
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let totalEnrolled = 0;
    let totalPresent = 0;
    for (const g of groups) {
      totalEnrolled += g.total_enrolled;
      totalPresent += localPresent[g.group_id] ?? g.total_enrolled;
    }
    const avgRate =
      totalEnrolled > 0
        ? Math.round((totalPresent / totalEnrolled) * 100)
        : 0;
    return {
      totalEnrolled,
      totalPresent,
      totalAbsent: totalEnrolled - totalPresent,
      avgRate,
    };
  }, [groups, localPresent]);

  // ── Photo modal group ─────────────────────────────────────────────────────
  const photoModalGroup =
    photoModalGroupId !== null
      ? groups.find((g) => g.group_id === photoModalGroupId)
      : null;

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Məlumatlar yüklənərkən xəta baş verdi.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Davamiyyət Qeydiyyatı
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.institution?.name ?? ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date picker */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-sm border rounded px-2 py-1.5 bg-background"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllPresent}
            disabled={groups.length === 0}
          >
            <CheckSquare className="h-4 w-4 mr-1.5" />
            Hamısı iştirak edir
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      {groups.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { label: 'Qrup sayı', value: groups.length, icon: Users },
              {
                label: 'Cəmi uşaq',
                value: summary.totalEnrolled,
                icon: Users,
              },
              {
                label: 'İştirak',
                value: summary.totalPresent,
                icon: TrendingUp,
              },
              {
                label: 'Qayıb',
                value: summary.totalAbsent,
                icon: AlertCircle,
              },
            ] as const
          ).map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Groups table */}
      {groups.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Bu müəssisə üçün aktiv qrup tapılmadı. Əvvəlcə "Qruplar"
            bölməsindən qrup əlavə edin.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">
                    Qrup adı
                  </th>
                  <th className="text-center px-4 py-3 font-medium">
                    Uşaq sayı
                  </th>
                  <th className="text-center px-4 py-3 font-medium">
                    İştirak
                  </th>
                  <th className="text-center px-4 py-3 font-medium">
                    Qayıb
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Faiz</th>
                  <th className="text-center px-4 py-3 font-medium">Şəkil</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, idx) => {
                  const presentVal =
                    localPresent[group.group_id] ?? group.total_enrolled;
                  const absentVal = Math.max(
                    0,
                    group.total_enrolled - presentVal
                  );
                  const rate =
                    group.total_enrolled > 0
                      ? Math.round(
                          (presentVal / group.total_enrolled) * 100
                        )
                      : 0;
                  const photoCount =
                    group.attendance?.photos?.length ?? 0;

                  return (
                    <tr
                      key={group.group_id}
                      className={`border-b transition-colors hover:bg-muted/30 ${
                        idx % 2 === 0 ? '' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">
                        {group.group_name}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {group.total_enrolled}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          max={group.total_enrolled}
                          value={presentVal}
                          onChange={(e) =>
                            handlePresentChange(
                              group.group_id,
                              parseInt(e.target.value) || 0,
                              group.total_enrolled
                            )
                          }
                          className="w-20 h-8 text-center mx-auto"
                          disabled={group.attendance?.is_locked}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            absentVal > 0
                              ? 'text-destructive font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {absentVal}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={getRateBadgeVariant(rate)}>
                          {rate}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPhotoModalGroupId(group.group_id)
                          }
                          className="h-8 gap-1.5"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {photoCount > 0 && (
                            <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                              {photoCount}
                            </span>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Save button */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between">
          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              Saxlanılmamış dəyişikliklər var
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !isDirty}
            className="ml-auto"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Davamiyyəti Saxla
          </Button>
        </div>
      )}

      {/* Photo modal */}
      {photoModalGroup && (
        <PreschoolPhotoModal
          open={photoModalGroupId !== null}
          onClose={() => setPhotoModalGroupId(null)}
          groupName={photoModalGroup.group_name}
          photos={photoModalGroup.attendance?.photos ?? []}
          onUpload={(files) => {
            const attendanceId = photoModalGroup.attendance?.id;
            if (!attendanceId) {
              toast.error(
                'Əvvəlcə davamiyyəti saxlayın, sonra şəkil yükləyin.'
              );
              return;
            }
            uploadMutation.mutate({ attendanceId, files });
          }}
          onDelete={(photoId) => deletePhotoMutation.mutate(photoId)}
          isUploading={uploadMutation.isPending}
          isDeleting={deletePhotoMutation.isPending}
        />
      )}
    </div>
  );
};

export default PreschoolAttendanceEntry;
