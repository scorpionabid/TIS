import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Code2, Loader2, Sparkles, X } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSubmitRawSql?: (sql: string) => void;
  isLoading: boolean;
  isConfigured: boolean;
  isSuperAdmin: boolean;
}

// ─── Sample Queries ───────────────────────────────────────────

interface SampleQuery {
  label: string;
  prompt: string;
}

const SAMPLE_QUERIES: SampleQuery[] = [
  { label: 'Davamiyyəti aşağı olan şagirdlər', prompt: 'Davamiyyəti 70%-dən aşağı olan şagirdləri göstər' },
  { label: 'Ən çox tapşırıq alan məktəblər', prompt: 'Ən çox tapşırıq alan ilk 10 məktəbi sırala' },
  { label: 'Müəllimlərin orta yaşı regionlara görə', prompt: 'Müəllimlərin orta yaşını regionlara görə hesabla' },
];

// ─── Main Component ───────────────────────────────────────────

const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onSubmit,
  onSubmitRawSql,
  isLoading,
  isConfigured,
  isSuperAdmin,
}) => {
  const [isSqlMode, setIsSqlMode] = useState(false);
  const [sqlValue, setSqlValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || isSqlMode) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 80)}px`;
  }, [value, isSqlMode]);

  const handleSampleClick = (query: SampleQuery): void => {
    onChange(query.prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isLoading && isConfigured && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleSubmit = (): void => {
    if (isSqlMode) {
      if (sqlValue.trim() && onSubmitRawSql) {
        onSubmitRawSql(sqlValue.trim());
      }
    } else {
      if (value.trim()) {
        onSubmit();
      }
    }
  };

  const canSubmit = isSqlMode
    ? sqlValue.trim().length > 0 && !isLoading
    : value.trim().length > 0 && !isLoading && isConfigured;

  return (
    <div className="flex flex-col gap-3">
      {/* Warning: AI not configured */}
      {!isConfigured && !isSqlMode && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600" />
          <span>AI konfiqurasiya edilməyib. Sorğu göndərmək üçün əvvəlcə AI parametrlərini tənzimləyin.</span>
        </div>
      )}

      {/* SQL Mode Toggle — superadmin only */}
      {isSuperAdmin && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {isSqlMode ? 'Manual SQL rejimi aktiv' : 'Təbii dil rejimi'}
          </span>
          <Button
            variant={isSqlMode ? 'default' : 'outline'}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setIsSqlMode((prev) => !prev)}
          >
            {isSqlMode ? (
              <>
                <X className="h-3 w-3" />
                SQL rejimini bağla
              </>
            ) : (
              <>
                <Code2 className="h-3 w-3" />
                Manual SQL
              </>
            )}
          </Button>
        </div>
      )}

      {/* Input area */}
      {isSqlMode ? (
        <div className="relative">
          <textarea
            value={sqlValue}
            onChange={(e) => setSqlValue(e.target.value)}
            placeholder="SELECT * FROM users WHERE ..."
            rows={6}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          />
          <Badge
            variant="outline"
            className="absolute top-2 right-2 text-xs bg-background font-mono"
          >
            SQL
          </Badge>
        </div>
      ) : (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sualınızı Azərbaycan dilində yazın..."
            className="min-h-[80px] resize-none overflow-hidden pr-4 text-sm"
            disabled={isLoading}
            style={{ height: 'auto' }}
          />
          {value && !isLoading && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 rounded-sm opacity-40 hover:opacity-100 transition-opacity"
              aria-label="Sil"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Sample query chips — only in natural language mode */}
      {!isSqlMode && (
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_QUERIES.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => handleSampleClick(q)}
              disabled={isLoading}
              className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Submit row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {isSqlMode ? 'SQL birbaşa icra ediləcək' : 'Ctrl+Enter ilə göndər'}
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="gap-2 ml-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Emal edilir...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {isSqlMode ? 'SQL İcra Et' : 'Analiz Et'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PromptInput;
