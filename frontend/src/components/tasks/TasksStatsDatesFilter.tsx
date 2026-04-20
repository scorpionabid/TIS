import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TasksStatsDatesFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClear: () => void;
}

export function TasksStatsDatesFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: TasksStatsDatesFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <CalendarDays className="h-4 w-4" />
        Tarix aralığı:
      </div>
      <input
        type="date"
        value={startDate}
        onChange={e => onStartDateChange(e.target.value)}
        className="h-8 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      <span className="text-slate-400 text-sm">—</span>
      <input
        type="date"
        value={endDate}
        onChange={e => onEndDateChange(e.target.value)}
        className="h-8 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Sıfırla
        </Button>
      )}
    </div>
  );
}
