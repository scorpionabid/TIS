import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { School as SchoolIcon } from 'lucide-react';

interface GradeLevelData {
  class_level_display: string;
  average_attendance_rate: number;
  uniform_compliance_rate: number;
  student_count: number;
}

interface GradeLevelChartProps {
  gradeLevels?: GradeLevelData[];
}

export function GradeLevelChart({ gradeLevels }: GradeLevelChartProps) {
  if (!gradeLevels?.length) return null;

  const data = gradeLevels
    .filter(gl => gl.student_count > 0)
    .map((gl) => ({
      name: gl.class_level_display,
      fullName: `${gl.class_level_display} sinif`,
      attendance: gl.average_attendance_rate,
      uniform: gl.uniform_compliance_rate,
      students: gl.student_count,
    }));

  return (
    <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 pb-4">
        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
          <SchoolIcon className="h-5 w-5" />
          Siniflər üzrə Davamiyyət
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                interval={0}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                domain={[0, 100]} 
                tickFormatter={(val) => `${val}%`}
                fontSize={11}
                tick={{ fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  padding: '12px'
                }}
                formatter={(value: number, name: string) => [
                  <span className="font-bold">{value.toFixed(1)}%</span>, 
                  name === 'attendance' ? 'Davamiyyət' : 'Məktəbli forma'
                ]}
                labelFormatter={(label, payload) => (
                  <span className="font-semibold text-slate-700">{payload[0]?.payload?.fullName}</span>
                )}
              />
              <Bar dataKey="attendance" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} name="Davamiyyət" />
              <Bar dataKey="uniform" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} name="Məktəbli forma" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
