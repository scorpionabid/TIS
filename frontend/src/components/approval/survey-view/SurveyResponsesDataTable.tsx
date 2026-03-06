import React, { useMemo } from 'react';
import { Badge } from '../../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { SurveyResponseForApproval, PublishedSurvey } from '../../../services/surveyApproval';
import { cn } from '@/lib/utils';

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  approved:  { label: 'Təsdiqlənib',    cls: 'bg-green-100 text-green-800 border-green-200' },
  submitted: { label: 'Göndərilmiş',    cls: 'bg-blue-100  text-blue-800  border-blue-200'  },
  draft:     { label: 'Qaralama',       cls: 'bg-gray-100  text-gray-700  border-gray-200'  },
  rejected:  { label: 'Rədd edilib',    cls: 'bg-red-100   text-red-800   border-red-200'   },
  returned:  { label: 'Geri qaytarıldı',cls: 'bg-orange-100 text-orange-800 border-orange-200' },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status,
    cls: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─── Smart cell formatters ─────────────────────────────────────────────────────

/**
 * Resolve the human-readable label for a choice value.
 * Options can be: string[] | { id: string; label: string }[]
 */
function resolveChoiceLabel(value: string, options?: any[]): string {
  if (!options || options.length === 0) return value;
  // New format: array of objects with id + label
  if (typeof options[0] === 'object' && options[0] !== null && 'id' in options[0]) {
    const found = options.find((o) => String(o.id) === String(value));
    return found?.label ?? value;
  }
  // Old format: plain strings
  return value;
}

function formatCellValue(answer: any, question: any): React.ReactNode {
  if (answer === null || answer === undefined || answer === '') {
    return <span className="text-muted-foreground text-xs italic">—</span>;
  }

  const type: string = question?.type ?? '';
  const options: any[] = question?.options ?? [];

  // ── Boolean-like (yes/no) ──────────────────────────────────────────────────
  if (answer === true || answer === 'true')
    return <span className="text-green-700 font-medium">Bəli</span>;
  if (answer === false || answer === 'false')
    return <span className="text-red-600 font-medium">Xeyr</span>;

  // ── Single choice ──────────────────────────────────────────────────────────
  if (type === 'single_choice' && typeof answer === 'string') {
    const label = resolveChoiceLabel(answer, options);
    return (
      <Badge variant="outline" className="text-xs font-normal">
        {label}
      </Badge>
    );
  }

  // ── Multiple choice ────────────────────────────────────────────────────────
  if (type === 'multiple_choice' && Array.isArray(answer)) {
    const labels = answer.map((v: string) => resolveChoiceLabel(v, options));
    return (
      <div className="flex flex-wrap gap-1">
        {labels.map((lbl, i) => (
          <Badge key={i} variant="outline" className="text-xs font-normal">
            {lbl}
          </Badge>
        ))}
      </div>
    );
  }

  // ── Rating ─────────────────────────────────────────────────────────────────
  if (type === 'rating' && (typeof answer === 'number' || (typeof answer === 'string' && !isNaN(Number(answer))))) {
    const val = Number(answer);
    const color = val >= 8 ? 'text-green-700' : val >= 5 ? 'text-yellow-700' : 'text-red-600';
    return (
      <span className={cn('font-bold text-base', color)}>
        {val}
        <span className="text-xs font-normal text-muted-foreground ml-0.5">/ {question?.rating_max ?? 10}</span>
      </span>
    );
  }

  // ── File upload ────────────────────────────────────────────────────────────
  if (type === 'file_upload') {
    const files = Array.isArray(answer) ? answer : [answer];
    return (
      <div className="space-y-0.5">
        {files.map((f: any, i: number) => {
          const name = typeof f === 'string' ? f.split('/').pop() : (f?.original_filename ?? f?.filename ?? 'Fayl');
          return (
            <span key={i} className="text-xs text-blue-600 flex items-center gap-1">
              📎 {name}
            </span>
          );
        })}
      </div>
    );
  }

  // ── Table input (dynamic table) ────────────────────────────────────────────
  if (type === 'table_input' && Array.isArray(answer)) {
    const rowCount = answer.length;
    const preview = answer
      .slice(0, 2)
      .map((row: any, ri: number) => {
        if (typeof row !== 'object' || row === null) return null;
        const vals = Object.values(row).filter((v) => v !== null && v !== '');
        return `Sətir ${ri + 1}: ${vals.join(' | ')}`;
      })
      .filter(Boolean)
      .join('\n');

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="cursor-help text-xs font-normal gap-1"
          >
            📊 {rowCount} sətir
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line text-xs">
          {preview || 'Məlumat yoxdur'}
          {rowCount > 2 && `\n... və daha ${rowCount - 2} sətir`}
        </TooltipContent>
      </Tooltip>
    );
  }

  // ── Table matrix ────────────────────────────────────────────────────────────
  if (type === 'table_matrix' && typeof answer === 'object' && !Array.isArray(answer)) {
    const entries = Object.entries(answer).filter(([, v]) => v !== null && v !== '');
    if (entries.length === 0) return <span className="text-muted-foreground text-xs italic">—</span>;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="cursor-help text-xs font-normal">
            🔲 {entries.length} xana
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs space-y-0.5">
          {entries.slice(0, 5).map(([k, v]) => (
            <div key={k}><span className="font-medium">{k}:</span> {String(v)}</div>
          ))}
          {entries.length > 5 && <div className="text-muted-foreground">...+{entries.length - 5}</div>}
        </TooltipContent>
      </Tooltip>
    );
  }

  // ── Date ───────────────────────────────────────────────────────────────────
  if (type === 'date' && typeof answer === 'string') {
    try {
      return new Date(answer).toLocaleDateString('az-AZ');
    } catch {
      return answer;
    }
  }

  // ── Number ─────────────────────────────────────────────────────────────────
  if (type === 'number') {
    const num = Number(answer);
    if (!isNaN(num)) return num.toLocaleString('az-AZ');
  }

  // ── Plain array (fallback) ─────────────────────────────────────────────────
  if (Array.isArray(answer)) {
    return answer.join(', ') || <span className="text-muted-foreground text-xs italic">—</span>;
  }

  // ── Plain text ─────────────────────────────────────────────────────────────
  const text = String(answer);
  if (text.length > 80) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help truncate block max-w-[180px]">{text.slice(0, 80)}…</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm text-xs whitespace-pre-wrap">
          {text}
        </TooltipContent>
      </Tooltip>
    );
  }
  return text;
}

