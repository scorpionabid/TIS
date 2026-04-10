import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Calendar, 
  Search, 
  AlertCircle, 
  ArrowRight, 
  X, 
  Filter, 
  SortAsc, 
  CheckCircle2,
  Inbox,
  LayoutGrid,
  List
} from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { az } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveys';
import type { Survey, DeadlineDetails } from '@/services/surveys';
import { FilterBar } from '@/components/common/FilterBar';
import { cn } from '@/lib/utils';

interface SurveyWithStatus extends Survey {
  response_status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  end_date?: string;
  estimated_duration?: number;
  priority?: 'low' | 'medium' | 'high';
  is_anonymous: boolean;
  max_questions?: number;
  questions_count?: number;
  completion_percentage?: number;
  progress_percentage?: number;
  is_complete?: boolean;
  actual_responses?: number;
  estimated_recipients?: number | string;
  deadline_status?: Survey['deadline_status'];
  deadline_details?: DeadlineDetails;
}

const SurveySkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Card key={i} className="flex h-[320px] flex-col overflow-hidden border-border/40">
        <CardHeader className="gap-3 pb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </CardContent>
        <CardFooter className="pt-0 pb-6 px-6">
          <Skeleton className="h-10 w-full rounded-md" />
        </CardFooter>
      </Card>
    ))}
  </div>
);

