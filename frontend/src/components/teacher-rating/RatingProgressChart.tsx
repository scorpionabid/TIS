/**
 * RatingProgressChart Component
 *
 * Line chart showing rating progress across multiple years
 * Displays trend analysis and year-over-year comparison
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { YearComparison } from '../../types/teacherRating';

interface RatingProgressChartProps {
  data: YearComparison[];
  height?: number;
  showComponents?: boolean;
}

export function RatingProgressChart({
  data,
  height = 400,
  showComponents = false,
}: RatingProgressChartProps) {
  // Sort data by year
  const sortedData = [...data].sort((a, b) => {
    const yearA = parseInt(a.academic_year.name.split('-')[0]);
    const yearB = parseInt(b.academic_year.name.split('-')[0]);
    return yearA - yearB;
  });

  // Prepare chart data
  const chartData = sortedData.map((item) => ({
    year: item.academic_year.name,
    total: item.total_score,
    academic: item.breakdown.academic.weighted_score,
    lesson_observation: item.breakdown.lesson_observation.weighted_score,
    olympiad: item.breakdown.olympiad.weighted_score,
    assessment: item.breakdown.assessment.weighted_score,
    certificate: item.breakdown.certificate.weighted_score,
    award: item.breakdown.award.weighted_score,
  }));

  // Calculate overall trend
  const calculateTrend = (): { direction: 'up' | 'down' | 'stable'; value: number } => {
    if (sortedData.length < 2) return { direction: 'stable', value: 0 };

    const first = sortedData[0].total_score;
    const last = sortedData[sortedData.length - 1].total_score;
    const change = last - first;
    const changePercent = (change / first) * 100;

    if (Math.abs(changePercent) < 1) return { direction: 'stable', value: changePercent };
    return {
      direction: change > 0 ? 'up' : 'down',
      value: changePercent,
    };
  };

  const trend = calculateTrend();

  // Calculate average score
  const averageScore =
    sortedData.reduce((sum, item) => sum + item.total_score, 0) / sortedData.length;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{payload[0].payload.year}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Ümumi Bal:</span>
              <span className="text-sm font-bold text-blue-600">
                {payload[0].payload.total.toFixed(2)}
              </span>
            </div>
            {showComponents && (
              <>
                <div className="border-t my-1" />
                <div className="text-xs space-y-0.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Akademik:</span>
                    <span>{payload[0].payload.academic.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dərs Müşahidə:</span>
                    <span>{payload[0].payload.lesson_observation.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Olimpiada:</span>
                    <span>{payload[0].payload.olympiad.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Qiymətləndirmə:</span>
                    <span>{payload[0].payload.assessment.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sertifikat:</span>
                    <span>{payload[0].payload.certificate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mükafat:</span>
                    <span>{payload[0].payload.award.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">İllik Reytinq Tərəqqisi</CardTitle>
          <div className="flex items-center gap-2">
            {/* Trend Badge */}
            {trend.direction === 'up' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{trend.value.toFixed(1)}%
              </Badge>
            )}
            {trend.direction === 'down' && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <TrendingDown className="h-3 w-3 mr-1" />
                {trend.value.toFixed(1)}%
              </Badge>
            )}
            {trend.direction === 'stable' && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                <Minus className="h-3 w-3 mr-1" />
                Sabit
              </Badge>
            )}

            {/* Average Badge */}
            <Badge variant="secondary">
              Orta: {averageScore.toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />

            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: 'Bal', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
              iconType="line"
            />

            {/* Average Reference Line */}
            <ReferenceLine
              y={averageScore}
              stroke="#9ca3af"
              strokeDasharray="5 5"
              label={{
                value: `Orta: ${averageScore.toFixed(1)}`,
                position: 'right',
                fontSize: 11,
                fill: '#6b7280',
              }}
            />

            {/* Main Line - Total Score */}
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
              name="Ümumi Bal"
            />

            {/* Component Lines */}
            {showComponents && (
              <>
                <Line
                  type="monotone"
                  dataKey="academic"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Akademik"
                />
                <Line
                  type="monotone"
                  dataKey="lesson_observation"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Dərs Müşahidə"
                />
                <Line
                  type="monotone"
                  dataKey="olympiad"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Olimpiada"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Year-over-Year Changes */}
        {sortedData.length > 1 && (
          <div className="mt-6 pt-4 border-t">
            <div className="text-sm font-medium text-muted-foreground mb-3">
              İllik Dəyişikliklər
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedData.slice(1).map((item, index) => {
                const prevItem = sortedData[index];
                const change = item.total_score - prevItem.total_score;
                const changePercent = (change / prevItem.total_score) * 100;

                return (
                  <div
                    key={item.academic_year.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div className="text-xs">
                      <div className="font-medium">{item.academic_year.name}</div>
                      <div className="text-muted-foreground">
                        vs {prevItem.academic_year.name}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        change > 0
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : change < 0
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }
                    >
                      {change > 0 ? '+' : ''}
                      {change.toFixed(2)} ({changePercent > 0 ? '+' : ''}
                      {changePercent.toFixed(1)}%)
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
