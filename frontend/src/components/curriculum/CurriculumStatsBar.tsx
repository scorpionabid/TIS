import { cn } from '@/lib/utils';

interface StatChip {
  label: string;
  value: number | string;
  color: 'indigo' | 'blue' | 'amber' | 'purple' | 'orange' | 'rose' | 'emerald' | 'slate';
  highlight?: boolean;
}

interface CurriculumStatsBarProps {
  chips: StatChip[];
  className?: string;
}

const colorMap: Record<StatChip['color'], string> = {
  indigo:  'bg-indigo-50 border-indigo-200 text-indigo-700',
  blue:    'bg-blue-50   border-blue-200   text-blue-700',
  amber:   'bg-amber-50  border-amber-200  text-amber-700',
  purple:  'bg-purple-50 border-purple-200 text-purple-700',
  orange:  'bg-orange-50 border-orange-200 text-orange-700',
  rose:    'bg-rose-50   border-rose-200   text-rose-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  slate:   'bg-slate-100 border-slate-200  text-slate-600',
};

export function CurriculumStatsBar({ chips, className }: CurriculumStatsBarProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {chips.map((chip) => (
        <div
          key={chip.label}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold whitespace-nowrap shrink-0',
            colorMap[chip.color],
            chip.highlight && 'ring-2 ring-offset-1 ring-current/30 font-black'
          )}
        >
          <span className="opacity-70 font-medium">{chip.label}:</span>
          <span className="font-black tabular-nums">
            {typeof chip.value === 'number'
              ? chip.value % 1 === 0 ? chip.value : chip.value.toFixed(1)
              : chip.value}
            <span className="text-[9px] ml-0.5 opacity-60">s</span>
          </span>
        </div>
      ))}
    </div>
  );
}
