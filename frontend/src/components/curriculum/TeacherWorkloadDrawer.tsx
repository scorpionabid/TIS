import { useState } from 'react';
import { Clock, Briefcase, CalendarRange, Calendar } from 'lucide-react';
import { SchoolTeacher } from '@/services/schoolAdmin';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeacherWorkloadPanel } from '@/components/teachers/TeacherWorkloadPanel';
import { TeacherWorkloadStats } from '@/components/teachers/TeacherWorkloadStats';
import { TeacherScheduleStats } from '@/components/teachers/TeacherScheduleStats';
import { AvailabilityManager } from '@/components/teachers/AvailabilityManager';

interface ShiftConfig {
  shift1: Record<string, unknown>;
  shift2: Record<string, unknown>;
}

const DEFAULT_SHIFT_CONFIG: ShiftConfig = {
  shift1: { name: 'I NÖVBƏ', lessonCount: 6, lessonDuration: 45, startTime: '08:00', color: 'blue', enabled: true, breaks: { smallBreakDuration: 10, bigBreakDuration: 20, bigBreakAfterLesson: 2 } },
  shift2: { name: 'II NÖVBƏ', lessonCount: 6, lessonDuration: 45, startTime: '14:00', color: 'orange', enabled: false, breaks: { smallBreakDuration: 10, bigBreakDuration: 20, bigBreakAfterLesson: 2 } },
};

interface Props {
  open: boolean;
  onClose: (open: boolean) => void;
  teacher: SchoolTeacher | null;
  institutionId: number | undefined;
  academicYearId: number | undefined;
  isLocked: boolean;
}

export function TeacherWorkloadDrawer({
  open,
  onClose,
  teacher,
  institutionId,
  academicYearId,
  isLocked,
}: Props) {
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig>(DEFAULT_SHIFT_CONFIG);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[95vw] sm:max-w-[1600px] p-0 border-l-0 shadow-2xl">
        <div className="h-full flex flex-col bg-white">
          <SheetHeader className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <Clock className="text-white h-6 w-6" />
              </div>
              <div>
                <SheetTitle className="text-xl font-black text-slate-900">
                  {teacher?.first_name
                    ? `${teacher.first_name} ${teacher.last_name}`
                    : 'Müəllim Detalları'}
                </SheetTitle>
                <SheetDescription className="text-slate-500 font-medium">
                  Dərs yükü və iş vaxtı idarəetməsi
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {teacher && (
            <div className="flex-1 overflow-y-auto p-8 scrollbar-premium">
              <Tabs defaultValue="workload" className="w-full space-y-8">
                <TabsList className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/50">
                  <TabsTrigger value="workload" className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                    <Briefcase className="h-4 w-4 mr-2" /> DƏRS YÜKÜ
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                    <Clock className="h-4 w-4 mr-2" /> İŞ VAXTI
                  </TabsTrigger>
                  <TabsTrigger value="timetable" className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                    <CalendarRange className="h-4 w-4 mr-2" /> DƏRS CƏDVƏLİ
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="workload" className="mt-0 focus-visible:outline-none">
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                      <TeacherWorkloadStats teacherId={teacher.id} />
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                      <TeacherWorkloadPanel
                        teacherId={teacher.id}
                        teacherName={`${teacher.first_name} ${teacher.last_name}`}
                        institutionId={institutionId}
                        academicYearId={academicYearId}
                        isLocked={isLocked}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="mt-0 focus-visible:outline-none">
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                      <TeacherScheduleStats teacherId={teacher.id} shifts={shiftConfig} />
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                      <Card className="rounded-[2rem] border-slate-200/60 shadow-premium overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-800">
                            <Calendar className="h-4 w-4 text-indigo-500" /> İŞ VAXTI QRAFİKİ
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <AvailabilityManager
                            teacherId={teacher.id}
                            externalShifts={shiftConfig}
                            onShiftsChange={setShiftConfig}
                            isLocked={isLocked}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="timetable" className="mt-0 focus-visible:outline-none">
                  <Card className="rounded-[2rem] border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-20">
                    <Calendar className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Dərs cədvəli tezliklə əlavə olunacaq</p>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