const PendingSurveys: React.FC = () => {
  const navigate = useNavigate();
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'priority'>('deadline');
  
  const { data: apiResponse, isLoading, error } = useQuery<SurveyWithStatus[]>({
    queryKey: ['pending-surveys', statusFilter],
    queryFn: async () => {
      try {
        const params: Record<string, string> = {};
        if (statusFilter === 'overdue') {
          params.deadline_filter = 'overdue';
        }

        const response = await surveyService.getAssignedSurveys(params);
        const payload = (response as any)?.data;

        if (payload && Array.isArray(payload.data)) {
          return payload.data as SurveyWithStatus[];
        }

        if (payload && Array.isArray(payload)) {
          return payload as SurveyWithStatus[];
        }

        return [];
      } catch (err) {
        console.error('Error fetching surveys:', err);
        throw err;
      }
    },
    refetchInterval: 60000, // Reduced refresh rate for better UX
  });

  // Process and filter the surveys data
  const processedSurveys = React.useMemo(() => {
    if (!apiResponse) return [];
    
    // 1. Filter for pending-like states
    let list = apiResponse.filter(survey => {
      const status = (survey.response_status ?? (survey as any).status ?? '').toLowerCase();
      return (
        status === 'not_started' || 
        status === 'in_progress' ||
        status === 'overdue' ||
        status === 'draft' ||
        status === 'started' ||
        status === 'pending'
      );
    });

    // 2. Apply filters
    list = list.filter((survey: SurveyWithStatus) => {
      const matchesSearch = searchTerm === '' || 
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (survey.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      const matchesPriority = priorityFilter === 'all' || survey.priority === priorityFilter;
      
      const normalizedStatus = (survey.response_status ?? (survey as any).status ?? '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'overdue' && (normalizedStatus === 'overdue' || survey.deadline_status === 'overdue')) ||
        (statusFilter === 'not_started' && normalizedStatus === 'not_started') ||
        (statusFilter === 'in_progress' && normalizedStatus === 'in_progress');

      return matchesSearch && matchesPriority && matchesStatus;
    });

    // 3. Apply sorting
    return list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === 'deadline') {
        const dateA = a.end_date ? new Date(a.end_date).getTime() : Infinity;
        const dateB = b.end_date ? new Date(b.end_date).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const pA = priorityOrder[a.priority || 'low'] ?? 3;
        const pB = priorityOrder[b.priority || 'low'] ?? 3;
        return pA - pB;
      }
      return 0;
    });
  }, [apiResponse, searchTerm, priorityFilter, statusFilter, sortBy]);

  const resetFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  const isFilterActive = searchTerm !== '' || priorityFilter !== 'all' || statusFilter !== 'all';

  const getPriorityConfig = (priority?: string | null) => {
    switch (priority) {
      case 'high':
        return { 
          style: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900',
          label: 'Yüksək Prioritet',
          glow: 'after:content-[""] after:absolute after:-inset-0.5 after:bg-red-500/10 after:blur after:rounded-xl after:z-[-1]'
        };
      case 'medium':
        return { 
          style: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
          label: 'Orta Prioritet',
          glow: ''
        };
      case 'low':
        return { 
          style: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900',
          label: 'Aşağı Prioritet',
          glow: ''
        };
      default:
        return { style: 'border-border bg-muted/40 text-muted-foreground', label: 'Priority bilinmir', glow: '' };
    }
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="rounded-full shadow-sm">Gecikmiş</Badge>;
      case 'in_progress':
        return (
          <Badge variant="outline" className="rounded-full gap-1.5 border-amber-200 bg-amber-50 text-amber-700 font-medium">
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
            Davam edir
          </Badge>
        );
      default:
        return <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">Yeni</Badge>;
    }
  };

  const handleStartSurvey = (surveyId: number) => {
    navigate(`/survey-response/${surveyId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64 rounded-md" />
        </div>
        <SurveySkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-full mb-4">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Məlumat yüklənərkən xəta</h3>
        <p className="text-muted-foreground mb-6 text-center max-w-sm">
          Serverlə əlaqə zamanı problem yaşandı. Zəhmət olmasa səhifəni yeniləyin.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">Tekrar yoxla</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Advanced Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gözləyən Sorğular</h1>
          <p className="text-muted-foreground mt-1">Sizə təyin edilmiş və tamamlanmağı gözləyən tapşırıqlar.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group flex-1 min-w-[260px] md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Sorğu axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 bg-background border-border/60 focus:border-primary transition-all rounded-xl"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="h-11 w-[180px] rounded-xl bg-background border-border/60">
              <SortAsc className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sıralama" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">Son tarix (Yaxın)</SelectItem>
              <SelectItem value="priority">Prioritet (Yüksək)</SelectItem>
              <SelectItem value="newest">Ən yeni</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            className={cn("h-11 w-11 p-0 rounded-xl relative", isFilterActive && "bg-primary/5 border-primary/30")}
            onClick={() => {}} // Could toggle expanded filter panel
          >
            <Filter className="h-4 w-4" />
            {isFilterActive && <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background" />}
          </Button>
        </div>
      </div>

      {/* Filter Chips Layer */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/40">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-4">
          <Filter className="h-3.5 w-3.5" />
          Filtrlər:
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          <Select value={priorityFilter} onValueChange={(val: any) => setPriorityFilter(val)}>
            <SelectTrigger className="h-8 w-fit min-w-[120px] rounded-lg text-xs border-none shadow-none bg-background/60 hover:bg-background">
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün Prioritetlər</SelectItem>
              <SelectItem value="high">Yalnız Yüksək</SelectItem>
              <SelectItem value="medium">Orta</SelectItem>
              <SelectItem value="low">Aşağı</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="h-8 w-fit min-w-[120px] rounded-lg text-xs border-none shadow-none bg-background/60 hover:bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün Statuslar</SelectItem>
              <SelectItem value="not_started">Başlanmayıb</SelectItem>
              <SelectItem value="in_progress">Davam edən</SelectItem>
              <SelectItem value="overdue">Gecikmiş</SelectItem>
            </SelectContent>
          </Select>

          {isFilterActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2 text-xs hover:bg-background text-primary animate-in fade-in slide-in-from-left-2">
              <X className="h-3.5 w-3.5 mr-1" />
              Sıfırla
            </Button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground font-medium">
          {processedSurveys.length} nəticə tapıldı
        </div>
      </div>

      {/* Grid List */}
      {processedSurveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-muted/20 border-2 border-dashed border-border/60 rounded-3xl animate-in fade-in duration-700">
          <div className="p-6 bg-background/80 rounded-full shadow-sm mb-6">
            <Inbox className="h-16 w-16 text-muted-foreground/40" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">Heç bir sorğu tapılmadı</h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-center">
            Hazırda seçilmiş kriteriyalara uyğun gözləyən bir tapşırığınız yoxdur.
          </p>
          {isFilterActive && (
            <Button onClick={resetFilters} variant="secondary" className="mt-8 rounded-xl h-11 px-8">Filtrləri təmizlə</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {processedSurveys.map((survey: SurveyWithStatus) => {
            const priority = getPriorityConfig(survey.priority);
            const isOverdueVal = survey.response_status === 'overdue' || (survey.end_date && isAfter(new Date(), new Date(survey.end_date)));
            const progress = survey.progress_percentage || 0;
            
            return (
              <Card
                key={survey.id}
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden border-border/60 transition-all duration-300",
                  "hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 bg-card/50 backdrop-blur-sm",
                  priority.glow,
                  isOverdueVal && "border-red-200/50 dark:border-red-900/50 shadow-red-500/5"
                )}
              >
                {/* Visual Status Indicator Top Bar */}
                <div className={cn(
                  "h-1.5 w-full",
                  isOverdueVal ? "bg-red-500" : (survey.response_status === 'in_progress' ? "bg-amber-400" : "bg-primary/20")
                )} />

                <CardHeader className="space-y-3 p-6">
                  <div className="flex items-center justify-between gap-1.5">
                    <Badge variant="outline" className={cn("rounded-lg border px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold transition-colors group-hover:bg-background", priority.style)}>
                      {priority.label}
                    </Badge>
                    {getStatusBadge(survey.response_status)}
                  </div>
                  
                  <div className="space-y-1.5 pt-1">
                    <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {survey.title}
                    </CardTitle>
                    {survey.description ? (
                      <CardDescription className="text-sm line-clamp-2 text-muted-foreground/80 min-h-[40px]">
                        {survey.description}
                      </CardDescription>
                    ) : (
                      <div className="h-[40px]" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 px-6 pb-2 space-y-5">
                  {/* Progress Visualization */}
                  {survey.response_status === 'in_progress' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground uppercase tracking-wide">Gedişat</span>
                        <span className="text-primary font-bold">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-muted rounded-full" />
                    </div>
                  )}

                  {/* Deadline / Dates */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-2xl border transition-colors",
                    isOverdueVal 
                      ? "bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/40 text-red-700 dark:text-red-400" 
                      : "bg-muted/30 border-border/40 text-muted-foreground group-hover:bg-muted/50"
                  )}>
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-2 rounded-xl bg-background", isOverdueVal ? "text-red-500" : "text-muted-foreground")}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">Son Tarix</p>
                        <p className="text-xs font-bold whitespace-nowrap">
                          {survey.end_date ? format(new Date(survey.end_date), 'dd MMM yyyy', { locale: az }) : 'Bitmə tarixi yoxdur'}
                        </p>
                      </div>
                    </div>
                    {survey.end_date && (
                      <div className={cn(
                        "text-[10px] font-black uppercase px-2 py-1 rounded-lg",
                        isOverdueVal ? "bg-red-500 text-white" : "bg-primary/10 text-primary"
                      )}>
                        {isOverdueVal ? 'Müddət bitib' : `${survey.deadline_details?.days_remaining ?? 0} gün qalıb`}
                      </div>
                    )}
                  </div>
                  
                  {/* Additional Metadata */}
                  <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground/60 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      ~5 dəqiqə
                    </div>
                    <div className="flex items-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      {survey.max_questions} Sual
                    </div>
                    {survey.is_anonymous && (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Anonim
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="p-6 pt-4">
                  <Button
                    onClick={() => handleStartSurvey(survey.id)}
                    className={cn(
                      "w-full h-11 rounded-xl font-bold transition-all shadow-md active:scale-[0.98]",
                      isOverdueVal 
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200 dark:shadow-none" 
                        : "bg-primary hover:bg-primary/90 text-white shadow-primary/20",
                      survey.response_status === 'in_progress' && "bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none"
                    )}
                  >
                    <span>
                      {isOverdueVal ? 'Təcili tamamla' : (survey.response_status === 'in_progress' ? 'Davam et' : 'Sorğuya başla')}
                    </span>
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingSurveys;
