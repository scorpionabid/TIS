import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ViewMode = 'card' | 'list' | 'compact';

interface SurveyListItemProps {
  title: string;
  badge: string;
  badgeCls: string;
  meta?: string;
  isSelected: boolean;
  viewMode: ViewMode;
  onClick: () => void;
}

export function SurveyListItem({ title, badge, badgeCls, meta, isSelected, viewMode, onClick }: SurveyListItemProps) {
  if (viewMode === 'card') {
    return (
      <button
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
        {meta && <p className="text-xs text-slate-400">{meta}</p>}
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
      <span className={cn('text-sm font-medium truncate flex-1', isSelected ? 'text-white' : 'text-slate-800')}>
        {title}
      </span>
      <Badge variant="outline" className={cn(
        'text-xs shrink-0 border px-1.5 py-0',
        isSelected ? 'bg-white/20 text-white border-transparent' : badgeCls,
      )}>
        {badge}
      </Badge>
    </button>
  );
}
