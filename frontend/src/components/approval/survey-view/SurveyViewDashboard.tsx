import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CardTitle, CardDescription } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import {
  Eye,
  BarChart3,
  AlertTriangle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  LayoutGrid,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '../../ui/dropdown-menu';
import surveyApprovalService, { PublishedSurvey, ResponseFilters } from '../../../services/surveyApproval';
import { surveyService } from '../../../services/surveys';
import SurveyResponsesDataTable from './SurveyResponsesDataTable';
import UnifiedSurveySelector from '../UnifiedSurveySelector';
import { storageHelpers } from '@/utils/helpers';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'surveyViewDashboard_selectedSurveyId';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Bütün statuslar' },
  { value: 'draft', label: 'Qaralama' },
  { value: 'submitted', label: 'Göndərilmiş' },
  { value: 'approved', label: 'Təsdiqlənmış' },
  { value: 'rejected', label: 'Rədd edilmiş' },
  { value: 'returned', label: 'Geri qaytarılmış' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface SurveyViewDashboardProps {
  forceSurveyId?: number;
  isCompact?: boolean;
  initialData?: PublishedSurvey;
  headerActions?: React.ReactNode;
}

const SurveyViewDashboard: React.FC<SurveyViewDashboardProps> = ({ forceSurveyId, isCompact, initialData, headerActions }) => {
  const [selectedSurvey, setSelectedSurvey] = useState<PublishedSurvey | null>(initialData || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Fetch published surveys
  const { data: publishedSurveys, isLoading: surveysLoading } = useQuery({
    queryKey: ['published-surveys-view'],
    queryFn: () => surveyApprovalService.getPublishedSurveys(),
    staleTime: 5 * 60 * 1000,
  });

  // Build filters for server-side request
  const activeStatus = statusFilter !== 'all' ? statusFilter : '';
  const filters: ResponseFilters = {
    per_page: pageSize,
    page: currentPage,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(activeStatus ? { status: activeStatus as ResponseFilters['status'] } : {}),
  };

  // Ensure we have questions for the survey
  const { data: fullSurveyData } = useQuery({
    queryKey: ['survey-full-details-view', selectedSurvey?.id],
    queryFn: () => selectedSurvey?.id ? surveyService.getById(selectedSurvey.id) : null,
    enabled: !!selectedSurvey?.id && (!selectedSurvey.questions || selectedSurvey.questions.length === 0),
  });

  const effectiveSurvey = (fullSurveyData as any)?.data || fullSurveyData || selectedSurvey;

  // Fetch survey responses
  const {
    data: responsesData,
    isLoading: responsesLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['survey-responses-view', effectiveSurvey?.id, filters],
    queryFn: () =>
      effectiveSurvey?.id
        ? surveyApprovalService.getResponsesForApproval(effectiveSurvey.id, filters)
        : null,
    enabled: !!effectiveSurvey?.id,
    keepPreviousData: true,
  } as any);

  // Fetch target institutions detailed info
  const { data: targetInstitutionsData, isLoading: targetLoading } = useQuery({
    queryKey: ['survey-target-institutions-details', effectiveSurvey?.id],
    queryFn: async () => {
      if (!effectiveSurvey?.target_institutions || effectiveSurvey.target_institutions.length === 0) return [];
      
      // We can use the hierarchical breakdown or similar to get names if they aren't in effectiveSurvey
      // For now, let's assume we want to show at least the names we have or fetch them.
      // If effectiveSurvey has target_institutions_data, use it.
      if ((effectiveSurvey as any).target_institutions_data) return (effectiveSurvey as any).target_institutions_data;
      
      // Fallback: use analytics or a dedicated endpoint to get institution names
      const analytics = await surveyService.getHierarchicalInstitutionsAnalytics(effectiveSurvey.id);
      
      // Flatten all schools from hierarchy
      const allSchools: any[] = [];
      const flatten = (nodes: any[]) => {
        nodes.forEach(node => {
          if (node.level === 4) allSchools.push(node);
          if (node.children) flatten(node.children);
        });
      };
      if (analytics?.nodes) flatten(analytics.nodes);
      
      return allSchools;
    },
    enabled: !!effectiveSurvey?.id,
  });

  // ─── Merge responses with target institutions ────────────────────────────────
  const mergedData = useMemo(() => {
    if (!effectiveSurvey) return [];
    
    const responses = responsesData?.responses || [];
    const targetSchools = targetInstitutionsData || [];
    
    // Create a map of responses by institution_id
    const responseMap = new Map();
    responses.forEach((r: any) => {
      const instId = r.institution_id || r.respondent?.institution_id;
      if (instId) {
        if (!responseMap.has(instId)) responseMap.set(instId, []);
        responseMap.get(instId).push(r);
      }
    });

    const result: any[] = [];
    const processedInstIds = new Set();

    // 1. Add institutions with responses
    responses.forEach((r: any) => {
      result.push(r);
      const instId = r.institution_id || r.respondent?.institution_id;
      if (instId) processedInstIds.add(instId);
    });

    // 2. Add target institutions that HAVEN'T responded (only if no status filter or "all" or something specific)
    if (statusFilter === 'all' || statusFilter === 'none') {
      targetSchools.forEach((school: any) => {
        if (!processedInstIds.has(school.id)) {
          result.push({
            id: `missing-${school.id}`,
            institution_id: school.id,
            institution: {
              id: school.id,
              name: school.name,
              type: school.type
            },
            status: 'none', // Special status for "No response"
            responses: {},
            created_at: null,
            submitted_at: null,
            is_placeholder: true
          });
        }
      });
    }

    // Apply client-side search if needed (server-side already filtered existing responses)
    if (debouncedSearch) {
      return result.filter(item => 
        item.institution?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.respondent?.username?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.respondent?.profile?.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    return result;
  }, [responsesData, targetInstitutionsData, effectiveSurvey, statusFilter, debouncedSearch]);

  // ─── Column visibility logic ──────────────────────────────────────────────────
  const allColumns = useMemo(() => {
    const cols = [
      { id: 'institution', label: 'Müəssisə', isFixed: true },
      { id: 'status', label: 'Status', isFixed: true },
    ];
    
    if (effectiveSurvey?.questions) {
      effectiveSurvey.questions.forEach((q: any) => {
        if (q.is_active !== false) {
          cols.push({ 
            id: String(q.id), 
            label: q.title || q.question || `Sual ${q.id}`,
            isFixed: false 
          });
        }
      });
    }
    return cols;
  }, [effectiveSurvey]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Initialize visible columns when survey changes
  useEffect(() => {
    setVisibleColumns(allColumns.map(c => c.id));
  }, [allColumns]);

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Unified Analytics for consistent stats across tabs
  const { data: analyticsData } = useQuery({
    queryKey: ['survey-analytics-overview', effectiveSurvey?.id],
    queryFn: () => effectiveSurvey?.id ? surveyService.getSurveyAnalyticsOverview(effectiveSurvey.id) : null,
    enabled: !!effectiveSurvey?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Sync state with initialData or forced survey
  useEffect(() => {
    if (initialData) {
      setSelectedSurvey(initialData);
      return;
    }

    if (forceSurveyId) {
      const forcedFromList = Array.isArray(publishedSurveys) 
        ? (publishedSurveys as any[]).find((s: any) => s.id === forceSurveyId)
        : null;

      if (forcedFromList) {
        setSelectedSurvey(forcedFromList);
      } else {
        surveyService.getById(forceSurveyId).then(response => {
          if (response.data) {
            const survey = response.data;
            setSelectedSurvey({
              id: survey.id,
              title: survey.title,
              description: survey.description,
              start_date: survey.start_date,
              end_date: survey.end_date,
              target_institutions: survey.target_institutions,
              response_count: survey.response_count,
              questions: survey.questions?.map((q: any) => ({
                id: q.id!,
                title: q.question || (q as any).title,
                type: q.type,
                options: q.options,
                required: q.required,
                order_index: q.order
              }))
            } as any);
          }
        }).catch(err => console.error("Failed to fetch forced survey:", err));
      }
      return;
    }
  }, [publishedSurveys, initialData, forceSurveyId]);

  const handleSurveySelect = (survey: PublishedSurvey) => {
    setSelectedSurvey(survey);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const isFiltered = searchTerm !== '' || statusFilter !== 'all';
  const responses = responsesData?.responses || [];
  const totalItems = responsesData?.pagination?.total || 0;
  const totalPages = responsesData?.pagination?.last_page || 1;
  const stats = responsesData?.stats;

  if (surveysLoading && !selectedSurvey) {
    return <div className="flex items-center justify-center p-12">Yüklənir...</div>;
  }

  return (
    <div className={cn("flex flex-col h-full", isCompact ? "bg-white" : "container mx-auto py-6 space-y-6")}>
      {!isCompact && (
        <div className="flex items-center justify-between mb-2">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-7 w-7 text-primary" /> Sorğu Cavablarına Baxış
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              Bütün müəssisələr üzrə göndərilmiş cavabların detallı siyahısı
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={responsesLoading || isFetching} className="h-9 shadow-sm">
            <RefreshCw className={cn("h-4 w-4 mr-2", (responsesLoading || isFetching) && "animate-spin")} /> Yenilə
          </Button>
        </div>
      )}

      {!isCompact && (
        <UnifiedSurveySelector
          surveys={publishedSurveys || []}
          selectedSurvey={selectedSurvey}
          onSurveySelect={handleSurveySelect as any}
          isLoading={surveysLoading}
        />
      )}

      {selectedSurvey && (
        <div className={cn("flex flex-col flex-1 min-h-0", isCompact ? "" : "bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm")}>
          {/* Header Section (Not shown in compact as it's in the tab header) */}
          {!isCompact && (
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedSurvey.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedSurvey.response_count || 0} cavab verilmişdir
                </p>
              </div>
              {stats && (
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100">{stats.total} müəssisə</Badge>
                  {stats.approved > 0 && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100">{stats.approved} təsdiqlənib</Badge>}
                </div>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className={cn(
            "flex items-center gap-3 border-b bg-white transition-all",
            isCompact ? "px-6 py-2" : "flex-wrap p-4 bg-slate-50/30"
          )}>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-10 bg-white border-slate-200 transition-all",
                  isCompact ? "h-8 text-xs bg-slate-50 border-transparent focus:bg-white rounded-lg" : "h-10"
                )}
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={cn("bg-white border-slate-200", isCompact ? "w-36 h-8 text-[11px] rounded-lg border-transparent bg-slate-50" : "w-48 h-10")}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Column Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isCompact ? "sm" : "default"} className={cn("bg-white border-slate-200", isCompact ? "h-8 text-[11px] rounded-lg border-transparent bg-slate-50" : "h-10")}>
                  <LayoutGrid className="mr-2 h-3.5 w-3.5" /> Bütün sütunlar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel className="text-xs">Sütunları göstər/gizlə</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize text-xs"
                    checked={visibleColumns.includes(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Page size */}
            <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(parseInt(val))}>
              <SelectTrigger className={cn("bg-white border-slate-200", isCompact ? "w-24 h-8 text-[11px] rounded-lg border-transparent bg-slate-50" : "w-28 h-10")}>
                <SelectValue placeholder="Sətir" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()} className="text-xs">
                    {size} sətir
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Unified Header Stats - Realigned to Far Right with better styling */}
            {isCompact && analyticsData?.kpi_metrics && (
              <div className="flex items-center gap-2 ml-auto pl-4 border-l border-slate-100">
                {[
                  { label: 'Hədəf', value: analyticsData.kpi_metrics.target_participants || 0, color: 'blue' },
                  { label: 'Cavab', value: analyticsData.kpi_metrics.total_responses || 0, color: 'slate' },
                  { label: 'Gözləyən', value: analyticsData.kpi_metrics.in_progress_responses || 0, color: 'amber' },
                  { label: 'Təsdiq', value: analyticsData.kpi_metrics.completed_responses || 0, color: 'emerald' },
                ].map((stat) => (
                  <div key={stat.label} className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-bold",
                    stat.color === 'blue' ? "bg-blue-50 text-blue-700 border-blue-100" :
                    stat.color === 'emerald' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    stat.color === 'amber' ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-slate-50 text-slate-700 border-slate-200"
                  )}>
                    <span className="opacity-60 font-medium uppercase text-[9px]">{stat.label}:</span>
                    <span>{stat.value}</span>
                  </div>
                ))}
                
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-extrabold shadow-sm ml-1",
                  "bg-indigo-600 text-white border-indigo-700"
                )}>
                  <span className="opacity-80 font-medium uppercase text-[9px]">Tamamlanma:</span>
                  <span>
                    {analyticsData.kpi_metrics.target_participants 
                      ? Math.round(((analyticsData.kpi_metrics.completed_responses || 0) / analyticsData.kpi_metrics.target_participants) * 1000) / 10 
                      : 0}%
                  </span>
                </div>
              </div>
            )}

            {/* Clear filters */}
            {isFiltered && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className={cn("text-slate-500 hover:text-red-600", isCompact ? "h-8 text-[11px] px-2" : "h-10")}>
                <X className={cn("mr-1", isCompact ? "h-3 w-3" : "h-4 w-4")} />
                Sıfırla
              </Button>
            )}

            {!isCompact && headerActions && (
              <div className="ml-auto pl-4 border-l flex items-center">
                {headerActions}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-white">
            {responsesLoading ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="animate-spin h-8 w-8 text-primary mr-3" />
                <span className="text-muted-foreground text-sm font-medium">Cavablar yüklənir...</span>
              </div>
            ) : responses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
                <div className="bg-slate-50 p-4 rounded-full mb-3">
                   <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h4 className="text-slate-800 font-semibold mb-1">Məlumat tapılmadı</h4>
                <p className="text-slate-500 text-sm max-w-[280px]">
                  {isFiltered ? 'Bu filtr şərtlərinə uyğun cavab tapılmadı.' : 'Bu sorğuya hələ cavab verilməyib.'}
                </p>
                {isFiltered && (
                  <Button variant="link" onClick={handleClearFilters} className="mt-2 text-blue-600">
                    Filtrləri sıfırla
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn("flex flex-col h-full", isCompact ? "px-6 pb-6" : "")}>
                <div className="flex-1">
                  <SurveyResponsesDataTable 
                    responses={mergedData} 
                    selectedSurvey={effectiveSurvey} 
                    isFetching={isFetching || targetLoading} 
                    visibleColumns={visibleColumns}
                  />
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50 mt-auto shrink-0">
                    <div className="text-xs text-slate-500 font-medium">
                      {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalItems)} / {totalItems} müəssisə
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-200" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-200" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                      <div className="flex items-center gap-1 mx-1">
                        <span className="text-xs font-bold text-slate-700">{currentPage}</span>
                        <span className="text-xs text-slate-400">/ {totalPages}</span>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-200" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-200" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SurveyViewDashboard);
