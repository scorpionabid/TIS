import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { TeacherAvailabilityModal } from './TeacherAvailabilityModal';
import { teacherAvailabilityService, TeacherAvailability } from '@/services/teacherAvailability';
import { academicYearService } from '@/services/academicYears';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TeacherAvailabilityWeekGrid } from './TeacherAvailabilityWeekGrid';

interface TeacherAvailabilityPanelProps {
  teacherId: number;
}

const typeBadgeVariant = (t: string) => {
  if (t === 'unavailable' || t === 'meeting' || t === 'training') return 'destructive';
  if (t === 'preferred') return 'default';
  return 'secondary';
};

export const TeacherAvailabilityPanel: React.FC<TeacherAvailabilityPanelProps> = ({ teacherId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [academicYearId, setAcademicYearId] = React.useState<number | null>(null);
  const [viewMode, setViewMode] = React.useState<'range' | 'slot'>('range');

  const { data: years, isLoading: yearsLoading } = useQuery({
    queryKey: ['academic-years', 'dropdown'],
    queryFn: () => academicYearService.getAllForDropdown(),
  });

  React.useEffect(() => {
    if (academicYearId) return;
    const active = years?.find((y) => y.is_active);
    if (active?.id) setAcademicYearId(active.id);
  }, [years, academicYearId]);

  const { data: listResponse, isLoading } = useQuery({
    queryKey: ['teacher-availabilities', teacherId, academicYearId],
    queryFn: () => teacherAvailabilityService.list({ teacher_id: teacherId, academic_year_id: academicYearId ?? undefined }),
    enabled: !!teacherId && !!academicYearId,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => teacherAvailabilityService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-availabilities', teacherId, academicYearId] });
      toast({ title: 'Silindi', description: 'Mövcudluq silindi' });
    },
    onError: () => {
      toast({ title: 'Xəta', description: 'Silinərkən xəta baş verdi', variant: 'destructive' });
    },
  });

  const items: TeacherAvailability[] = listResponse?.data || [];

  return (
    <Card className="border-slate-200">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Mövcudluq</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} disabled={!academicYearId}>
            <Plus className="h-4 w-4 mr-1" />
            Əlavə et
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground">Akademik il</div>
          {yearsLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <Select
              value={academicYearId?.toString() || ''}
              onValueChange={(v) => setAcademicYearId(parseInt(v, 10))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                {(years || []).map((y) => (
                  <SelectItem key={y.id} value={y.id.toString()}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'range' | 'slot')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="range">Saat aralığı</TabsTrigger>
            <TabsTrigger value="slot">Slot görünüş</TabsTrigger>
          </TabsList>

          <TabsContent value="range" className="mt-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : !academicYearId ? (
              <div className="text-sm text-muted-foreground">Akademik il seçin</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Hələ mövcudluq əlavə edilməyib</div>
            ) : (
              <div className="space-y-2">
                {items.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {a.day_of_week} · {a.start_time} - {a.end_time}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{a.reason || ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={typeBadgeVariant(a.availability_type)} className="capitalize">
                        {a.availability_type}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(a.id)}
                        disabled={removeMutation.isPending}
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="slot" className="mt-3">
            {!academicYearId ? (
              <div className="text-sm text-muted-foreground">Akademik il seçin</div>
            ) : isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <TeacherAvailabilityWeekGrid items={items} />
            )}
          </TabsContent>
        </Tabs>

        {academicYearId && (
          <TeacherAvailabilityModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            teacherId={teacherId}
            academicYearId={academicYearId}
          />
        )}
      </CardContent>
    </Card>
  );
};
