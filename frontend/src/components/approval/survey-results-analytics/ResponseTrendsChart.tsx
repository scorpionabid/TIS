import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

interface TrendData {
  date: string;
  responses_count: number;
  cumulative: number;
}

interface TrendsSummary {
  total_responses: number;
  avg_daily_responses: number;
  peak_day: string | null;
  peak_count: number;
}

interface ResponseTrendsChartProps {
  data: {
    trends: TrendData[];
    summary: TrendsSummary;
  } | undefined;
  isLoading: boolean;
}

const ResponseTrendsChart: React.FC<ResponseTrendsChartProps> = ({ data, isLoading }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium mb-2">
            {new Date(payload[0].payload.date).toLocaleDateString('az-AZ', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-blue-600">
              Günlük: <span className="font-semibold">{payload[0].value}</span> cavab
            </p>
            <p className="text-xs text-purple-600">
              Toplam: <span className="font-semibold">{payload[1]?.value || 0}</span> cavab
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Cavab Trendləri
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

  if (!data || !data.trends || data.trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Cavab Trendləri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Trend məlumatı yoxdur</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Cavab Trendləri (Son 30 gün)
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Ortalama: <span className="font-semibold text-foreground">{data.summary.avg_daily_responses}</span> cavab/gün
              </span>
              {data.summary.peak_day && (
                <span>
                  Pik: <span className="font-semibold text-foreground">{data.summary.peak_count}</span> cavab
                  ({formatDate(data.summary.peak_day)})
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data.trends}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'responses_count') return 'Günlük Cavablar';
                if (value === 'cumulative') return 'Toplam Cavablar';
                return value;
              }}
            />
            <Line
              type="monotone"
              dataKey="responses_count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
              name="responses_count"
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#a855f7', r: 3 }}
              name="cumulative"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ResponseTrendsChart;
