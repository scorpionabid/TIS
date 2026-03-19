import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Area, Line, Tooltip } from 'recharts';

interface TrendData {
  short_date: string;
  date: string;
  reported: boolean;
  rate: number | null;
}

interface TrendChartProps {
  trends?: TrendData[];
}

export function TrendChart({ trends }: TrendChartProps) {
  if (!trends?.length) return null;

  const targetRate = 92; // Target line at 92%
  
  const data = trends.map((t) => ({
    name: t.short_date,
    fullDate: t.date,
    rate: t.reported ? t.rate : null,
  }));

  return (
    <Card className="rounded-2xl shadow-lg border-0 overflow-hidden bg-white">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <CardTitle className="text-base font-bold text-slate-800">Gündəlik dinamika</CardTitle>
          </div>
          <span className="text-xs text-slate-400">Area + hədəf xətti</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Trendin istiqaməti, dəyişkənlik və hədəfdən sapma bir qrafikdə
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 60, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                fontSize={11}
                tick={{ fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                domain={[84, 100]} 
                tickFormatter={(val) => `${val}%`}
                fontSize={11}
                tick={{ fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              {/* Target Line */}
              <ReferenceLine 
                y={targetRate} 
                stroke="#f59e0b" 
                strokeDasharray="4 4" 
                strokeWidth={2}
              />
              {/* Area fill */}
              <Area 
                type="monotone" 
                dataKey="rate" 
                stroke="none" 
                fill="url(#colorRate)" 
                connectNulls
              />
              {/* Main line */}
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#6366f1" 
                strokeWidth={2}
                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                connectNulls
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  padding: '12px'
                }}
                formatter={(value: number) => [
                  <span className="font-bold text-indigo-600">{value?.toFixed(1) ?? '-'}%</span>, 
                  'Davamiyyət'
                ]}
                labelFormatter={(label) => (
                  <span className="font-semibold text-slate-700">{label}</span>
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Target label */}
        <div className="flex justify-end items-center gap-2 mt-2 mr-12">
          <div className="w-4 h-0 border-t-2 border-dashed border-amber-500" />
          <span className="text-xs font-medium text-amber-600">Hədəf {targetRate}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
