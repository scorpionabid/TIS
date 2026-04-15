import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceFiltersProps {
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  selectedShiftType: 'morning' | 'evening' | 'all';
  setSelectedShiftType: (shift: 'morning' | 'evening' | 'all') => void;
  datePreset: 'today' | 'thisWeek' | 'thisMonth';
  handlePresetChange: (preset: 'today' | 'thisWeek' | 'thisMonth') => void;
  onRefresh: () => void;
}

export function AttendanceFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedShiftType,
  setSelectedShiftType,
  datePreset,
  handlePresetChange,
  onRefresh
}: AttendanceFiltersProps) {
  return (
    <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filterlər</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-9 px-3 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Yenilə
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlanğıc tarixi</label>
            <input
              type="date"
              value={startDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm w-full px-3"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Son tarix</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm w-full px-3"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Növə</label>
            <select
              value={selectedShiftType}
              onChange={(e) => setSelectedShiftType(e.target.value as 'morning' | 'evening' | 'all')}
              className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm w-full px-3 bg-white"
            >
              <option value="all">Hər iki növə</option>
              <option value="morning">Səhər növbəsi (10:00)</option>
              <option value="evening">Günorta növbəsi (14:30)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {(['today', 'thisWeek', 'thisMonth'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    datePreset === preset
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                      : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  {preset === 'today' ? 'Gün' : preset === 'thisWeek' ? 'Həftə' : 'Ay'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
