import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, Target, Shirt, AlertTriangle } from 'lucide-react';

const numberFormatter = new Intl.NumberFormat('az');

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

interface SummaryData {
  total_schools: number;
  total_sectors: number;
  total_students: number;
  reported_days: number;
  average_attendance_rate: number;
  uniform_compliance_rate: number;
  total_uniform_violations: number;
  schools_missing_reports: number;
  period: {
    school_days: number;
  };
}

interface AttendanceSummaryCardsProps {
  summary?: SummaryData;
  loading: boolean;
}

export function AttendanceSummaryCards({ summary, loading }: AttendanceSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      label: 'Məktəblər',
      value: summary.total_schools,
      icon: Building2,
      description: `${summary.total_sectors} sektor`,
      palette: { line: 'bg-[#2563eb]', icon: 'from-[#2563eb] to-[#60a5fa]', value: 'text-[#1d4ed8]' }
    },
    {
      label: 'Şagird sayı',
      value: summary.total_students,
      icon: Users,
      description: `${summary.reported_days} hesabat günü`,
      palette: { line: 'bg-[#7c3aed]', icon: 'from-[#7c3aed] to-[#c084fc]', value: 'text-[#6d28d9]' }
    },
    {
      label: 'Orta davamiyyət',
      value: `${summary.average_attendance_rate.toFixed(1)}%`,
      icon: Target,
      description: 'Hesabat dövrü üzrə',
      palette: { line: 'bg-[#10b981]', icon: 'from-[#10b981] to-[#6ee7b7]', value: 'text-[#047857]' }
    },
    {
      label: 'Məktəbli forma',
      value: formatPercent(summary.uniform_compliance_rate),
      icon: Shirt,
      description: `${numberFormatter.format(summary.total_uniform_violations ?? 0)} pozuntu`,
      palette: { line: 'bg-[#6366f1]', icon: 'from-[#6366f1] to-[#a5b4fc]', value: 'text-[#3730a3]' }
    },
    {
      label: 'Məlumat çatışmazlığı',
      value: summary.schools_missing_reports,
      icon: AlertTriangle,
      description: 'Gözlənilən hesabat daxil olmayanlar',
      palette: { line: 'bg-[#f59e0b]', icon: 'from-[#f97316] to-[#facc15]', value: 'text-[#b45309]' },
      special: true
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, idx) => (
        <Card
          key={card.label}
          className={`relative overflow-hidden rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_26px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 ${
            card.special ? 'bg-gradient-to-br from-[#fff8eb] to-[#fff4d7] border border-amber-200' : ''
          }`}
        >
          <div className={`absolute top-0 left-0 right-0 h-1 ${card.palette.line}`} />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500">{card.label}</CardTitle>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-[0_12px_20px_rgba(15,23,42,0.12)] bg-gradient-to-br ${card.palette.icon}`}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-extrabold ${card.palette.value}`}>
              {typeof card.value === 'number' ? numberFormatter.format(card.value) : card.value}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
