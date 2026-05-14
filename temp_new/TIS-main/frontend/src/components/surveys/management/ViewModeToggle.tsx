import { LayoutGrid, List, Rows } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'card' | 'list' | 'compact';

const VIEW_MODES: { mode: ViewMode; Icon: React.ElementType }[] = [
  { mode: 'card',    Icon: LayoutGrid },
  { mode: 'list',    Icon: List       },
  { mode: 'compact', Icon: Rows       },
];

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded">
      {VIEW_MODES.map(({ mode, Icon }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            'p-1.5 rounded transition-all',
            value === mode
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-600',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
