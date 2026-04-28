import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Clock, Calendar, Search, AlertCircle, ArrowRight,
  CheckCircle2, Inbox, LayoutGrid, List, Grid2X2,
  AlignJustify,
} from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import type { Survey, DeadlineDetails } from '@/services/surveys';
import { cn } from '@/lib/utils';

interface SurveyWithStatus extends Survey {
  response_status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  end_date?: string;
  priority?: 'low' | 'medium' | 'high';
  is_anonymous: boolean;
  max_questions?: number;
  progress_percentage?: number;
  deadline_details?: DeadlineDetails;
}

type ViewMode = 'large-grid' | 'small-grid' | 'list' | 'compact';

const LS_KEY = 'pending-surveys-view';
const getInitialView = (): ViewMode => {
  try { return (localStorage.getItem(LS_KEY) as ViewMode) || 'large-grid'; }
  catch { return 'large-grid'; }
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const isOverdue = (s: SurveyWithStatus) =>
  s.response_status === 'overdue' || (s.end_date ? isAfter(new Date(), new Date(s.end_date)) : false);

const statusLabel = (s: SurveyWithStatus) => {
  if (isOverdue(s)) return { text: 'Gecikmiş', cls: 'bg-red-500' };
  if (s.response_status === 'in_progress') return { text: 'Davam', cls: 'bg-amber-400 animate-pulse' };
  return { text: 'Yeni', cls: 'bg-primary/40' };
};

const deadlineText = (s: SurveyWithStatus) => {
  if (!s.end_date) return null;
  const days = s.deadline_details?.days_remaining ?? 0;
  return isOverdue(s) ? 'Bitib' : days === 0 ? 'Bu gün' : `${days}g`;
};

const actionLabel = (s: SurveyWithStatus) => {
  if (isOverdue(s)) return 'Tamamla';
  if (s.response_status === 'in_progress') return 'Davam et';
  return 'Başla';
};

const barColor = (s: SurveyWithStatus) =>
  isOverdue(s) ? 'bg-red-500' : s.response_status === 'in_progress' ? 'bg-amber-400' : 'bg-primary/30';

const StatusDot: React.FC<{ s: SurveyWithStatus; size?: 'sm' | 'md' }> = ({ s, size = 'md' }) => {
  const { cls } = statusLabel(s);
  return <span className={cn('rounded-full shrink-0', size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2', cls)} />;
};

const StatusBadgeInline: React.FC<{ s: SurveyWithStatus }> = ({ s }) => {
  if (isOverdue(s)) return <Badge variant="destructive" className="rounded-full text-[10px] px-1.5 py-0">Gecikmiş</Badge>;
  if (s.response_status === 'in_progress') return (
    <Badge variant="outline" className="rounded-full gap-1 border-amber-200 bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0">
      <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />Davam
    </Badge>
  );
  return <Badge variant="outline" className="rounded-full text-[10px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary">Yeni</Badge>;
};

// ─── 1. LARGE GRID CARD ────────────────────────────────────────────────────────
const LargeCard: React.FC<{ s: SurveyWithStatus; onStart: (id: number) => void }> = ({ s, onStart }) => {
  const ov = isOverdue(s);
  const progress = s.progress_percentage || 0;
  return (
    <Card className={cn(
      'group flex flex-col overflow-hidden border-border/60 transition-all duration-200',
      'hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5',
      ov && 'border-red-200/70 dark:border-red-900/50'
    )}>
      <div className={cn('h-0.5 w-full', barColor(s))} />
      <CardHeader className="p-4 pb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <StatusBadgeInline s={s} />
          {s.max_questions && <span className="text-[10px] text-muted-foreground">{s.max_questions} sual</span>}
        </div>
        <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {s.title}
        </CardTitle>
        {s.description && <CardDescription className="text-xs line-clamp-2">{s.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-2 space-y-2">
        {s.response_status === 'in_progress' && progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Gedişat</span><span className="font-medium text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}
        <div className={cn(
          'flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs',
          ov ? 'bg-red-50/50 border-red-100 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
             : 'bg-muted/30 border-border/40 text-muted-foreground'
        )}>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="font-medium text-[11px]">
              {s.end_date ? format(new Date(s.end_date), 'dd MMM yyyy', { locale: az }) : 'Tarix yoxdur'}
            </span>
          </div>
          {s.end_date && (
            <span className={cn('font-bold px-1.5 py-0.5 rounded text-[10px]', ov ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary')}>
              {deadlineText(s)}
            </span>
          )}
        </div>
        {s.is_anonymous && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" />Anonim
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-2">
        <Button
          onClick={() => onStart(s.id)}
          size="sm"
          className={cn(
            'w-full h-8 font-semibold text-xs',
            ov ? 'bg-red-600 hover:bg-red-700 text-white'
              : s.response_status === 'in_progress' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''
          )}
        >
          {actionLabel(s)}<ArrowRight className="h-3 w-3 ml-1.5" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// ─── 2. SMALL GRID CARD ────────────────────────────────────────────────────────
const SmallCard: React.FC<{ s: SurveyWithStatus; onStart: (id: number) => void }> = ({ s, onStart }) => {
  const ov = isOverdue(s);
  return (
    <div className={cn(
      'group flex flex-col gap-2 p-3 rounded-xl border transition-all duration-150',
      'hover:border-primary/30 hover:shadow-sm',
      ov ? 'border-red-200/60 bg-red-50/20 dark:bg-red-950/10' : 'border-border/60 bg-card'
    )}>
      <div className="flex items-center justify-between gap-1.5">
        <StatusDot s={s} />
        {s.max_questions && <span className="text-[10px] text-muted-foreground ml-auto">{s.max_questions}s</span>}
        {ov && <span className="text-[10px] font-bold text-red-600">{deadlineText(s)}</span>}
        {!ov && s.end_date && <span className="text-[10px] text-primary font-medium">{deadlineText(s)}</span>}
      </div>
      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
        {s.title}
      </p>
      {s.end_date && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />
          {format(new Date(s.end_date), 'dd MMM', { locale: az })}
        </p>
      )}
      <Button
        onClick={() => onStart(s.id)}
        size="sm"
        variant={ov ? 'destructive' : 'default'}
        className={cn(
          'w-full h-7 text-[11px] font-semibold mt-auto',
          !ov && s.response_status === 'in_progress' && 'bg-amber-500 hover:bg-amber-600 text-white border-0'
        )}
      >
        {actionLabel(s)}<ArrowRight className="h-2.5 w-2.5 ml-1" />
      </Button>
    </div>
  );
};

// ─── 3. LIST ROW ───────────────────────────────────────────────────────────────
const ListRow: React.FC<{ s: SurveyWithStatus; onStart: (id: number) => void }> = ({ s, onStart }) => {
  const ov = isOverdue(s);
  const progress = s.progress_percentage || 0;
  return (
    <div className={cn(
      'group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150',
      'hover:border-primary/30 hover:shadow-sm hover:bg-accent/30',
      ov ? 'border-red-200/60 bg-red-50/20 dark:bg-red-950/10' : 'border-border/60 bg-card'
    )}>
      <StatusDot s={s} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{s.title}</p>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
          {s.end_date && <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{format(new Date(s.end_date), 'dd MMM', { locale: az })}</span>}
          {s.max_questions && <span>{s.max_questions} sual</span>}
          {s.is_anonymous && <span className="text-emerald-600">Anonim</span>}
        </div>
        {s.response_status === 'in_progress' && progress > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <Progress value={progress} className="h-0.5 flex-1" /><span className="text-[10px] text-primary font-medium">{progress}%</span>
          </div>
        )}
      </div>
      <StatusBadgeInline s={s} />
      {s.end_date && (
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded hidden sm:block', ov ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary')}>
          {deadlineText(s)}
        </span>
      )}
      <Button
        onClick={() => onStart(s.id)}
        size="sm"
        variant={ov ? 'destructive' : 'default'}
        className={cn('h-7 px-3 text-xs font-semibold shrink-0', !ov && s.response_status === 'in_progress' && 'bg-amber-500 hover:bg-amber-600 text-white border-0')}
      >
        {actionLabel(s)}<ArrowRight className="h-2.5 w-2.5 ml-1" />
      </Button>
    </div>
  );
};

// ─── 4. COMPACT ROW ───────────────────────────────────────────────────────────
const CompactRow: React.FC<{ s: SurveyWithStatus; onStart: (id: number) => void }> = ({ s, onStart }) => {
  const ov = isOverdue(s);
  return (
    <div className={cn(
      'group flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all duration-100',
      'hover:border-primary/20 hover:bg-accent/20',
      ov ? 'border-red-200/50 bg-red-50/10' : 'border-border/40 bg-card'
    )}>
      <StatusDot s={s} size="sm" />
      <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
        {s.title}
      </span>
      {s.end_date && (
        <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
          {format(new Date(s.end_date), 'dd MMM', { locale: az })}
        </span>
      )}
      {s.end_date && (
        <span className={cn('text-[10px] font-bold shrink-0', ov ? 'text-red-600' : 'text-primary')}>
          {deadlineText(s)}
        </span>
      )}
      <Button
        onClick={() => onStart(s.id)}
        size="sm"
        variant={ov ? 'destructive' : 'default'}
        className={cn('h-6 px-2 text-[10px] font-semibold shrink-0', !ov && s.response_status === 'in_progress' && 'bg-amber-500 hover:bg-amber-600 text-white border-0')}
      >
        {actionLabel(s)}
      </Button>
    </div>
  );
};

// ─── View Toggle ───────────────────────────────────────────────────────────────
const VIEW_MODES: { mode: ViewMode; Icon: React.ElementType; label: string }[] = [
  { mode: 'large-grid', Icon: LayoutGrid, label: 'Böyük Grid' },
  { mode: 'small-grid', Icon: Grid2X2,   label: 'Kiçik Grid' },
  { mode: 'list',       Icon: List,      label: 'Siyahı'     },
  { mode: 'compact',    Icon: AlignJustify, label: 'Kompakt'  },
];

const ViewToggle: React.FC<{ value: ViewMode; onChange: (v: ViewMode) => void }> = ({ value, onChange }) => (
  <TooltipProvider delayDuration={300}>
    <div className="flex items-center border border-border rounded-lg overflow-hidden">
      {VIEW_MODES.map(({ mode, Icon, label }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onChange(mode)}
              className={cn(
                'p-1.5 transition-colors',
                value === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  </TooltipProvider>
);

// ─── Skeletons ─────────────────────────────────────────────────────────────────
const LargeGridSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1,2,3,4,5,6].map(i => (
      <Card key={i} className="flex h-[220px] flex-col border-border/40">
        <CardHeader className="gap-2 pb-2">
          <div className="flex justify-between"><Skeleton className="h-4 w-16 rounded-full" /><Skeleton className="h-4 w-10 rounded-full" /></div>
          <Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-full" />
        </CardHeader>
        <CardContent className="flex-1"><Skeleton className="h-10 w-full rounded-lg" /></CardContent>
        <CardFooter className="p-3"><Skeleton className="h-8 w-full rounded-md" /></CardFooter>
      </Card>
    ))}
  </div>
);

const SmallGridSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {[1,2,3,4,5,6,7,8].map(i => (
      <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-border/40 h-[120px]">
        <Skeleton className="h-3 w-3 rounded-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-7 w-full rounded-lg mt-auto" />
      </div>
    ))}
  </div>
);

const ListSkeleton = () => (
  <div className="flex flex-col gap-2">
    {[1,2,3,4,5].map(i => (
      <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40">
        <Skeleton className="h-2 w-2 rounded-full" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /><Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    ))}
  </div>
);

const CompactSkeleton = () => (
  <div className="flex flex-col gap-1">
    {[1,2,3,4,5,6,7].map(i => (
      <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border/40">
        <Skeleton className="h-1.5 w-1.5 rounded-full" /><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 w-10" /><Skeleton className="h-6 w-14 rounded-md" />
      </div>
    ))}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────────
const PendingSurveys: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm]   = useState('');
  const [sortBy, setSortBy]           = useState<'newest' | 'deadline' | 'priority'>('deadline');
  const [viewMode, setViewMode]       = useState<ViewMode>(getInitialView);

  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    try { localStorage.setItem(LS_KEY, v); } catch (_e) { /* storage unavailable */ }
  };

  const { data: apiResponse, isLoading, error } = useQuery<SurveyWithStatus[]>({
    queryKey: ['pending-surveys'],
    queryFn: async () => {
      const response = await surveyService.getAssignedSurveys();
      const payload = (response as any)?.data;
      if (payload && Array.isArray(payload.data)) return payload.data as SurveyWithStatus[];
      if (payload && Array.isArray(payload))       return payload as SurveyWithStatus[];
      return [];
    },
    refetchInterval: 60000,
  });

  const surveys = React.useMemo(() => {
    if (!apiResponse) return [];
    let list = apiResponse.filter(s => {
      const st = (s.response_status ?? (s as any).status ?? '').toLowerCase();
      return ['not_started', 'in_progress', 'overdue', 'draft', 'started', 'pending'].includes(st);
    });
    if (searchTerm) list = list.filter(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );
    return list.sort((a, b) => {
      if (sortBy === 'newest')   return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'deadline') {
        const dA = a.end_date ? new Date(a.end_date).getTime() : Infinity;
        const dB = b.end_date ? new Date(b.end_date).getTime() : Infinity;
        return dA - dB;
      }
      if (sortBy === 'priority') {
        const o = { high: 0, medium: 1, low: 2 };
        return (o[a.priority || 'low'] ?? 3) - (o[b.priority || 'low'] ?? 3);
      }
      return 0;
    });
  }, [apiResponse, searchTerm, sortBy]);

  const onStart = (id: number) => navigate(`/survey-response/${id}`);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4 pt-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 flex-1 max-w-xs rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        {viewMode === 'large-grid' ? <LargeGridSkeleton />
          : viewMode === 'small-grid' ? <SmallGridSkeleton />
          : viewMode === 'list' ? <ListSkeleton />
          : <CompactSkeleton />}
      </div>
    );
  }

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
      <h3 className="text-base font-semibold mb-1">Məlumat yüklənərkən xəta</h3>
      <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="mt-3">Yenidən cəhd et</Button>
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <Input
              placeholder="Sorğu axtar..."
              className="pl-9 h-8 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">Son tarix</SelectItem>
              <SelectItem value="priority">Prioritet</SelectItem>
              <SelectItem value="newest">Ən yeni</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{surveys.length} sorğu</span>
          <ViewToggle value={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      {/* ── Content ── */}
      {surveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/60 rounded-2xl">
          <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-semibold text-foreground">Gözləyən sorğu yoxdur</h3>
          <p className="text-muted-foreground mt-1 text-sm text-center max-w-xs">Hazırda sizə təyin edilmiş heç bir gözləyən sorğu yoxdur.</p>
        </div>
      ) : viewMode === 'large-grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map(s => <LargeCard key={s.id} s={s} onStart={onStart} />)}
        </div>
      ) : viewMode === 'small-grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {surveys.map(s => <SmallCard key={s.id} s={s} onStart={onStart} />)}
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-2">
          {surveys.map(s => <ListRow key={s.id} s={s} onStart={onStart} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {surveys.map(s => <CompactRow key={s.id} s={s} onStart={onStart} />)}
        </div>
      )}
    </div>
  );
};

export default PendingSurveys;
