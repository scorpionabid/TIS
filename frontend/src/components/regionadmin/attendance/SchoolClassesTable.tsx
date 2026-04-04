import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Building2, School as SchoolIcon, ChevronsUpDown, Check, Target, Shirt, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const numberFormatter = new Intl.NumberFormat('az');

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

interface ClassStat {
  grade_id?: number | string;
  class_level: number;
  name: string;
  student_count: number;
  reported_days: number;
  expected_school_days: number;
  average_attendance_rate: number;
  uniform_compliance_rate?: number;
  warnings?: string[];
}

interface ClassSummary {
  total_classes: number;
  reported_classes: number;
  attending_students: number;
  average_attendance_rate: number;
  uniform_compliance_rate?: number;
  total_uniform_violations?: number;
}

interface School {
  school_id: number;
  name: string;
}

interface SchoolClassesTableProps {
  classes: ClassStat[];
  loading: boolean;
  schoolName: string;
  schools: School[];
  selectedSchoolId: string;
  onSchoolChange: (id: string) => void;
  summary?: ClassSummary | null;
}

export function SchoolClassesTable({
  classes,
  loading,
  schoolName,
  schools,
  selectedSchoolId,
  onSchoolChange,
  summary,
}: SchoolClassesTableProps) {
  const [open, setOpen] = useState(false);

  const totalStudents = useMemo(
    () => classes.reduce((sum, cls) => sum + (cls.student_count ?? 0), 0),
    [classes]
  );

  const summaryCards = [
    {
      label: 'Sinif sayı',
      value: `${summary?.reported_classes ?? 0} / ${summary?.total_classes ?? 0}`,
      description: 'Sinif hesabat verib',
      icon: Building2,
      raw: summary?.total_classes ? ((summary?.reported_classes ?? 0) / summary.total_classes) * 100 : 0,
      palette: {
        bg: 'bg-indigo-50/50',
        border: 'border-indigo-100',
        accent: 'bg-indigo-200/20',
        text: 'text-indigo-600',
        icon: 'text-indigo-500',
        bar: 'bg-indigo-500'
      }
    },
    {
      label: 'Şagird sayı',
      value: numberFormatter.format(summary?.attending_students ?? 0),
      description: `${numberFormatter.format(totalStudents)} şagirddən ${numberFormatter.format(summary?.attending_students ?? 0)} nəfər gəlib`,
      icon: Users,
      raw: totalStudents > 0 ? ((summary?.attending_students ?? 0) / totalStudents) * 100 : 0,
      palette: {
        bg: 'bg-violet-50/50',
        border: 'border-violet-100',
        accent: 'bg-violet-200/20',
        text: 'text-violet-600',
        icon: 'text-violet-500',
        bar: 'bg-violet-500'
      }
    },
    {
      label: 'Orta davamiyyət',
      value: formatPercent(summary?.average_attendance_rate),
      description: `${classes[0]?.expected_school_days ?? 0} hesabat gününə görə`,
      icon: Target,
      raw: summary?.average_attendance_rate ?? 0,
      palette: {
        bg: 'bg-emerald-50/50',
        border: 'border-emerald-100',
        accent: 'bg-emerald-200/20',
        text: 'text-emerald-600',
        icon: 'text-emerald-500',
        bar: 'bg-emerald-500'
      }
    },
    {
      label: 'Məktəbli forma',
      value: formatPercent(summary?.uniform_compliance_rate),
      description: `${numberFormatter.format(summary?.total_uniform_violations ?? 0)} pozuntu`,
      icon: Shirt,
      raw: summary?.uniform_compliance_rate ?? 0,
      palette: {
        bg: 'bg-blue-50/50',
        border: 'border-blue-100',
        accent: 'bg-blue-200/20',
        text: 'text-blue-600',
        icon: 'text-blue-500',
        bar: 'bg-blue-500'
      }
    },
  ];


  return (
    <div className="space-y-4">
      {/* School selector + summary cards */}
      <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
        <CardContent className="p-4 sm:p-5">
            {/* Summary cards - Full row flex layout */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              {/* School Switcher as a 3D Card (Wide) */}
              <Card className="relative flex-[1.5] min-w-[240px] border-2 border-b-4 border-slate-900/10 bg-slate-50/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ring-1 ring-inset ring-white/40 group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-slate-900/5 rounded-bl-full transform translate-x-3 -translate-y-3" />
                <div className="flex items-center gap-3 p-3 pb-0 relative">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center ring-1 ring-black/5 shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <SchoolIcon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-black text-slate-500 tracking-[0.1em] uppercase opacity-70 mb-0.5 truncate">Məktəb</div>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1.5 w-full text-left">
                          <span className="text-sm font-black text-slate-800 tracking-tight leading-none truncate max-w-[200px]">
                            {schoolName || 'Məktəb seçin'}
                          </span>
                          <ChevronsUpDown className="h-3 w-3 text-slate-400 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Məktəb axtar..." />
                          <CommandList>
                            <CommandEmpty>Məktəb tapılmadı.</CommandEmpty>
                            <CommandGroup>
                              {schools.map((school) => (
                                <CommandItem
                                  key={school.school_id}
                                  value={school.name}
                                  onSelect={() => {
                                    onSchoolChange(String(school.school_id));
                                    setOpen(false);
                                  }}
                                  className="text-xs py-2"
                                >
                                  <Check className={cn('mr-2 h-4 w-4 shrink-0', selectedSchoolId === String(school.school_id) ? 'opacity-100' : 'opacity-0')} />
                                  {school.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <CardContent className="p-3 pt-1.5 pb-2.5 relative">
                  <p className="text-[10px] font-medium text-slate-400 mb-2 truncate">Tez keçid üçün seçin</p>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden shadow-inner border border-black/5">
                    <div className="h-full rounded-full bg-slate-900/60 w-full" />
                  </div>
                </CardContent>
              </Card>

              {summaryCards.map((card) => (
                <Card 
                  key={card.label} 
                  className={cn("relative flex-1 border-2 border-b-4 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-inset ring-white/40", card.palette.border, card.palette.bg)}
                >
                  <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-bl-full transform translate-x-3 -translate-y-3 group-hover:scale-110 transition-transform duration-500", card.palette.accent)} />
                  <div className="flex items-center gap-3 p-3 pb-0 relative">
                    <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center ring-1 ring-black/5 shrink-0 group-hover:scale-105 transition-transform duration-300">
                      <card.icon className={cn("h-5 w-5", card.palette.icon)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-[9px] font-black tracking-[0.1em] uppercase opacity-70 mb-0.5 truncate", card.palette.text)}>{card.label}</div>
                      <div className="text-xl font-black text-slate-800 tracking-tight leading-none truncate">{card.value}</div>
                    </div>
                  </div>
                  <CardContent className="p-3 pt-1.5 pb-2.5">
                    <p className="text-[10px] font-medium text-slate-400 mb-2 truncate">{card.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden shadow-inner border border-black/5">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-sm", card.palette.bar)}
                          style={{ width: `${Math.min(card.raw, 100)}%` }}
                        />
                      </div>
                      <span className={cn("text-[9px] font-bold min-w-[24px]", card.palette.text)}>{Math.round(card.raw)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </CardContent>
      </Card>

      {/* Classes table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold text-slate-900">Siniflər üzrə hesabat</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{schoolName || 'Məktəb seçin'}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : classes?.length ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Sinif</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Şagird</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Hesabat günləri</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Orta davamiyyət</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Məktəbli forma</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classStat) => (
                  <TableRow key={classStat.grade_id ?? `${classStat.class_level}-${classStat.name}`}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium flex items-center gap-2 text-sm">
                        <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                        {classStat.class_level}-{classStat.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium whitespace-nowrap">
                      <div className="text-slate-800 text-sm">
                        {numberFormatter.format(Math.round((classStat.student_count * (classStat.average_attendance_rate ?? 0)) / 100))}
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{numberFormatter.format(classStat.student_count)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm whitespace-nowrap">
                      {classStat.reported_days}/{classStat.expected_school_days}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-sm whitespace-nowrap">
                      {formatPercent(classStat.average_attendance_rate)}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-sm whitespace-nowrap">
                      {formatPercent(classStat.uniform_compliance_rate)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {classStat.warnings?.length ? (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5 py-0">
                          {classStat.warnings.includes('reports_missing')
                            ? 'Hesabat yoxdur'
                            : 'Aşağı davamiyyət'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-5">Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sinif məlumatı tapılmadı.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
