import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, BarChart3, FileDown } from 'lucide-react';

interface Sector {
  sector_id: number;
  name: string;
}

interface AttendanceFiltersProps {
  startDate: string;
  endDate: string;
  selectedSectorId: string;
  selectedEducationProgram: string;
  datePreset: 'today' | 'thisWeek' | 'thisMonth' | 'custom';
  sectors: Sector[];
  loading: boolean;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onSectorChange: (val: string) => void;
  onEducationProgramChange: (val: string) => void;
  onPresetChange: (preset: 'today' | 'thisWeek' | 'thisMonth' | 'custom') => void;
  onRefresh: () => void;
  onExport: () => void;
}

export function AttendanceFilters({
  startDate,
  endDate,
  selectedSectorId,
  selectedEducationProgram,
  datePreset,
  sectors,
  loading,
  onStartDateChange,
  onEndDateChange,
  onSectorChange,
  onEducationProgramChange,
  onPresetChange,
  onRefresh,
  onExport
}: AttendanceFiltersProps) {
  return (
    <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filterlər</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-1.5" />
              )}
              {loading ? 'Yenilənir...' : 'Yenilə'}
            </Button>
            <Button
              variant="outline"
              onClick={onExport}
              disabled={loading}
              className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
            >
              <FileDown className="mr-1.5 h-4 w-4" />
              Eksport (Excel)
            </Button>
          </div>
        </div>

        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlanğıc tarixi</Label>
            <Input
              type="date"
              value={startDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Son tarix</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sektor</Label>
            <Select value={selectedSectorId} onValueChange={onSectorChange}>
              <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
                <SelectValue placeholder="Sektor seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün sektorlar</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector.sector_id} value={sector.sector_id.toString()}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Təhsil proqramı</Label>
            <Select value={selectedEducationProgram} onValueChange={onEducationProgramChange}>
              <SelectTrigger className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700">
                <SelectValue placeholder="Təhsil proqramı seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün proqramlar</SelectItem>
                <SelectItem value="umumi">Ümumi təhsil</SelectItem>
                <SelectItem value="xususi">Xüsusi təhsil</SelectItem>
                <SelectItem value="mektebde_ferdi">Məktəbdə fərdi təhsil</SelectItem>
                <SelectItem value="evde_ferdi">Evdə fərdi təhsil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mt-5">
              {(['today', 'thisWeek', 'thisMonth'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onPresetChange(preset)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    datePreset === preset
                      ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                      : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  {preset === 'today' ? 'Gün' : preset === 'thisWeek' ? 'Həftə' : 'Ay'}
                </button>
              ))}
              <button
                type="button"
                disabled
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-not-allowed ${
                  datePreset === 'custom'
                    ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                    : 'text-slate-400'
                }`}
              >
                Fərdi
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
