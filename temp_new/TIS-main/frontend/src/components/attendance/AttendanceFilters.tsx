import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Loader2 } from 'lucide-react';

interface AttendanceFiltersProps {
  isSchoolAdmin: boolean;
  schools: any[];
  classOptions: string[];
  classOptionsLoading: boolean;
  filters: {
    selectedSchool: string;
    selectedClass: string;
    reportType: string;
    startDate: string;
    endDate: string;
    activeDatePreset: string;
  };
  setters: {
    setSelectedSchool: (val: string) => void;
    setSelectedClass: (val: string) => void;
    setReportType: (val: any) => void;
    setStartDate: (val: string) => void;
    setEndDate: (val: string) => void;
    setActiveDatePreset: (val: string) => void;
  };
  actions: {
    refetch: () => void;
    handleExportReport: () => void;
    handlePresetSelect: (presetId: any) => void;
  };
  loading: boolean;
  isFetching: boolean;
  isExporting: boolean;
}

export const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
  isSchoolAdmin,
  schools,
  classOptions,
  classOptionsLoading,
  filters,
  setters,
  actions,
  loading,
  isFetching,
  isExporting
}) => {
  const datePresets = [
    { id: 'today', label: 'Gün' },
    { id: 'thisWeek', label: 'Həftə' },
    { id: 'thisMonth', label: 'Ay' }
  ];

  return (
    <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filterlər</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={actions.refetch}
              disabled={loading || isFetching}
              className="h-9 px-4 rounded-xl border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-indigo-50"
            >
              {isFetching ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-1.5" />}
              {isFetching ? 'Yenilənir...' : 'Yenilə'}
            </Button>
            <Button
              variant="outline"
              onClick={actions.handleExportReport}
              disabled={isExporting}
              className="h-9 px-4 rounded-xl border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-indigo-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              {isExporting ? 'Export olunur...' : 'Eksport (Excel)'}
            </Button>
          </div>
        </div>

        <div className="flex gap-3 items-end flex-wrap">
          {!isSchoolAdmin && (
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Məktəb</Label>
              <Select value={filters.selectedSchool} onValueChange={setters.setSelectedSchool}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200">
                  <SelectValue placeholder="Məktəb seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün məktəblər</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id.toString()}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sinif</Label>
            <Select value={filters.selectedClass} onValueChange={setters.setSelectedClass}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200">
                <SelectValue placeholder={classOptionsLoading ? 'Yüklənir...' : 'Sinif seçin'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün siniflər</SelectItem>
                {classOptions.map((className) => (
                  <SelectItem key={className} value={className}>{className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hesabat növü</Label>
            <Select value={filters.reportType} onValueChange={setters.setReportType}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Günlük</SelectItem>
                <SelectItem value="weekly">Həftəlik</SelectItem>
                <SelectItem value="monthly">Aylıq</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tarix aralığı</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="h-10 rounded-xl border-slate-200 text-sm"
                value={filters.startDate}
                onChange={(e) => {
                  setters.setActiveDatePreset('custom');
                  setters.setStartDate(e.target.value);
                }}
              />
              <span className="text-slate-400 text-xs">-</span>
              <Input
                type="date"
                className="h-10 rounded-xl border-slate-200 text-sm"
                value={filters.endDate}
                onChange={(e) => {
                  setters.setActiveDatePreset('custom');
                  setters.setEndDate(e.target.value);
                }}
                min={filters.startDate}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hazır intervallar</Label>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {datePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => actions.handlePresetSelect(preset.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    filters.activeDatePreset === preset.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                disabled
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                  filters.activeDatePreset === 'custom' ? 'bg-slate-900 text-white' : 'text-slate-400'
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
};
