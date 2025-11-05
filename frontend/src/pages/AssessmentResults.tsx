import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  BookOpen,
  Users,
  UserCheck,
  Check,
  ChevronsUpDown,
  Columns,
  FileSearch,
  AlignJustify,
  LayoutList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { assessmentTypeService, AssessmentTypeDropdownItem, AssessmentStage } from '@/services/assessmentTypes';
import { schoolAssessmentService } from '@/services/schoolAssessments';
import { hierarchyService, HierarchyNode } from '@/services/hierarchy';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SummaryResponse {
  fields: Array<{
    key: string;
    label: string;
    input_type: string;
    scope: string;
    aggregation: string;
  }>;
  rows: Array<{
    institution_id: number;
    institution_name: string;
    region_name?: string | null;
    class_label: string;
    grade_level?: string | null;
    subject?: string | null;
    scheduled_date?: string | null;
    recorded_at?: string | null;
    student_count?: number | null;
    participant_count?: number | null;
    metadata: Record<string, any>;
  }>;
  summary: {
    total_classes: number;
    total_students: number;
    total_participants: number;
    fields: Record<string, number | null>;
  };
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface Institution {
  id: number;
  name: string;
  parent_id?: number | null;
}

interface ColumnVisibility {
  region: boolean;
  grade: boolean;
  subject: boolean;
  date: boolean;
}

export default function AssessmentResults() {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(50);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('comfortable');
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    region: true,
    grade: true,
    subject: true,
    date: true,
  });

  const { toast } = useToast();
  const { currentUser, hasRole } = useAuth();

  const { data: typeDropdown, isLoading: typesLoading } = useQuery({
    queryKey: ['assessment-types-dropdown'],
    queryFn: () => assessmentTypeService.getAssessmentTypesDropdown(),
    staleTime: 1000 * 60 * 10,
  });

  const { data: stages, refetch: refetchStages } = useQuery({
    queryKey: ['assessment-stages', selectedTypeId],
    queryFn: () => assessmentTypeService.getStages(selectedTypeId!),
    enabled: !!selectedTypeId,
  });

  // Fetch all sectors (level 3 = sektor)
  const { data: sectorsResponse } = useQuery({
    queryKey: ['sectors-level-3'],
    queryFn: () => hierarchyService.getInstitutionsByLevel(3),
    enabled: hasRole(['superadmin', 'regionadmin']),
    staleTime: 1000 * 60 * 10,
  });

  const sectors = sectorsResponse?.data ?? [];

  // Fetch all institutions (schools)
  const { data: institutions } = useQuery({
    queryKey: ['institutions-list'],
    queryFn: async () => {
      const { apiClient } = await import('@/services/api');
      const response = await apiClient.get('/institutions');
      return response.data?.data ?? response.data ?? [];
    },
    enabled: hasRole(['superadmin', 'regionadmin']),
    staleTime: 1000 * 60 * 10,
  });

  // Filter schools by selected sector
  const filteredSchools = useMemo(() => {
    if (!institutions) return [];

    let schools = institutions as Institution[];

    // Filter by sector if selected
    if (selectedSectorId) {
      schools = schools.filter((school: Institution) => school.parent_id === selectedSectorId);
    }

    // Filter by search query
    if (schoolSearchQuery) {
      const query = schoolSearchQuery.toLowerCase();
      schools = schools.filter((school: Institution) =>
        school.name.toLowerCase().includes(query)
      );
    }

    return schools;
  }, [institutions, selectedSectorId, schoolSearchQuery]);

  useEffect(() => {
    if (typeDropdown && typeDropdown.length > 0 && !selectedTypeId) {
      setSelectedTypeId(typeDropdown[0].id);
    }
  }, [typeDropdown, selectedTypeId]);

  useEffect(() => {
    if (selectedTypeId) {
      refetchStages();
    }
  }, [selectedTypeId, refetchStages]);

  useEffect(() => {
    if (stages && stages.length > 0 && !selectedStageId) {
      setSelectedStageId(stages[0].id);
    }
  }, [stages, selectedStageId]);

  const { data: reportData, isLoading: reportLoading, refetch: refetchReport } = useQuery<SummaryResponse | undefined>({
    queryKey: ['assessment-summary', selectedTypeId, selectedStageId, selectedInstitutionId, currentPage, perPage],
    queryFn: async () => {
      if (!selectedTypeId || !selectedStageId) return undefined;
      return schoolAssessmentService.getSummaryReport({
        assessment_type_id: selectedTypeId,
        assessment_stage_id: selectedStageId,
        institution_id: selectedInstitutionId || undefined,
        per_page: perPage,
        page: currentPage,
      });
    },
    enabled: !!selectedTypeId && !!selectedStageId,
  });

  const summary = reportData?.summary;
  const fields = reportData?.fields ?? [];
  const rows = reportData?.rows ?? [];
  const pagination = reportData?.pagination;

  // Sorting (client-side for current page)
  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows;

    return [...rows].sort((a, b) => {
      let aVal: any = null;
      let bVal: any = null;

      switch (sortColumn) {
        case 'institution':
          aVal = a.institution_name || '';
          bVal = b.institution_name || '';
          break;
        case 'class':
          aVal = a.class_label || '';
          bVal = b.class_label || '';
          break;
        case 'subject':
          aVal = a.subject || '';
          bVal = b.subject || '';
          break;
        case 'students':
          aVal = a.student_count || 0;
          bVal = b.student_count || 0;
          break;
        case 'participants':
          aVal = a.participant_count || 0;
          bVal = b.participant_count || 0;
          break;
        case 'participation_rate':
          const aRate = (a.student_count ?? 0) > 0
            ? ((a.participant_count ?? 0) / (a.student_count ?? 1)) * 100
            : 0;
          const bRate = (b.student_count ?? 0) > 0
            ? ((b.participant_count ?? 0) / (b.student_count ?? 1)) * 100
            : 0;
          aVal = aRate;
          bVal = bRate;
          break;
        default:
          // Field sorting
          aVal = a.metadata?.[sortColumn] ?? 0;
          bVal = b.metadata?.[sortColumn] ?? 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRefresh = async () => {
    try {
      await refetchReport();
      toast({ title: 'Yeniləndi', description: 'Hesabat məlumatları yeniləndi.' });
    } catch (err: any) {
      toast({ title: 'Xəta', description: err.message || 'Hesabat yenilənmədi.', variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    if (!selectedTypeId || !selectedStageId) return;

    setIsExporting(true);
    try {
      const blob = await schoolAssessmentService.exportSummaryReport({
        assessment_type_id: selectedTypeId,
        assessment_stage_id: selectedStageId,
        institution_id: selectedInstitutionId || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const typeName = typeDropdown?.find(t => t.id === selectedTypeId)?.name || 'Qiymetlendirme';
      const stageName = stages?.find(s => s.id === selectedStageId)?.name || 'Merhele';
      const fileName = `Hesabat_${typeName}_${stageName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: 'Excel yükləndi', description: 'Hesabat uğurla Excel faylına köçürüldü.' });
    } catch (err: any) {
      toast({ title: 'Xəta', description: err.message || 'Excel yüklənmədi.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const getParticipationRate = (studentCount: number | null, participantCount: number | null): number => {
    if (!studentCount || studentCount === 0) return 0;
    return Math.round(((participantCount || 0) / studentCount) * 100);
  };

  const getParticipationBadgeVariant = (rate: number): "default" | "secondary" | "destructive" | "outline" => {
    if (rate >= 80) return "default";
    if (rate >= 50) return "secondary";
    return "destructive";
  };

  const overallParticipationRate = getParticipationRate(summary?.total_students ?? 0, summary?.total_participants ?? 0);

  // Pagination helper
  const getPageNumbers = () => {
    if (!pagination) return [];
    const { current_page, last_page } = pagination;
    const pages: number[] = [];

    // Always show current page and neighbors
    const start = Math.max(1, current_page - 1);
    const end = Math.min(last_page, current_page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  // Compact date format helper
  const formatCompactDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return (
      <div className="text-xs leading-tight">
        <div>{`${day}.${month}`}</div>
        <div className="text-muted-foreground">{`${hours}:${minutes}`}</div>
      </div>
    );
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-3 w-3 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="ml-2 h-3 w-3" />
      : <ChevronDown className="ml-2 h-3 w-3" />;
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Qiymətləndirmə Nəticələri</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={reportLoading}>
              {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yenilə'}
            </Button>
            {reportData && rows.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yüklənir
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Minimalist Filters */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          <div className="flex flex-wrap gap-2 flex-1">
            {/* Tip */}
            <Select
              value={selectedTypeId ? selectedTypeId.toString() : ''}
              onValueChange={(value) => {
                setSelectedTypeId(Number(value));
                setSelectedStageId(null);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={typesLoading ? 'Yüklənir...' : 'Tip seçin'} />
              </SelectTrigger>
              <SelectContent>
                {typeDropdown?.map((item: AssessmentTypeDropdownItem) => (
                  <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mərhələ */}
            <Select
              value={selectedStageId ? selectedStageId.toString() : ''}
              onValueChange={(value) => {
                setSelectedStageId(Number(value));
                setCurrentPage(1);
              }}
              disabled={!stages || stages.length === 0}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={stages?.length ? 'Mərhələ' : 'Əvvəl tip'} />
              </SelectTrigger>
              <SelectContent>
                {stages?.map((stage: AssessmentStage) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sektor - SuperAdmin/RegionAdmin only */}
            {hasRole(['superadmin', 'regionadmin']) && sectors.length > 0 && (
              <Select
                value={selectedSectorId ? selectedSectorId.toString() : 'all'}
                onValueChange={(value) => {
                  setSelectedSectorId(value === 'all' ? null : Number(value));
                  setSelectedInstitutionId(null); // Reset school selection
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sektor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün sektorlar</SelectItem>
                  {sectors.map((sector: HierarchyNode) => (
                    <SelectItem key={sector.id} value={sector.id.toString()}>{sector.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Məktəb - Combobox with search */}
            {hasRole(['superadmin', 'regionadmin']) && institutions && (
              <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={schoolOpen}
                    className="w-[280px] justify-between"
                  >
                    {selectedInstitutionId
                      ? filteredSchools.find((s: Institution) => s.id === selectedInstitutionId)?.name
                      : "Məktəb axtar..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Məktəb axtar..."
                      value={schoolSearchQuery}
                      onValueChange={setSchoolSearchQuery}
                    />
                    <CommandEmpty>Məktəb tapılmadı.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      <CommandItem
                        onSelect={() => {
                          setSelectedInstitutionId(null);
                          setSchoolOpen(false);
                          setCurrentPage(1);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !selectedInstitutionId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {selectedSectorId
                          ? `Bütün məktəblər (${filteredSchools.length})`
                          : 'Bütün məktəblər'}
                      </CommandItem>
                      {filteredSchools.map((school: Institution) => (
                        <CommandItem
                          key={school.id}
                          onSelect={() => {
                            setSelectedInstitutionId(school.id);
                            setSchoolOpen(false);
                            setCurrentPage(1);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedInstitutionId === school.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {school.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Table Controls */}
          {reportData && rows.length > 0 && (
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} size="sm">
                <ToggleGroupItem value="comfortable" aria-label="Comfortable view">
                  <AlignJustify className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="compact" aria-label="Compact view">
                  <LayoutList className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="h-4 w-4 mr-2" />
                    Sütunlar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.region}
                    onCheckedChange={(v) => setColumnVisibility(prev => ({ ...prev, region: v }))}
                  >
                    Region
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.grade}
                    onCheckedChange={(v) => setColumnVisibility(prev => ({ ...prev, grade: v }))}
                  >
                    Sinif səviyyəsi
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.subject}
                    onCheckedChange={(v) => setColumnVisibility(prev => ({ ...prev, subject: v }))}
                  >
                    Fənn
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.date}
                    onCheckedChange={(v) => setColumnVisibility(prev => ({ ...prev, date: v }))}
                  >
                    Tarix
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Inline Statistics */}
        {reportData && summary && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="font-medium text-foreground">{summary.total_classes}</span> sinif
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{summary.total_students}</span> şagird
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" />
              <span className="font-medium text-foreground">{summary.total_participants}</span> iştirakçı
            </span>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant={getParticipationBadgeVariant(overallParticipationRate)} className="text-xs">
              {overallParticipationRate}% iştirak
            </Badge>
          </div>
        )}
      </div>

      {/* Results Table */}
      {reportLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Məktəb</TableHead>
                    <TableHead>Sinif</TableHead>
                    <TableHead>Fənn</TableHead>
                    <TableHead>Şagird</TableHead>
                    <TableHead>İştirakçı</TableHead>
                    <TableHead>İştirak %</TableHead>
                    <TableHead>Tarix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : !reportData ? (
        <div className="text-center text-muted-foreground py-12">
          Zəhmət olmasa, tip və mərhələ seçin.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {sortedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FileSearch className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Nəticə tapılmadı</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Seçilmiş mərhələ və filtr üzrə hələ nəticə daxil edilməyib
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('institution')} className="h-8 p-0 hover:bg-transparent font-semibold">
                            Məktəb {renderSortIcon('institution')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('class')} className="h-8 p-0 hover:bg-transparent font-semibold">
                            Sinif {renderSortIcon('class')}
                          </Button>
                        </TableHead>
                        {columnVisibility.subject && (
                          <TableHead>
                            <Button variant="ghost" size="sm" onClick={() => handleSort('subject')} className="h-8 p-0 hover:bg-transparent font-semibold">
                              Fənn {renderSortIcon('subject')}
                            </Button>
                          </TableHead>
                        )}
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('students')} className="h-8 p-0 hover:bg-transparent font-semibold">
                            Şagird {renderSortIcon('students')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('participants')} className="h-8 p-0 hover:bg-transparent font-semibold">
                            İştirakçı {renderSortIcon('participants')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('participation_rate')} className="h-8 p-0 hover:bg-transparent font-semibold">
                            İştirak % {renderSortIcon('participation_rate')}
                          </Button>
                        </TableHead>
                        {fields.map(field => (
                          <TableHead key={field.key}>
                            <Button variant="ghost" size="sm" onClick={() => handleSort(field.key)} className="h-8 p-0 hover:bg-transparent font-semibold">
                              {field.label} {renderSortIcon(field.key)}
                            </Button>
                          </TableHead>
                        ))}
                        {columnVisibility.date && <TableHead className="font-semibold">Tarix</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRows.map((row, idx) => {
                        const participationRate = getParticipationRate(row.student_count, row.participant_count);
                        return (
                          <TableRow
                            key={`${row.institution_id}-${row.class_label}-${idx}`}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <TableCell className={cn(viewMode === 'compact' ? 'py-2' : 'py-3')}>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{row.institution_name}</span>
                                {columnVisibility.region && row.region_name && (
                                  <Badge variant="outline" className="text-xs">
                                    {row.region_name}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={cn(viewMode === 'compact' ? 'py-2' : 'py-3')}>
                              <div>
                                <div className="font-semibold">{row.class_label}</div>
                                {columnVisibility.grade && row.grade_level && (
                                  <div className="text-xs text-muted-foreground">{row.grade_level}</div>
                                )}
                              </div>
                            </TableCell>
                            {columnVisibility.subject && (
                              <TableCell className={cn(viewMode === 'compact' ? 'py-2 text-xs' : 'py-3 text-sm')}>
                                {row.subject || '—'}
                              </TableCell>
                            )}
                            <TableCell className={cn(viewMode === 'compact' ? 'py-2 text-xs' : 'py-3 text-sm')}>
                              {row.student_count ?? '—'}
                            </TableCell>
                            <TableCell className={cn(viewMode === 'compact' ? 'py-2 text-xs' : 'py-3 text-sm')}>
                              {row.participant_count ?? '—'}
                            </TableCell>
                            <TableCell className={cn(viewMode === 'compact' ? 'py-2' : 'py-3')}>
                              <Badge variant={getParticipationBadgeVariant(participationRate)} className={cn(viewMode === 'compact' && 'text-xs')}>
                                {participationRate}%
                              </Badge>
                            </TableCell>
                            {fields.map(field => (
                              <TableCell key={`${row.institution_id}-${field.key}-${idx}`} className={cn(viewMode === 'compact' ? 'py-2 text-xs' : 'py-3 text-sm')}>
                                {row.metadata?.[field.key] ?? '—'}
                              </TableCell>
                            ))}
                            {columnVisibility.date && (
                              <TableCell className={cn(viewMode === 'compact' ? 'py-2' : 'py-3')}>
                                {formatCompactDate(row.recorded_at)}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {pagination && pagination.last_page > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        Səhifə {pagination.current_page} / {pagination.last_page}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <Select value={perPage.toString()} onValueChange={(v) => {
                        setPerPage(Number(v));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        Cəmi: {pagination.total}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={pagination.current_page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronLeft className="h-4 w-4 -ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={pagination.current_page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Əvvəlki
                      </Button>

                      {/* Page Numbers */}
                      {pagination.current_page > 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                        >
                          1
                        </Button>
                      )}
                      {pagination.current_page > 3 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}

                      {getPageNumbers().map(page => (
                        <Button
                          key={page}
                          variant={page === pagination.current_page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}

                      {pagination.current_page < pagination.last_page - 2 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      {pagination.current_page < pagination.last_page - 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(pagination.last_page)}
                        >
                          {pagination.last_page}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(pagination.last_page, prev + 1))}
                        disabled={pagination.current_page === pagination.last_page}
                      >
                        Növbəti
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(pagination.last_page)}
                        disabled={pagination.current_page === pagination.last_page}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4 -ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
