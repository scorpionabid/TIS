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
  uniform_compliance_rate: number;
  warnings?: string[];
}

interface ClassSummary {
  total_classes: number;
  reported_classes: number;
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
      value: summary?.total_classes ?? 0,
      sub: `${summary?.reported_classes ?? 0} sinif hesabat göndərib`,
      color: 'blue',
      icon: <Building2 className="h-3.5 w-3.5 text-white" />,
    },
    {
      label: 'Şagird sayı',
      value: numberFormatter.format(totalStudents),
      sub: 'Ümumi şagird sayı',
      color: 'amber',
      icon: <Users className="h-3.5 w-3.5 text-white" />,
    },
    {
      label: 'Orta davamiyyət',
      value: formatPercent(summary?.average_attendance_rate),
      sub: 'Seçilmiş dövr üzrə',
      color: 'emerald',
      icon: <Target className="h-3.5 w-3.5 text-white" />,
    },
    {
      label: 'Məktəbli forma',
      value: formatPercent(summary?.uniform_compliance_rate),
      sub: `${numberFormatter.format(summary?.total_uniform_violations ?? 0)} pozuntu`,
      color: 'violet',
      icon: <Shirt className="h-3.5 w-3.5 text-white" />,
    },
  ] as const;

  const colorMap: Record<string, { gradient: string; bar: string; text: string }> = {
    blue:    { gradient: 'from-blue-50 to-white',    bar: 'bg-blue-500',    text: 'text-blue-600'    },
    amber:   { gradient: 'from-amber-50 to-white',   bar: 'bg-amber-500',   text: 'text-amber-600'   },
    emerald: { gradient: 'from-emerald-50 to-white', bar: 'bg-emerald-500', text: 'text-emerald-600' },
    violet:  { gradient: 'from-violet-50 to-white',  bar: 'bg-violet-500',  text: 'text-violet-600'  },
  };

  return (
    <div className="space-y-4">
      {/* School selector + summary cards */}
      <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
            {/* School combobox */}
            <Card className="relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br from-slate-50 to-white lg:w-[300px] shrink-0">
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900/70 rounded-t-xl" />
              <CardContent className="p-3 pt-4">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Məktəb</p>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between font-normal h-10 rounded-xl border-[1.4px] border-slate-200 bg-white shadow-sm text-slate-700"
                    >
                      <span className="truncate text-left">
                        {schoolName || 'Məktəb seçin'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
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
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4 shrink-0',
                                  selectedSchoolId === String(school.school_id) ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span className="truncate">{school.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Summary cards */}
            {selectedSchoolId && (
              summary ? (
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:flex-1">
                  {summaryCards.map((card) => {
                    const c = colorMap[card.color];
                    return (
                      <Card
                        key={card.label}
                        className={cn('relative overflow-hidden rounded-xl shadow-none border border-slate-100 bg-gradient-to-br', c.gradient)}
                      >
                        <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-xl', c.bar)} />
                        <CardContent className="p-2.5 pt-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                              <p className={cn('text-lg font-bold', c.text)}>{card.value}</p>
                            </div>
                            <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center', c.bar)}>
                              {card.icon}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{card.sub}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : null
            )}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sinif</TableHead>
                  <TableHead className="text-center">Şagird</TableHead>
                  <TableHead className="text-center">Hesabat günləri</TableHead>
                  <TableHead className="text-center">Orta davamiyyət</TableHead>
                  <TableHead className="text-center">Məktəbli forma</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classStat) => (
                  <TableRow key={classStat.grade_id ?? `${classStat.class_level}-${classStat.name}`}>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                        {classStat.class_level}-{classStat.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {numberFormatter.format(classStat.student_count)}
                    </TableCell>
                    <TableCell className="text-center">
                      {classStat.reported_days}/{classStat.expected_school_days}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {formatPercent(classStat.average_attendance_rate)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {formatPercent(classStat.uniform_compliance_rate)}
                    </TableCell>
                    <TableCell className="text-center">
                      {classStat.warnings?.length ? (
                        <Badge variant="destructive">
                          {classStat.warnings.includes('reports_missing')
                            ? 'Hesabat yoxdur'
                            : 'Aşağı davamiyyət'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Sinif məlumatı tapılmadı.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
