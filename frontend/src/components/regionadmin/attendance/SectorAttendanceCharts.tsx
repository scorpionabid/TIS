import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Shirt } from 'lucide-react';

interface SectorData {
  sector_id: number;
  name: string;
  average_attendance_rate: number;
  uniform_compliance_rate: number;
}

interface SectorAttendanceChartsProps {
  sectors: SectorData[];
}

const cleanSectorName = (name: string) => {
  return name
    .replace(/Sektor/i, '')
    .replace(/rayon/i, '')
    .replace(/şəhər/i, '')
    .replace(/təhsil/i, '')
    .replace(/tehsil/i, '')
    .replace(/mərkəzi/i, '')
    .replace(/merkezi/i, '')
    .replace(/bölgə/i, '')
    .replace(/bolge/i, '')
    .trim();
};

export function SectorAttendanceCharts({ sectors }: SectorAttendanceChartsProps) {
  if (!sectors.length) return null;

  const attendanceData = sectors
    .slice()
    .sort((a, b) => b.average_attendance_rate - a.average_attendance_rate)
    .map((s) => ({
      name: cleanSectorName(s.name),
      fullName: s.name,
      rate: s.average_attendance_rate,
    }));

  const uniformData = sectors
    .slice()
    .sort((a, b) => b.uniform_compliance_rate - a.uniform_compliance_rate)
    .map((s) => ({
      name: cleanSectorName(s.name),
      fullName: s.name,
      rate: Number(s.uniform_compliance_rate ?? 0),
    }));

  return (
    <>
      <Card className="rounded-2xl shadow-lg border-0 overflow-hidden bg-white">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-base font-bold text-slate-800">Davamiyyət</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
              Sektor Müqayisəsi
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {attendanceData.map((sector, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 w-20 truncate" title={sector.fullName}>
                  {sector.name}
                </span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sector.rate >= 95
                        ? 'bg-emerald-500'
                        : sector.rate >= 85
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(sector.rate, 100)}%` }}
                  />
                </div>
                <span
                  className={`text-sm font-bold w-12 text-right ${
                    sector.rate >= 95
                      ? 'text-emerald-600'
                      : sector.rate >= 85
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {sector.rate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-lg border-0 overflow-hidden bg-white">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Shirt className="h-4 w-4 text-indigo-600" />
              </div>
              <CardTitle className="text-base font-bold text-slate-800">Məktəbli Forma</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
              Sektor Müqayisəsi
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {uniformData.map((sector, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 w-20 truncate" title={sector.fullName}>
                  {sector.name}
                </span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sector.rate >= 95
                        ? 'bg-emerald-500'
                        : sector.rate >= 85
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(sector.rate, 100)}%` }}
                  />
                </div>
                <span
                  className={`text-sm font-bold w-12 text-right ${
                    sector.rate >= 95
                      ? 'text-emerald-600'
                      : sector.rate >= 85
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {sector.rate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
