import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ScrollText,
  Settings,
  Sparkles,
  Table2,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { aiAnalysisService } from '@/services/aiAnalysisService';
import { aiSettingsService } from '@/services/aiSettingsService';
import type {
  AnalysisStep,
  AiAnalysisLog,
  ClarificationAnswers,
  ClarificationQuestion,
  QueryResult,
  SmartAnalysisSqlResult,
} from '@/types/aiAnalysis';
import SchemaExplorer from './components/SchemaExplorer';
import PromptInput from './components/PromptInput';
import ClarificationDialog from './components/ClarificationDialog';
import { DataTable } from './components/DataTable';
import { DataChart } from './components/DataChart';
import { ExportButtons } from './components/ExportButtons';

// ─── Step indicator ───────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: AnalysisStep;
}

const STEPS: { key: AnalysisStep; label: string }[] = [
  { key: 'analyzing',  label: 'Analiz'         },
  { key: 'clarifying', label: 'Dəqiqləşdirmə'  },
  { key: 'executing',  label: 'İcra'            },
  { key: 'done',       label: 'Nəticə'          },
];

const STEP_ORDER: AnalysisStep[] = [
  'idle', 'analyzing', 'clarifying', 'executing', 'done', 'error',
];

function getStepIndex(step: AnalysisStep): number {
  return STEP_ORDER.indexOf(step);
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  if (currentStep === 'idle') return null;
  const currentIdx = getStepIndex(currentStep);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEPS.map((s, i) => {
        const stepIdx   = getStepIndex(s.key);
        const isActive  = s.key === currentStep;
        const isDone    = currentIdx > stepIdx && currentStep !== 'error';
        const isErr     = currentStep === 'error';

        let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline';
        if (isErr && i === 0) variant = 'destructive';
        else if (isDone)      variant = 'secondary';
        else if (isActive)    variant = 'default';

        return (
          <React.Fragment key={s.key}>
            <Badge variant={variant} className="text-xs gap-1">
              {isDone   && !isErr && <CheckCircle2 className="h-3 w-3" />}
              {isActive && !isErr && <Loader2 className="h-3 w-3 animate-spin" />}
              {s.label}
            </Badge>
            {i < STEPS.length - 1 && (
              <span className="text-muted-foreground text-xs">→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Log Sheet ────────────────────────────────────────────────

interface LogSheetProps {
  logs: AiAnalysisLog[];
  isLoading: boolean;
}

const statusColors: Record<AiAnalysisLog['status'], string> = {
  success: 'bg-green-100 text-green-700 border-green-200',
  error:   'bg-red-100 text-red-700 border-red-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  blocked: 'bg-gray-100 text-gray-600 border-gray-200',
};

const LogSheet: React.FC<LogSheetProps> = ({ logs, isLoading }) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" className="gap-1.5">
        <ScrollText className="h-4 w-4" />
        Loglar
      </Button>
    </SheetTrigger>
    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <ScrollText className="h-4 w-4" />
          Analiz Logları
        </SheetTitle>
        <SheetDescription>Son AI analiz sorğularının qeydləri</SheetDescription>
      </SheetHeader>

      <div className="mt-4 flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <ScrollText className="h-8 w-8 opacity-30" />
            <p className="text-sm">Hələ heç bir sorğu yoxdur</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-border/60 p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${statusColors[log.status]}`}
                >
                  {log.status}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  {new Date(log.created_at).toLocaleString('az-AZ', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">
                {log.original_prompt}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {log.user && <span className="font-medium">{log.user.name}</span>}
                {log.row_count > 0 && (
                  <span>{log.row_count.toLocaleString()} sətir</span>
                )}
                {log.execution_ms > 0 && <span>{log.execution_ms} ms</span>}
                {log.error_message && (
                  <span className="text-red-600 truncate">{log.error_message}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </SheetContent>
  </Sheet>
);

// ─── Result Panel ─────────────────────────────────────────────

interface ResultPanelProps {
  result: QueryResult;
  activeView: 'table' | 'chart';
  onViewChange: (v: 'table' | 'chart') => void;
  chartRef: React.RefObject<HTMLDivElement | null>;
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  result, activeView, onViewChange, chartRef,
}) => (
  <div className="flex flex-col gap-3">
    {result.explanation && (
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground flex items-start gap-2">
        {result.from_cache && (
          <Badge variant="outline" className="text-xs shrink-0 gap-1 border-green-200 text-green-700 bg-green-50">
            <Zap className="h-3 w-3" />
            Cache
          </Badge>
        )}
        {result.explanation}
      </div>
    )}

    <div className="flex items-center justify-between gap-2 flex-wrap">
      <Tabs value={activeView} onValueChange={(v) => onViewChange(v as 'table' | 'chart')}>
        <TabsList className="h-8">
          <TabsTrigger value="table" className="text-xs gap-1.5 h-7 px-3">
            <Table2 className="h-3.5 w-3.5" />
            Cədvəl
          </TabsTrigger>
          <TabsTrigger value="chart" className="text-xs gap-1.5 h-7 px-3">
            <BarChart3 className="h-3.5 w-3.5" />
            Qrafik
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <ExportButtons
        data={result.data}
        columns={result.columns}
        filename="ai-analiz"
        chartRef={chartRef}
      />
    </div>

    {/* Suppress unused TabsContent warning — tabs controlled via activeView state */}
    <div>
      {activeView === 'table' ? (
        <DataTable
          data={result.data}
          columns={result.columns}
          rowCount={result.row_count}
          executionMs={result.execution_ms}
        />
      ) : (
        <div ref={chartRef}>
          <DataChart
            data={result.data}
            columns={result.columns}
            chartType={result.suggested_visualization}
          />
        </div>
      )}
    </div>

    {result.sql_used && (
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
          İstifadə edilmiş SQL
        </summary>
        <pre className="mt-1 rounded-md border bg-muted p-2 font-mono text-xs overflow-auto whitespace-pre-wrap">
          {result.sql_used}
        </pre>
      </details>
    )}
  </div>
);

// ─── Loading skeleton ─────────────────────────────────────────

const ResultSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3">
    <Skeleton className="h-8 w-48 rounded-md" />
    <Skeleton className="h-[200px] w-full rounded-md" />
  </div>
);

// ─── Main Page Component ──────────────────────────────────────

const AiAnalysis: React.FC = () => {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('superadmin');

  // ─── State ─────────────────────────────────────────────────
  const [step, setStep]         = useState<AnalysisStep>('idle');
  const [prompt, setPrompt]     = useState('');
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [result, setResult]     = useState<QueryResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'table' | 'chart'>('table');

  /**
   * Aydın prompt üçün SmartAnalysis-dən gələn hazır SQL saxlanır.
   * İstifadəçi "clarify" seçibsə bu null olur.
   */
  const [presuppliedSql, setPresuppliedSql] = useState<SmartAnalysisSqlResult | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  // ─── Queries ───────────────────────────────────────────────
  const { data: schemaData, isLoading: schemaLoading, refetch: refetchSchema } = useQuery({
    queryKey: ['ai-schema'],
    queryFn:  () => aiAnalysisService.getSchema(),
    staleTime: 6 * 60 * 60 * 1000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['ai-settings'],
    queryFn:  () => aiSettingsService.getSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const isConfigured = settingsData?.is_configured ?? false;

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['ai-logs'],
    queryFn:  () => aiAnalysisService.getLogs(),
    staleTime: 30 * 1000,
  });

  // ─── Actions ───────────────────────────────────────────────

  /** DB-dən SQL icra et (AI çağırışı yoxdur) */
  const executeQuery = async (
    p: string,
    clarifications: ClarificationAnswers,
    sqlOverride?: SmartAnalysisSqlResult,
  ): Promise<void> => {
    setStep('executing');
    try {
      const payload = sqlOverride
        ? {
            prompt,
            presupplied_sql:          sqlOverride.sql,
            explanation:              sqlOverride.explanation,
            suggested_visualization:  sqlOverride.suggested_visualization,
          }
        : { prompt: p, clarifications };

      const queryResult = await aiAnalysisService.execute(payload);
      setResult(queryResult);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sorğu icrasında xəta');
      setStep('error');
    }
  };

  /**
   * YENİ AXIN — SmartAnalysis:
   *  1. analyze() → tək AI call
   *  2a. mode="sql"     → birbaşa executeQuery() (2-ci AI call YOX)
   *  2b. mode="clarify" → dialog açılır, istifadəçi cavablar → executeQuery() (2-ci AI call)
   */
  const handleSubmit = async (): Promise<void> => {
    setStep('analyzing');
    setError(null);
    setResult(null);
    setPresuppliedSql(null);

    try {
      const analysisResult = await aiAnalysisService.analyze(prompt);

      if (analysisResult.mode === 'sql') {
        // Prompt aydın idi — SQL hazırdır, yalnız DB icra lazımdır
        setPresuppliedSql(analysisResult);
        await executeQuery(prompt, {}, analysisResult);
      } else {
        // Dəqiqləşdirmə lazımdır
        setQuestions(analysisResult.questions);
        setStep('clarifying');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analiz xətası');
      setStep('error');
    }
  };

  /** Dialog-dan cavablar gəldikdə: SqlGenerationService ilə SQL yarat + icra et */
  const handleClarificationSubmit = async (
    clarificationAnswers: ClarificationAnswers,
  ): Promise<void> => {
    await executeQuery(prompt, clarificationAnswers);
  };

  const handleClarificationSkip = async (): Promise<void> => {
    await executeQuery(prompt, {});
  };

  /** SuperAdmin manual SQL modu */
  const handleRawSql = async (sql: string): Promise<void> => {
    setStep('executing');
    setError(null);
    setResult(null);
    try {
      const queryResult = await aiAnalysisService.execute({ prompt: sql, raw_sql: sql });
      setResult(queryResult);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SQL icrasında xəta');
      setStep('error');
    }
  };

  const handleReset = (): void => {
    setStep('idle');
    setError(null);
    setResult(null);
    setQuestions([]);
    setPresuppliedSql(null);
  };

  const isLoading = step === 'analyzing' || step === 'executing';

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Analiz Mərkəzi</h1>
          {step !== 'idle' && (
            <div className="ml-2">
              <StepIndicator currentStep={step} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button variant="ghost" size="sm" className="gap-1.5" asChild>
              <Link to="/ai-settings">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">AI Parametrləri</span>
              </Link>
            </Button>
          )}
          <LogSheet logs={logsData?.data ?? []} isLoading={logsLoading} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Schema Explorer */}
        <div className="w-[280px] shrink-0 border-r overflow-hidden flex flex-col">
          <SchemaExplorer
            tables={schemaData?.tables ?? []}
            isLoading={schemaLoading}
            onRefresh={() => void refetchSchema()}
            onTableClick={(tableName) => {
              setPrompt((prev) =>
                prev ? prev : `${tableName} cədvəlindən məlumat göstər`,
              );
            }}
          />
        </div>

        {/* Right: Prompt + Result */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Bot className="h-4 w-4" />
                Sorğunuzu daxil edin
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onSubmit={() => void handleSubmit()}
                onSubmitRawSql={(sql) => void handleRawSql(sql)}
                isLoading={isLoading}
                isConfigured={isConfigured}
                isSuperAdmin={isSuperAdmin}
              />
            </CardContent>
          </Card>

          {isLoading && (
            <Card>
              <CardContent className="px-4 pt-4 pb-4">
                <ResultSkeleton />
              </CardContent>
            </Card>
          )}

          {step === 'error' && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="shrink-0 gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Yenidən cəhd et
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {step === 'done' && result && (
            <Card>
              <CardContent className="px-4 pt-4 pb-4">
                <ResultPanel
                  result={result}
                  activeView={activeView}
                  onViewChange={setActiveView}
                  chartRef={chartRef}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Clarification Dialog */}
      <ClarificationDialog
        open={step === 'clarifying'}
        questions={questions}
        onSubmit={(a) => void handleClarificationSubmit(a)}
        onSkip={() => void handleClarificationSkip()}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AiAnalysis;
