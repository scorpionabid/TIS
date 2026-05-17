import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, AlertCircle, Download, X, Inbox, ChevronRight,
  ClipboardList, FileDown, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import { cn } from '@/lib/utils';
import { SurveyResponseForm } from '@/components/surveys/SurveyResponseForm';
import { toast } from 'sonner';

type ResponseStatus = 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'completed';

interface ResponseWithSurvey {
  id: number;
  survey?: {
    id: number;
    title: string;
    description?: string;
    due_date?: string;
    questions_count?: number;
    survey_type: string;
    is_anonymous: boolean;
    [key: string]: any;
  };
  survey_id?: number;
  last_saved_at?: string;
  progress_percentage: number;
  completion_time?: string;
  score?: number;
  feedback?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  submitted_on_time?: boolean;
  created_at?: string;
  status: ResponseStatus;
  [key: string]: any;
}

// ─── Status Helpers ────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  submitted:   { label: 'Göndərilmiş',  cls: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  approved:    { label: 'Təsdiqlənmiş', cls: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  rejected:    { label: 'Rədd edilmiş', cls: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  completed:   { label: 'Tamamlanmış',  cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
};

// ─── Left Panel: List Row ──────────────────────────────────────────────────────
const ResponseListRow: React.FC<{
  response: ResponseWithSurvey;
  isSelected: boolean;
  onClick: () => void;
}> = ({ response, isSelected, onClick }) => {
  const cfg = STATUS_MAP[response.status] || { label: response.status, cls: 'bg-gray-100 text-gray-800' };
  const title = response.survey?.title || `Sorğu #${response.survey_id || '???'}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 rounded-lg border transition-all duration-150 group",
        isSelected
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border/50 bg-card hover:border-primary/20 hover:bg-accent/40"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          "mt-1.5 h-2 w-2 rounded-full shrink-0",
          response.status === 'approved' || response.status === 'completed' ? "bg-green-500" :
          response.status === 'rejected' ? "bg-red-500" : "bg-purple-500"
        )} />

        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-[13px] font-semibold leading-tight line-clamp-2 transition-colors",
            isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
          )}>
            {title}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
             <span className={cn(
              "text-[9px] font-bold px-1.5 py-0 rounded uppercase tracking-wider border",
              cfg.cls
            )}>
              {cfg.label}
            </span>
            {response.completion_time && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {format(new Date(response.completion_time), 'dd.MM.yy', { locale: az })}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className={cn(
          "h-4 w-4 mt-1 shrink-0 transition-all",
          isSelected ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"
        )} />
      </div>
    </button>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
const MyResponses: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState<number | null>(null);

  const { data: responses = [], isLoading, error, refetch } = useQuery<ResponseWithSurvey[]>({
    queryKey: ['my-survey-responses-submitted'],
    queryFn: async () => {
      const response = await surveyService.getMyResponses();
      let list: ResponseWithSurvey[] = [];
      
      if (Array.isArray(response)) {
        list = response as ResponseWithSurvey[];
      } else {
        const payload = (response as any)?.data;
        if (payload && Array.isArray(payload.data)) list = payload.data as ResponseWithSurvey[];
        else if (payload && Array.isArray(payload)) list = payload as ResponseWithSurvey[];
      }

      // User requested only submitted/completed items
      return list.filter(r => ['submitted', 'approved', 'rejected', 'completed'].includes(r.status));
    },
    refetchInterval: 120000,
  });

  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      const title = r.survey?.title || '';
      const desc = r.survey?.description || '';
      const matchesSearch =
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        desc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [responses, searchTerm, statusFilter]);

  // Auto-select first item when list changes
  React.useEffect(() => {
    if (filteredResponses.length > 0 && (!selectedId || !filteredResponses.find(r => r.id === selectedId))) {
      setSelectedId(filteredResponses[0].id);
    } else if (filteredResponses.length === 0) {
      setSelectedId(null);
    }
  }, [filteredResponses, selectedId]);

  const selectedResponse = filteredResponses.find(r => r.id === selectedId) ?? null;

  const handleExport = useCallback(async (responseId: number) => {
    try {
      setExporting(responseId);
      const blob = await surveyService.downloadResponseReport(responseId);
      if (!blob || !(blob instanceof Blob)) throw new Error('Invalid file');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sorğu-cavab-${responseId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Hesabat uğurla yükləndi');
    } catch (e) {
      console.error('Error exporting:', e);
      toast.error('Hesabat yüklənərkən xəta baş verdi');
    } finally {
      setExporting(null);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="pt-4 space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex gap-4 h-[600px]">
          <div className="w-72 space-y-2 shrink-0">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
          <Skeleton className="flex-1 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold">Məlumat yüklənmədi</h3>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Yenidən yoxla</Button>
      </div>
    );
  }

  return (
    <div className="pt-4 flex flex-col h-[calc(100vh-120px)] gap-4 overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <Input
              placeholder="Göndərilmiş sorğularda axtar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün göndərilənlər</SelectItem>
              <SelectItem value="submitted">Göndərilmiş</SelectItem>
              <SelectItem value="completed">Tamamlanmış</SelectItem>
              <SelectItem value="approved">Təsdiqlənmiş</SelectItem>
              <SelectItem value="rejected">Rədd edilmiş</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span>Göndərilib: <strong className="text-foreground">{responses.length}</strong></span>
          {selectedId && (
            <Button 
              size="sm" 
              className="h-8 bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={exporting === selectedId}
              onClick={() => handleExport(selectedId)}
            >
              <FileDown className={cn("h-3.5 w-3.5", exporting === selectedId && "animate-bounce")} />
              {exporting === selectedId ? 'Yüklənir...' : 'Eksport'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Master-Detail Layout ── */}
      {responses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-2xl bg-muted/20">
          <ClipboardList className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-bold text-foreground">Göndərilmiş sorğu yoxdur</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center max-w-xs">Sizin tərəfinizdən göndərilmiş və ya tamamlanmış heç bir sorğu tapılmadı.</p>
        </div>
      ) : filteredResponses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-2xl">
            <Search className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold text-foreground">Nəticə tapılmadı</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-xs">Axtarışınıza uyğun heç bir sorğu tapılmadı.</p>
          </div>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* Left: list */}
          <div className="w-72 xl:w-80 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 px-1">
              Siyahı ({filteredResponses.length})
            </p>
            {filteredResponses.map((response) => (
              <ResponseListRow
                key={response.id}
                response={response}
                isSelected={selectedId === response.id}
                onClick={() => setSelectedId(response.id)}
              />
            ))}
          </div>

          {/* Right: Embedded SurveyResponseForm */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-border/40">
            {selectedResponse && (selectedResponse.survey_id || selectedResponse.survey?.id) ? (
              <div className="p-1">
                 <div className="bg-white dark:bg-card border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <ClipboardList className="h-5 w-5 text-primary" />
                       </div>
                       <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate">{selectedResponse.survey?.title || 'Sorğu Detalları'}</h3>
                          <p className="text-[10px] text-muted-foreground">ID: {selectedResponse.id} | Göndərilib: {selectedResponse.completion_time ? format(new Date(selectedResponse.completion_time), 'dd.MM.yyyy HH:mm') : '-'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                       <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-tight px-2 py-0.5", STATUS_MAP[selectedResponse.status]?.cls)}>
                          {STATUS_MAP[selectedResponse.status]?.label}
                       </Badge>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700" 
                        onClick={() => handleExport(selectedResponse.id)}
                        disabled={exporting === selectedResponse.id}
                       >
                          <Download className="h-4 w-4" />
                       </Button>
                    </div>
                 </div>

                 <div className="p-4 sm:p-6 lg:p-8">
                    <SurveyResponseForm
                      key={`${selectedResponse.survey_id || selectedResponse.survey?.id}-${selectedResponse.id}`}
                      surveyId={(selectedResponse.survey_id || selectedResponse.survey?.id) as number}
                      responseId={selectedResponse.id}
                    />
                 </div>
              </div>
            ) : selectedResponse ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-base font-bold text-foreground">Sorğu məlumatı çatışmır</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Bu cavab üçün əlaqəli sorğu tapılmadı (ID xətası).</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <ClipboardList className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-base font-bold text-foreground">Sorğu seçin</h3>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyResponses;
