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
  attending_students: number;
  reported_days: number;
  average_attendance_rate: number;
  uniform_compliance_rate?: number;
  total_uniform_violations?: number;
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
      description: `${summary.total_sectors} sektor üzrə`,
      palette: {
        bg: 'bg-indigo-50/50',
        border: 'border-indigo-100',
        accent: 'bg-indigo-200/20',
        text: 'text-indigo-600',
        icon: 'text-indigo-500',
        bar: 'bg-indigo-500'
      },
      isPercent: true,
      raw: summary.total_schools > 0 ? ((summary.total_schools - summary.schools_missing_reports) / summary.total_schools) * 100 : 0
    },
    {
      label: 'Gələn şagird',
      value: summary.attending_students,
      icon: Users,
      description: `${numberFormatter.format(summary.total_students)} şagirddən`,
      palette: {
        bg: 'bg-violet-50/50',
        border: 'border-violet-100',
        accent: 'bg-violet-200/20',
        text: 'text-violet-600',
        icon: 'text-violet-500',
        bar: 'bg-violet-500'
      },
      isPercent: true,
      raw: summary.total_students > 0 ? (summary.attending_students / summary.total_students) * 100 : 0
    },
    {
      value: `${summary.average_attendance_rate.toFixed(1)}%`,
      icon: Target,
      description: `${summary.period?.school_days ?? 0} hesabat gününə görə`,
      palette: {
        bg: 'bg-emerald-50/50',
        border: 'border-emerald-100',
        accent: 'bg-emerald-200/20',
        text: 'text-emerald-600',
        icon: 'text-emerald-500',
        bar: 'bg-emerald-500'
      },
      isPercent: true,
      raw: summary.average_attendance_rate
    },
    {
      label: 'Məktəbli forma',
      value: formatPercent(summary.uniform_compliance_rate),
      icon: Shirt,
      description: `${numberFormatter.format(summary.total_uniform_violations ?? 0)} pozuntu`,
      palette: {
        bg: 'bg-blue-50/50',
        border: 'border-blue-100',
        accent: 'bg-blue-200/20',
        text: 'text-blue-600',
        icon: 'text-blue-500',
        bar: 'bg-blue-500'
      },
      isPercent: true,
      raw: summary.uniform_compliance_rate ?? 0
    },
    {
      label: 'Məlumat çatışmazlığı',
      value: summary.schools_missing_reports,
      icon: AlertTriangle,
      description: 'Gözlənilən hesabat daxil olmayanlar',
      palette: {
        bg: 'bg-orange-50/50',
        border: 'border-orange-200/60',
        accent: 'bg-orange-200/20',
        text: 'text-orange-600',
        icon: 'text-orange-500',
        bar: 'bg-orange-500'
      },
      isPercent: true,
      raw: summary.total_schools > 0 ? (summary.schools_missing_reports / summary.total_schools) * 100 : 0
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <Card 
          key={card.label} 
          className={`relative border-2 border-b-4 ${card.palette.border} ${card.palette.bg} rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-inset ring-white/40`}
        >
          <div className={`absolute top-0 right-0 w-16 h-16 ${card.palette.accent} rounded-bl-full transform translate-x-3 -translate-y-3 group-hover:scale-110 transition-transform duration-500`} />

          <div className="flex items-center gap-3 p-3 pb-0 relative">
            <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center ring-1 ring-black/5 shrink-0 group-hover:scale-105 transition-transform duration-300">
              <card.icon className={`h-5 w-5 ${card.palette.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[9px] font-black ${card.palette.text} tracking-[0.1em] uppercase opacity-70 mb-0.5 truncate`}>
                {card.label}
              </div>
              <div className="text-xl font-black text-slate-800 tracking-tight leading-none">
                {typeof card.value === 'number' ? numberFormatter.format(card.value) : card.value}
              </div>
            </div>
          </div>

          <CardContent className="p-3 pt-1.5 pb-2.5">
            <p className="text-[10px] font-medium text-slate-400 mb-2 truncate">
              {card.description}
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden shadow-inner border border-black/5">
                <div 
                  className={`h-full rounded-full ${card.palette.bar} transition-all duration-1000 ease-out shadow-sm`}
                  style={{ width: `${Math.min(card.raw, 100)}%` }}
                />
              </div>
              <span className={`text-[9px] font-bold ${card.palette.text} min-w-[24px]`}>
                {Math.round(card.raw)}%
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
