import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const CurriculumStatsCharts = ({ mpStats, vacantStats }: { mpStats: any, vacantStats: any }) => {
  const pieData = [
    { name: 'Ümumi', value: mpStats.cadvel2 },
    { name: 'Dərsdənkənar', value: mpStats.cadvel3 },
    { name: 'Fərdi', value: mpStats.cadvel4 },
    { name: 'Evdə', value: mpStats.cadvel5 },
    { name: 'Xüsusi', value: mpStats.cadvel6 },
    { name: 'Dərnək', value: mpStats.dernek },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'Ümumi', plan: vacantStats.c2.tot, fact: vacantStats.c2.ass },
    { name: 'Dərsdənkənar', plan: vacantStats.c3.tot, fact: vacantStats.c3.ass },
    { name: 'Fərdi', plan: vacantStats.c4.tot, fact: vacantStats.c4.ass },
    { name: 'Evdə', plan: vacantStats.c5.tot, fact: vacantStats.c5.ass },
    { name: 'Xüsusi', plan: vacantStats.c6.tot, fact: vacantStats.c6.ass },
    { name: 'Dərnək', plan: vacantStats.dernek.tot, fact: vacantStats.dernek.ass },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
      <Card className="shadow-premium border-none">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Saatların Bölünməsi (Faizlə)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-premium border-none">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Plan vs Təyinat (Vakansiya)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar name="Plan (Saat)" dataKey="plan" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar name="Təyin edilib" dataKey="fact" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
