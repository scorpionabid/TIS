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
  indigo:  'bg-indigo-50/80 border-indigo-200/60 text-indigo-700 shadow-[0_2px_10px_-3px_rgba(79,70,229,0.15)]',
  blue:    'bg-blue-50/80   border-blue-200/60   text-blue-700   shadow-[0_2px_10px_-3px_rgba(37,99,235,0.15)]',
  amber:   'bg-amber-50/80  border-amber-200/60  text-amber-700  shadow-[0_2px_10px_-3px_rgba(217,119,6,0.15)]',
  purple:  'bg-purple-50/80 border-purple-200/60 text-purple-700 shadow-[0_2px_10px_-3px_rgba(147,51,234,0.15)]',
  orange:  'bg-orange-50/80 border-orange-200/60 text-orange-700 shadow-[0_2px_10px_-3px_rgba(234,88,12,0.15)]',
  rose:    'bg-rose-50/80   border-rose-200/60   text-rose-700   shadow-[0_2px_10px_-3px_rgba(225,29,72,0.15)]',
  emerald: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 shadow-[0_2px_10px_-3px_rgba(5,150,105,0.15)]',
  slate:   'bg-slate-100/80 border-slate-200/60  text-slate-600  shadow-[0_2px_10px_-3px_rgba(71,85,105,0.15)]',
};

export function CurriculumStatsBar({ chips, className }: CurriculumStatsBarProps) {
  return (
    <div className={cn('flex items-center gap-2.5 w-full overflow-x-auto no-scrollbar py-1', className)}>
      {chips.map((chip) => (
        <div
          key={chip.label}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-2xl border text-[11px] transition-all hover:scale-[1.02] hover:shadow-lg backdrop-blur-sm min-w-0',
            colorMap[chip.color],
            chip.highlight ? 'font-black ring-2 ring-inset ring-current/20' : 'font-semibold'
          )}
        >
          <span className="opacity-70 font-medium truncate hidden md:inline uppercase tracking-wider">{chip.label}:</span>
          <span className="font-black tabular-nums whitespace-nowrap text-xs">
            {typeof chip.value === 'number'
              ? chip.value % 1 === 0 ? chip.value : chip.value.toFixed(1)
              : chip.value}
            <span className="text-[10px] ml-0.5 opacity-60">s</span>
          </span>
        </div>
      ))}
    </div>
  );
}