// ─── Main component ────────────────────────────────────────────────────────────

interface SurveyResponsesDataTableProps {
  responses: SurveyResponseForApproval[];
  selectedSurvey: PublishedSurvey;
  isFetching?: boolean;
}

const SurveyResponsesDataTable: React.FC<SurveyResponsesDataTableProps> = ({
  responses,
  selectedSurvey,
  isFetching,
}) => {
  const questions = useMemo(
    () => (selectedSurvey.questions ?? []).filter((q: any) => q.is_active !== false),
    [selectedSurvey.questions]
  );

  if (responses.length === 0) return null;

  return (
    <div className={cn('overflow-x-auto transition-opacity', isFetching && 'opacity-60')}>
      <table className="w-full border-collapse text-sm">
        {/* ── Header ── */}
        <thead>
          <tr className="bg-muted/60 border-b">
            {/* Sticky institution column */}
            <th
              className="sticky left-0 z-20 bg-muted/80 backdrop-blur-sm px-4 py-3 text-left font-semibold text-foreground min-w-[200px] border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
            >
              Müəssisə
            </th>
            {/* Status column */}
            <th className="px-4 py-3 text-left font-semibold text-foreground min-w-[130px] whitespace-nowrap">
              Status
            </th>
            {/* Question columns */}
            {questions.map((q: any) => (
              <th
                key={q.id}
                className="px-4 py-3 text-left font-semibold text-foreground min-w-[150px] max-w-[250px]"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-0.5 cursor-help">
                      <div className="truncate max-w-[220px]">{q.title}</div>
                      <div className="text-[10px] font-normal text-muted-foreground uppercase tracking-wide">
                        {q.type?.replace('_', ' ')}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {q.title}
                  </TooltipContent>
                </Tooltip>
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {responses.map((response, rowIdx) => {
            const statusKey = response.status ?? 'draft';
            return (
              <tr
                key={response.id}
                className={cn(
                  'border-b transition-colors hover:bg-muted/30',
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                )}
              >
                {/* Sticky institution cell */}
                <td
                  className="sticky left-0 z-10 bg-inherit px-4 py-3 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                >
                  <div className="font-medium text-foreground leading-snug">
                    {response.institution?.short_name || response.institution?.name || '—'}
                  </div>
                  {response.institution?.type && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {response.institution.type}
                    </div>
                  )}
                </td>

                {/* Status cell */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={statusKey} />
                </td>

                {/* Answer cells */}
                {questions.map((q: any) => {
                  const answer = response.responses?.[String(q.id)];
                  return (
                    <td key={q.id} className="px-4 py-3 max-w-[250px]">
                      {formatCellValue(answer, q)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(SurveyResponsesDataTable);