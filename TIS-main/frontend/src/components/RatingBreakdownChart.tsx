/**
 * RatingBreakdownChart Component
 *
 * Displays rating breakdown by components (stacked bar chart)
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RatingBreakdown } from '../../types/teacherRating';

interface RatingBreakdownChartProps {
  breakdown: RatingBreakdown;
  height?: number;
}

const COMPONENT_COLORS = {
  academic: '#3b82f6', // blue
  lesson_observation: '#10b981', // green
  olympiad: '#f59e0b', // amber
  assessment: '#8b5cf6', // purple
  certificate: '#ec4899', // pink
  award: '#ef4444', // red
};

const COMPONENT_LABELS = {
  academic: 'Akademik Nəticələr (30%)',
  lesson_observation: 'Dərs Müşahidəsi (20%)',
  olympiad: 'Olimpiadalar (15%)',
  assessment: 'Qiymətləndirmə (15%)',
  certificate: 'Sertifikatlar (10%)',
  award: 'Mükafatlar (10%)',
};

export function RatingBreakdownChart({
  breakdown,
  height = 300,
}: RatingBreakdownChartProps) {
  // Prepare data for chart
  const data = [
    {
      name: 'Reytinq Komponentləri',
      academic: breakdown.academic.weighted_score,
      lesson_observation: breakdown.lesson_observation.weighted_score,
      olympiad: breakdown.olympiad.weighted_score,
      assessment: breakdown.assessment.weighted_score,
      certificate: breakdown.certificate.weighted_score,
      award: breakdown.award.weighted_score,
    },
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">Reytinq Komponentləri</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">
                {COMPONENT_LABELS[entry.dataKey as keyof typeof COMPONENT_LABELS]}:
              </span>
              <span className="font-semibold">{entry.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Reytinq Breakdown</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis type="category" dataKey="name" width={150} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) =>
              COMPONENT_LABELS[value as keyof typeof COMPONENT_LABELS] || value
            }
          />
          <Bar dataKey="academic" stackId="a" fill={COMPONENT_COLORS.academic} />
          <Bar
            dataKey="lesson_observation"
            stackId="a"
            fill={COMPONENT_COLORS.lesson_observation}
          />
          <Bar dataKey="olympiad" stackId="a" fill={COMPONENT_COLORS.olympiad} />
          <Bar
            dataKey="assessment"
            stackId="a"
            fill={COMPONENT_COLORS.assessment}
          />
          <Bar
            dataKey="certificate"
            stackId="a"
            fill={COMPONENT_COLORS.certificate}
          />
          <Bar dataKey="award" stackId="a" fill={COMPONENT_COLORS.award} />
        </BarChart>
      </ResponsiveContainer>

      {/* Component Details Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {Object.entries(breakdown).map(([key, value]) => {
          if (key === 'total_before_bonus') return null;

          return (
            <div
              key={key}
              className="p-4 border rounded-lg"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor:
                  COMPONENT_COLORS[key as keyof typeof COMPONENT_COLORS],
              }}
            >
              <div className="text-xs text-gray-500 mb-1">
                {COMPONENT_LABELS[key as keyof typeof COMPONENT_LABELS]}
              </div>
              <div className="text-2xl font-bold">
                {value.weighted_score.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Raw: {value.raw_score.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
