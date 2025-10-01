import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, CheckCircle, Clock, XCircle } from 'lucide-react';

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

interface ResponseStatusPieChartProps {
  data: StatusData[] | undefined;
  isLoading: boolean;
}

const ResponseStatusPieChart: React.FC<ResponseStatusPieChartProps> = ({ data, isLoading }) => {
  const COLORS = {
    completed: '#10b981', // green
    in_progress: '#f59e0b', // orange
    not_started: '#ef4444', // red
  };

  const STATUS_LABELS: Record<string, string> = {
    completed: 'Tamamlanmış',
    in_progress: 'Davam edən',
    not_started: 'Başlanmamış',
  };

  const STATUS_ICONS: Record<string, React.ElementType> = {
    completed: CheckCircle,
    in_progress: Clock,
    not_started: XCircle,
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium mb-1">
            {STATUS_LABELS[data.status] || data.status}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.count} cavab ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const Icon = STATUS_ICONS[entry.payload.status];
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {Icon && <Icon className="h-3 w-3" style={{ color: entry.color }} />}
              <span className="text-xs">
                {STATUS_LABELS[entry.payload.status] || entry.payload.status}
                <span className="font-semibold ml-1">
                  ({entry.payload.percentage}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null; // Don't show label for small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${percentage}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Cavab Statusu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Cavab Statusu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Status məlumatı yoxdur</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out zero count items for cleaner chart
  const chartData = data.filter(d => d.count > 0);
  const totalCount = chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Cavab Statusu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={90}
                innerRadius={50}
                fill="#8884d8"
                dataKey="count"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.status as keyof typeof COLORS] || '#94a3b8'}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Label */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Toplam</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponseStatusPieChart;
