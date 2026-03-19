// ============================================================
// AI ANALİZ MODULİ - TypeScript Tiplər
// ============================================================

// ─── Schema Types ────────────────────────────────────────────

export interface DbColumn {
  name: string;
  label: string;
  type: string;
  nullable: boolean;
  default: string | null;
  max_length: number | null;
}

export interface DbTable {
  table_name: string;
  label: string;
  row_count: number;
  columns: DbColumn[];
  sample_data: Record<string, unknown>[];
}

export interface SchemaResponse {
  tables: DbTable[];
  total_tables: number;
  cached_at: string;
}

// ─── Prompt Enhancement Types ────────────────────────────────

export type ClarificationQuestionType = 'single' | 'multi' | 'text';

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: ClarificationQuestionType;
  options: string[];
}

export interface EnhancePromptResponse {
  questions: ClarificationQuestion[];
}

export type ClarificationAnswers = Record<string, string | string[]>;

// ─── Query Execution Types ───────────────────────────────────

export type VisualizationType = 'table' | 'bar' | 'pie' | 'line';

export interface QueryResult {
  data: Record<string, unknown>[];
  columns: string[];
  row_count: number;
  execution_ms: number;
  sql_used: string;
  explanation: string;
  suggested_visualization: VisualizationType;
  log_id: number;
  /** Redis cache-dən gəlibsə true (Faza 3) */
  from_cache?: boolean;
}

export interface ExecuteRequest {
  prompt: string;
  clarifications?: ClarificationAnswers;
  raw_sql?: string;
  /** SmartAnalysis-dən gələn hazır SQL (dəqiqləşdirmə tələb etmədi) */
  presupplied_sql?: string;
  /** SmartAnalysis-dən gələn izahat */
  explanation?: string;
  /** SmartAnalysis-dən gələn vizualizasiya tövsiyəsi */
  suggested_visualization?: VisualizationType;
}

// ─── Smart Analysis Types ─────────────────────────────────────

/** SmartAnalysis aydın prompt üçün SQL qaytardıqda */
export interface SmartAnalysisSqlResult {
  mode: 'sql';
  sql: string;
  explanation: string;
  suggested_visualization: VisualizationType;
}

/** SmartAnalysis qeyri-müəyyən prompt üçün suallar qaytardıqda */
export interface SmartAnalysisClarifyResult {
  mode: 'clarify';
  questions: ClarificationQuestion[];
}

export type SmartAnalysisResult = SmartAnalysisSqlResult | SmartAnalysisClarifyResult;

// ─── AI Settings Types ───────────────────────────────────────

export type AiProvider = 'openai' | 'anthropic' | 'gemini';

export interface AiProviderInfo {
  id: AiProvider;
  name: string;
  description: string;
  models: string[];
  docs_url: string;
}

export interface AiCurrentSettings {
  provider: AiProvider;
  model: string | null;
  effective_model: string;
  sql_model: string;
  is_active: boolean;
  updated_at: string;
  has_api_key: boolean;
}

export interface AiSettingsResponse {
  current_settings: AiCurrentSettings | null;
  available_providers: AiProviderInfo[];
  is_configured: boolean;
}

export interface SaveAiSettingsRequest {
  provider: AiProvider;
  api_key: string;
  model?: string | null;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  model: string;
}

// ─── UI State Types ──────────────────────────────────────────

export type AnalysisStep =
  | 'idle'        // Başlanğıc
  | 'analyzing'   // SmartAnalysis: aydın mi, sual lazımmı? (yeni)
  | 'clarifying'  // İstifadəçi cavab verir
  | 'executing'   // SQL icra edilir
  | 'done'        // Nəticə göstərilir
  | 'error';      // Xəta

export interface AnalysisState {
  step: AnalysisStep;
  prompt: string;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswers;
  result: QueryResult | null;
  error: string | null;
}

// ─── Audit Log Types ─────────────────────────────────────────

export interface AiAnalysisLog {
  id: number;
  user_id: number;
  user_role: string;
  original_prompt: string;
  generated_sql: string | null;
  row_count: number;
  execution_ms: number;
  status: 'pending' | 'success' | 'error' | 'blocked';
  error_message: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
}
