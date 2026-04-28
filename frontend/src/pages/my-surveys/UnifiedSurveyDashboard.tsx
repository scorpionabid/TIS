import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Inbox, ClipboardList, Clock,
  CheckCircle2, FileEdit, RefreshCw, FileDown,
  LayoutGrid, List, Rows, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { surveyService } from '@/services/surveys';
import { cn } from '@/lib/utils';
import { SurveyResponseForm } from '@/components/surveys/SurveyResponseForm';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type FilterType = 'pending' | 'draft' | 'submitted';
type ViewMode  = 'card' | 'list' | 'compact';

interface UnifiedSurveyItem {
  id:           string;
  surveyId:     number;
  responseId?:  number;
  title:        string;
  description?: string;
  status:       'new' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'in_progress';
  deadline?:    string;
  lastUpdated?: string;
  isAnonymous:  boolean;
  questionsCount?: number;
}

const FILTER_CONFIG: Record<FilterType, { label: string; icon: React.ElementType }> = {
  pending:   { label: 'Gözləyənlər', icon: Clock       },
  draft:     { label: 'Qaralamalar', icon: FileEdit     },
  submitted: { label: 'Göndərilmiş', icon: CheckCircle2 },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new:       { label: 'Yeni',        cls: 'bg-blue-100 text-blue-700 border-blue-200'    },
  in_progress:{ label: 'Davam edir', cls: 'bg-sky-100 text-sky-700 border-sky-200'       },
  draft:     { label: 'Qaralama',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  submitted: { label: 'Göndərilib',  cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  approved:  { label: 'Təsdiqlənib', cls: 'bg-green-100 text-green-700 border-green-200' },
  rejected:  { label: 'Rədd edilib', cls: 'bg-red-100 text-red-700 border-red-200'       },
  completed: { label: 'Tamamlanıb',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const ROLE_LABELS: Record<string, string> = {
  schooladmin:    'Məktəb Admini',
  məktəbadmin:   'Məktəb Admini',
  preschooladmin: 'Məktəbəqədər Müəssisə Admini',
  müəllim:       'Müəllim',
  muavin:        'Müavin Direktor',
  ubr:           'UBR Mütəxəssisi',
  tesarrufat:    'Təsərrüfat Müdiri',
  psixoloq:      'Psixoloq',
};

const UnifiedSurveyDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const roleLabel      = ROLE_LABELS[(currentUser?.role ?? '').toLowerCase()] ?? 'İstifadəçi';
  const institutionName = (currentUser as any)?.institution?.name ?? '';

  const [activeFilter, setActiveFilter] = useState<FilterType>('pending');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [exporting,    setExporting]    = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'card';
    return (localStorage.getItem('survey-view-mode') as ViewMode) || 'card';
  });

  useEffect(() => { localStorage.setItem('survey-view-mode', viewMode); }, [viewMode]);

  const { data: assigned = [], isLoading: isLoadingAssigned } = useQuery({
    queryKey: ['assigned-surveys-unified'],
    queryFn: async () => {
      const res = await surveyService.getAssignedSurveys();
      return (res as any)?.data?.data || (res as any)?.data || res || [];
    },
  });

  const { data: responses = [], isLoading: isLoadingResponses, refetch: refetchResponses } = useQuery({
    queryKey: ['my-responses-unified'],
    queryFn: async () => {
      const res = await surveyService.getMyResponses();
      if (Array.isArray(res)) return res;
      const payload = (res as any)?.data;
      return payload?.data || payload || [];
    },
  });

  const unifiedList = useMemo<UnifiedSurveyItem[]>(() => {
    const list: UnifiedSurveyItem[] = [];
    const responseMap = new Map<number, any>();
    responses.forEach((r: any) => { responseMap.set(r.survey_id || r.survey?.id, r); });

    assigned.forEach((s: any) => {
      const resp = responseMap.get(s.id);
      if (resp) {
        list.push({
          id: `resp-${resp.id}`, surveyId: s.id, responseId: resp.id,
          title: s.title, description: s.description,
          status: resp.status, deadline: s.end_date || s.expires_at,
          lastUpdated: resp.updated_at || resp.last_saved_at,
          isAnonymous: s.is_anonymous, questionsCount: s.questions_count,
        });
        responseMap.delete(s.id);
      } else {
        list.push({
          id: `surv-${s.id}`, surveyId: s.id,
          title: s.title, description: s.description,
          status: 'new', deadline: s.end_date || s.expires_at,
          isAnonymous: s.is_anonymous, questionsCount: s.questions_count,
        });
      }
    });

    responseMap.forEach((resp, surveyId) => {
      list.push({
        id: `resp-${resp.id}`, surveyId, responseId: resp.id,
        title: resp.survey?.title || `Sorğu #${surveyId}`,
        description: resp.survey?.description,
        status: resp.status, deadline: resp.survey?.end_date,
        lastUpdated: resp.updated_at,
        isAnonymous: resp.survey?.is_anonymous || false,
        questionsCount: resp.survey?.questions_count,
      });
    });

    return list;
  }, [assigned, responses]);

  const counts = useMemo(() => ({
    pending:   unifiedList.filter(i => ['new', 'draft', 'in_progress'].includes(i.status)).length,
    draft:     unifiedList.filter(i => i.status === 'draft').length,
    submitted: unifiedList.filter(i => ['submitted', 'approved', 'rejected', 'completed'].includes(i.status)).length,
  }), [unifiedList]);

  const filteredList = useMemo(() => {
    return unifiedList.filter(item => {
      let matchesStatus = false;
      if (activeFilter === 'pending')   matchesStatus = ['new', 'draft', 'in_progress'].includes(item.status);
      if (activeFilter === 'draft')     matchesStatus = ['draft', 'in_progress'].includes(item.status);
      if (activeFilter === 'submitted') matchesStatus = ['submitted', 'approved', 'rejected', 'completed'].includes(item.status);
      return matchesStatus && item.title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [unifiedList, activeFilter, searchTerm]);

  useEffect(() => {
    if (filteredList.length > 0 && !filteredList.some(i => i.id === selectedId)) {
      setSelectedId(filteredList[0].id);
    }
    if (filteredList.length === 0) setSelectedId(null);
  }, [filteredList]);

  const selectedItem = filteredList.find(i => i.id === selectedId) ?? null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['assigned-surveys-unified'] });
    queryClient.invalidateQueries({ queryKey: ['my-responses-unified'] });
  };

  const handleExport = useCallback(async (responseId: number) => {
    try {
      setExporting(responseId);
      const blob = await surveyService.downloadResponseReport(responseId);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `sorgu-cavab-${responseId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Hesabat yükləndi');
    } catch {
      toast.error('Eksport xətası');
    } finally {
      setExporting(null);
    }
  }, []);

  if (isLoadingAssigned || isLoadingResponses) {
    return (
      <div className="flex gap-3 h-[600px] animate-pulse">
        <div className="w-72 shrink-0"><Skeleton className="h-full w-full rounded-lg" /></div>
        <div className="flex-1"><Skeleton className="h-full w-full rounded-lg" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-2 overflow-hidden bg-[hsl(220_25%_98%)] -m-4 p-4">

      {/* ── Kompakt top-bar: başlıq + filter + düymə ── */}
      <div className="shrink-0 flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-800 leading-tight">Sorğularım</h1>
          <p className="text-xs text-slate-500 truncate">
            {roleLabel}{institutionName ? ` · ${institutionName}` : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-auto shrink-0"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── Filter tabları ── */}
      <div className="shrink-0 flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg w-fit shadow-sm">
        {(Object.keys(FILTER_CONFIG) as FilterType[]).map((key) => {
          const { label, icon: Icon } = FILTER_CONFIG[key];
          const isActive = activeFilter === key;
          const count    = counts[key];
          return (
            <button
              key={key}
              onClick={() => { setActiveFilter(key); setSelectedId(null); }}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                isActive
                  ? 'bg-[hsl(220_85%_25%)] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className={cn(
                'ml-0.5 px-1.5 py-0.5 rounded text-xs font-semibold',
                isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Əsas iş sahəsi ── */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">

        {/* Sol panel */}
        <div className="w-72 xl:w-80 shrink-0 flex flex-col gap-2 min-h-0">
          {/* Axtarış + görünüş */}
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded">
                {(['card', 'list', 'compact'] as ViewMode[]).map((m, idx) => {
                  const icons = [LayoutGrid, List, Rows];
                  const Icon = icons[idx];
                  return (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={cn(
                        'p-1.5 rounded transition-all',
                        viewMode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-slate-400 font-medium">{filteredList.length} sorğu</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Axtar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm border-slate-200 bg-slate-50 focus:bg-white rounded"
              />
            </div>
          </div>

          {/* Siyahı */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 pb-4">
            {filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <Inbox className="h-8 w-8 mb-2" />
                <p className="text-sm">Siyahı boşdur</p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isSelected = selectedId === item.id;
                const statusCfg  = STATUS_BADGE[item.status] ?? { label: item.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };

                if (viewMode === 'card') {
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'w-full text-left p-3.5 rounded-lg border transition-all group relative overflow-hidden',
                        isSelected
                          ? 'border-[hsl(220_85%_25%)] bg-white shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                      )}
                    >
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[hsl(220_85%_25%)]" />}
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <h4 className={cn(
                          'text-sm font-medium leading-snug line-clamp-2 flex-1',
                          isSelected ? 'text-[hsl(220_85%_25%)]' : 'text-slate-800 group-hover:text-slate-900',
                        )}>
                          {item.title}
                        </h4>
                        <Badge variant="outline" className={cn('text-xs shrink-0 border px-1.5 py-0', statusCfg.cls)}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {item.questionsCount != null && (
                          <span className="flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" />
                            {item.questionsCount} sual
                          </span>
                        )}
                        {item.deadline && (
                          <span className="flex items-center gap-1 ml-auto">
                            <Clock className="h-3 w-3 text-amber-500" />
                            {format(new Date(item.deadline), 'dd.MM', { locale: az })}
                          </span>
                        )}
                        <ChevronRight className={cn(
                          'h-3.5 w-3.5 ml-auto transition-all',
                          isSelected ? 'text-[hsl(220_85%_25%)]' : 'text-slate-300 opacity-0 group-hover:opacity-100',
                        )} />
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'w-full text-left flex items-center justify-between gap-2 border rounded transition-all',
                      viewMode === 'list' ? 'px-3 py-2.5 rounded-lg' : 'px-2.5 py-1.5',
                      isSelected
                        ? 'border-[hsl(220_85%_25%)] bg-[hsl(220_85%_25%)] text-white'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <span className={cn('text-sm font-medium truncate flex-1', isSelected ? 'text-white' : 'text-slate-800')}>
                      {item.title}
                    </span>
                    <Badge variant="outline" className={cn(
                      'text-xs shrink-0 border px-1.5 py-0',
                      isSelected ? 'bg-white/20 text-white border-transparent' : statusCfg.cls,
                    )}>
                      {statusCfg.label}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Sağ panel */}
        <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
          {selectedItem ? (
            <>
              {/* Panel başlığı */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-[hsl(220_85%_95%)] rounded-md flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-[hsl(220_85%_25%)]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 truncate">{selectedItem.title}</h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <Badge variant="outline" className={cn('text-xs border px-1.5 py-0', STATUS_BADGE[selectedItem.status]?.cls)}>
                        {STATUS_BADGE[selectedItem.status]?.label}
                      </Badge>
                      {selectedItem.lastUpdated && (
                        <span className="text-xs text-slate-400">
                          Son yenilənmə: {format(new Date(selectedItem.lastUpdated), 'HH:mm', { locale: az })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {selectedItem.responseId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm shrink-0"
                    onClick={() => handleExport(selectedItem.responseId!)}
                    disabled={exporting === selectedItem.responseId}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Hesabat
                  </Button>
                )}
              </div>

              {/* Sorğu formu */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <SurveyResponseForm
                    key={`${selectedItem.surveyId}-${selectedItem.responseId || 'new'}`}
                    surveyId={selectedItem.surveyId}
                    responseId={selectedItem.responseId}
                    onComplete={() => {
                      handleRefresh();
                      toast.success('Tamamlandı');
                    }}
                    onSave={() => refetchResponses()}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700">Sorğu seçilməyib</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Başlamaq üçün siyahıdan bir sorğu seçin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedSurveyDashboard;
