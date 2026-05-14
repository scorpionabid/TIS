import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ViewMode = 'card' | 'list' | 'compact';

interface SurveyListItemProps {
  title: string;
  badge: string;
  badgeCls: string;
  meta?: string;
  creator?: string;
  isSelected: boolean;
  viewMode: ViewMode;
  onClick: () => void;
}

export function SurveyListItem({ title, badge, badgeCls, meta, creator, isSelected, viewMode, onClick }: SurveyListItemProps) {
  if (viewMode === 'card') {
    return (
      <button
        data-testid="survey-list-item"
        onClick={onClick}
        className={cn(
          'w-full text-left p-3.5 rounded-lg border transition-all group relative overflow-hidden',
          isSelected
            ? 'border-[hsl(220_85%_25%)] bg-white shadow-md'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
        )}
      >
        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[hsl(220_85%_25%)]" />}
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <h4 className={cn(
            'text-sm font-medium leading-snug line-clamp-2 flex-1',
            isSelected ? 'text-[hsl(220_85%_25%)]' : 'text-slate-800',
          )}>
            {title}
          </h4>
          <Badge variant="outline" className={cn('text-xs shrink-0 border px-1.5 py-0', badgeCls)}>
            {badge}
          </Badge>
        </div>
        {meta && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400">{meta}</p>
            {(() => {
              const match = meta.match(/(\d+)%/);
              if (match) {
                const pct = parseInt(match[1]);
                return (
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        pct > 80 ? 'bg-emerald-500' : pct > 40 ? 'bg-blue-500' : 'bg-amber-500',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}
        {creator && (
          <p className="text-[10px] text-slate-400 truncate mt-1">👤 {creator}</p>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center justify-between gap-2 border rounded transition-all',
        viewMode === 'list' ? 'px-3 py-2.5 rounded-lg' : 'px-2.5 py-1.5',
        isSelected
          ? 'border-[hsl(220_85%_25%)] bg-[hsl(220_85%_25%)] text-white'
          : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm font-medium truncate block', isSelected ? 'text-white' : 'text-slate-800')}>
          {title}
        </span>
        {meta && (() => {
          const match = meta.match(/(\d+)%/);
          if (match) {
            const pct = parseInt(match[1]);
            return (
              <div className={cn("h-0.5 w-24 rounded-full mt-1 overflow-hidden", isSelected ? "bg-white/20" : "bg-slate-100")}>
                <div 
                  className={cn("h-full transition-all", isSelected ? "bg-white" : "bg-blue-500")}
                  style={{ width: `${pct}%` }} 
                />
              </div>
            );
          }
          return null;
        })()}
      </div>
      <Badge variant="outline" className={cn(
        'text-xs shrink-0 border px-1.5 py-0',
        isSelected ? 'bg-white/20 text-white border-transparent' : badgeCls,
      )}>
        {badge}
      </Badge>
    </button>
  );
}
