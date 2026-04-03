import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Shirt } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

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

const getChartColor = (rate: number) => {
  if (rate >= 95) return '#10b981'; // Emerald-500
  if (rate >= 85) return '#f59e0b'; // Amber-500
  return '#ef4444'; // Red-500
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="text-xs font-bold text-slate-800 mb-1">{data.fullName}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getChartColor(payload[0].value) }} />
            <p className="text-sm font-extrabold text-slate-900">{payload[0].value.toFixed(1)}%</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
      <Card className="rounded-2xl shadow-lg border-0 bg-white/50 backdrop-blur-xl border border-white/20">
        <CardHeader className="pb-2 pt-6 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
              <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">Sektor: Davamiyyət</CardTitle>
            </div>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} layout="vertical" margin={{ left: -10, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} fontSize={11} tick={{ fill: '#64748b', fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                <Bar dataKey="rate" radius={[0, 10, 10, 0]} barSize={16}>
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getChartColor(entry.rate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-lg border-0 bg-white/50 backdrop-blur-xl border border-white/20">
        <CardHeader className="pb-2 pt-6 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
              <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">Sektor: Forma</CardTitle>
            </div>
            <Shirt className="h-4 w-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uniformData} layout="vertical" margin={{ left: -10, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} fontSize={11} tick={{ fill: '#64748b', fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                <Bar dataKey="rate" radius={[0, 10, 10, 0]} barSize={16}>
                  {uniformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getChartColor(entry.rate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
