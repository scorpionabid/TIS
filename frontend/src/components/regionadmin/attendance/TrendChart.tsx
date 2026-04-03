import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts';
import { parseISO, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { az } from 'date-fns/locale';

interface TrendData {
  short_date: string;
  date: string;
  reported: boolean;
  rate: number | null;
}

interface TrendChartProps {
  trends?: TrendData[];
}

type ViewType = 'daily' | 'weekly' | 'monthly';

export function TrendChart({ trends }: TrendChartProps) {
  const [viewType, setViewType] = useState<ViewType>('daily');

  const aggregatedData = useMemo(() => {
    if (!trends?.length) return [];

    if (viewType === 'daily') {
      return trends.map((t) => ({
        name: t.short_date,
        fullLabel: t.date,
        rate: t.reported ? t.rate : null,
      }));
    }

    const groups: Record<string, { sum: number; count: number; label: string; full: string }> = {};

    trends.forEach((t) => {
      if (!t.reported || t.rate === null) return;

      const date = parseISO(t.date);
      let key = '';
      let label = '';
      let full = '';

      if (viewType === 'weekly') {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        key = format(start, 'yyyy-ww');
        label = `${format(start, 'dd.MM')} - ${format(end, 'dd.MM')}`;
        full = `${format(start, 'dd MMMM', { locale: az })} - ${format(end, 'dd MMMM yyyy', { locale: az })}`;
      } else {
        key = format(date, 'yyyy-MM');
        label = format(date, 'MMM', { locale: az });
        full = format(date, 'MMMM yyyy', { locale: az });
      }

      if (!groups[key]) {
        groups[key] = { sum: 0, count: 0, label, full };
      }
      groups[key].sum += t.rate;
      groups[key].count += 1;
    });

    return Object.keys(groups).sort().map((key) => ({
      name: groups[key].label,
      fullLabel: groups[key].full,
      rate: groups[key].sum / groups[key].count,
    }));
  }, [trends, viewType]);

  if (!trends?.length) return null;

  const targetRate = 92;
  const validRates = aggregatedData.filter((d) => d.rate !== null).map((d) => d.rate as number);
  const minRate = validRates.length > 0 ? Math.max(0, Math.floor(Math.min(...validRates) - 2)) : 0;

  return (
    <Card className="rounded-[24px] shadow-lg border-0 overflow-hidden bg-white/50 backdrop-blur-xl border border-white/20">
      <CardHeader className="pb-3 pt-6 px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
              <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">
                {viewType === 'daily' ? 'Gündəlik' : viewType === 'weekly' ? 'Həftəlik' : 'Aylıq'} Dinamika
              </CardTitle>
            </div>
            <p className="text-xs font-medium text-slate-400">Trend xətti, hədəf və periodik dəyişmə</p>
          </div>

          <div className="flex bg-slate-100/80 p-1 rounded-xl backdrop-blur-sm self-end">
            {(['daily', 'weekly', 'monthly'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-200 ${
                  viewType === type 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                }`}
              >
                {type === 'daily' ? 'Gün' : type === 'weekly' ? 'Həftə' : 'Ay'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-6">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={aggregatedData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                fontSize={10}
                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                domain={[Math.min(minRate, targetRate - 2), 100]}
                tickFormatter={(val) => `${val}%`}
                fontSize={10}
                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px', 
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px'
                }}
                itemStyle={{ color: '#6366f1', fontWeight: 700 }}
                labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
                formatter={(value: number) => [`${value?.toFixed(1) ?? '-'}%`, 'Davamiyyət']}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullLabel || ''}
              />
              <ReferenceLine 
                y={targetRate} 
                stroke="#f59e0b" 
                strokeDasharray="6 3" 
                strokeWidth={1.5}
                label={{ 
                  position: 'right', 
                  value: `Hədəf ${targetRate}%`, 
                  fill: '#d97706', 
                  fontSize: 10,
                  fontWeight: 700
                }}
              />
              <Area 
                type="monotone" 
                dataKey="rate" 
                stroke="#6366f1" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#chartGradient)" 
                connectNulls
                animationDuration={1500}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
