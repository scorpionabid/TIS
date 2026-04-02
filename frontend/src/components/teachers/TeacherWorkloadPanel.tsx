import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workloadService } from '@/services/workload';
import { EDUCATION_TYPE_LABELS, EducationType } from '@/types/curriculum';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, BookOpen, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddWorkloadModal from '../workload/AddWorkloadModal';
import { cn } from '@/lib/utils';

interface TeacherWorkloadPanelProps {
  teacherId: number;
  teacherName: string;
  institutionId?: number;
  academicYearId?: number;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'substitute' | 'mentor' | 'practitioner';
}

interface WorkloadItem {
  id: number;
  class_id: number;
  class_name: string;
  subject_name: string;
  weekly_hours: number;
  is_teaching_activity?: boolean;
  is_extracurricular?: boolean;
  is_club?: boolean;
  education_type?: string;
}

const MAX_HOURS_BY_TYPE: Record<string, number> = {
  full_time: 24,
  part_time: 12,
  contract: 20,
  substitute: 18,
  mentor: 15,
  practitioner: 25,
};

export const TeacherWorkloadPanel: React.FC<TeacherWorkloadPanelProps> = ({ 
  teacherId, 
  teacherName,
  institutionId,
  academicYearId,
  employmentType = 'full_time'
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const { data: workloadData, isLoading: workloadLoading } = useQuery({
    queryKey: ['teacher-workload', teacherId],
    queryFn: () => workloadService.getTeacherWorkload(teacherId),
    enabled: !!teacherId,
  });

  const workload = workloadData?.data;
  const loads: WorkloadItem[] = workload?.loads || [];

  const maxHours = MAX_HOURS_BY_TYPE[employmentType] || 24;
  const currentTotal = workload?.total_hours || 0;
  const isNearLimit = (currentTotal / maxHours) >= 0.9;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      if (!window.confirm('Bu dərs yükünü silmək istədiyinizə əminsiniz?')) return Promise.reject();
      return workloadService.deleteTeachingLoad(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-workload', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['grade-subjects'] });
      toast({ title: 'Dərs yükü silindi' });
    },
  });

  const groupedLoads = useMemo(() => {
    return loads.reduce((acc: any, load) => {
      const gName = load.class_name || 'Digər';
      if (!acc[gName]) acc[gName] = [];
      acc[gName].push(load);
      return acc;
    }, {});
  }, [loads]);

  if (workloadLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Dərs Yükü</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Dərs Yükü
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">{currentTotal}</span>
                <span className="text-sm text-muted-foreground">/ {maxHours} saat</span>
                {workload && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    currentTotal > maxHours 
                      ? 'bg-red-100 text-red-700' 
                      : isNearLimit 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}>
                    {Math.max(0, maxHours - currentTotal).toFixed(1)} qalıq
                    {isNearLimit && ' ⚠️'}
                  </span>
                )}
              </div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{new Set(loads.map((l: any) => l.class_id)).size} sinif</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{loads.length} təyinat</span>
              </div>
              <Progress 
                value={Math.min((currentTotal / maxHours) * 100, 100)} 
                className={cn(
                  "w-32 h-1.5",
                  currentTotal > maxHours ? "bg-red-200" : isNearLimit ? "bg-yellow-200" : ""
                )}
              />
              {isNearLimit && (
                <span className="text-[10px] text-yellow-600">Limitə yaxın!</span>
              )}
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Əlavə Et
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <AddWorkloadModal
          teacherId={teacherId}
          teacherName={teacherName}
          institutionId={institutionId}
          academicYearId={academicYearId}
          isOpen={isAdding}
          onClose={() => setIsAdding(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['teacher-workload', teacherId] });
            queryClient.invalidateQueries({ queryKey: ['grade-subjects'] });
          }}
        />

        {loads.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">
                Təyin edilmiş dərslər ({loads.length})
              </div>
            </div>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-none">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="w-[40%] font-bold text-slate-600 uppercase text-[10px] tracking-wider">Sinif / Fənn</TableHead>
                    <th className="w-[15%] text-center font-bold text-slate-600 uppercase text-[10px] py-3">Dərs</th>
                    <th className="w-[15%] text-center font-bold text-slate-600 uppercase text-[10px] py-3">Məşğələ</th>
                    <th className="w-[15%] text-center font-bold text-slate-600 uppercase text-[10px] py-3">Dərnək</th>
                    <th className="w-[15%] text-right font-bold text-slate-600 uppercase text-[10px] pr-6 py-3">Cəmi</th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedLoads).map(([className, classLoads]: [string, any[]]) => {
                    const classTotalHours = classLoads.reduce((sum, l) => sum + (Number(l.weekly_hours) || 0), 0);
                    
                    return (
                      <React.Fragment key={className}>
                        <TableRow className="bg-slate-50/50 border-b border-slate-100">
                          <TableCell colSpan={4} className="py-2 pl-4">
                            <span className="font-bold text-slate-900 text-xs">{className}</span>
                          </TableCell>
                          <TableCell className="text-right py-2 pr-6">
                            <span className="font-bold text-slate-900 text-xs">{classTotalHours.toFixed(1)}</span>
                          </TableCell>
                        </TableRow>

                        {classLoads.map((load) => (
                          <TableRow key={load.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="py-3 pl-8">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-700">{load.subject_name}</span>
                                {load.education_type && (
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                    {EDUCATION_TYPE_LABELS[load.education_type as EducationType] || load.education_type}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {load.is_teaching_activity ? (
                                <span className="font-bold text-slate-700">{load.weekly_hours}</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {load.is_extracurricular ? (
                                <span className="font-bold text-slate-700">{load.weekly_hours}</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {load.is_club ? (
                                <span className="font-bold text-slate-700">{load.weekly_hours}</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-right py-3 pr-6">
                              <div className="flex items-center justify-end gap-3">
                                <span className="font-black text-slate-900">{load.weekly_hours}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                  onClick={() => deleteMutation.mutate(load.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="border rounded-lg px-4 py-3 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ümumi dərs yükü</span>
              <span className="text-sm font-black text-slate-900">{currentTotal.toFixed(1)} saat/həftə</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Hələ dərs yükü təyin edilməyib</p>
            <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-bold"
                onClick={() => setIsAdding(true)}
            >
                <Plus className="h-4 w-4 mr-1" /> İndi əlavə et
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
