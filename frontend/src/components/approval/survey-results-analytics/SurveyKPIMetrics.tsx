import React from 'react';

interface KPIMetricsData {
  total_responses: number;
  completed_responses: number;
  in_progress_responses: number;
  not_started: number;
  completion_rate: number;
  average_completion_time: number; // in seconds
  target_participants: number;
  response_rate: number;
}

interface SurveyKPIMetricsProps {
  data: KPIMetricsData | undefined;
  isLoading: boolean;
}

const SurveyKPIMetrics: React.FC<SurveyKPIMetricsProps> = ({ data, isLoading }) => {
  const formatTime = (seconds: number): string => {
    if (!seconds) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${minutes}d ${secs}s` : `${minutes}d`;
  };

  const kpiCards = [
    {
      title: 'Ümumi Cavablar',
      value: data?.total_responses || 0,
      subtitle: `${data?.target_participants || 0} hədəf`,
      showPercentage: false
    },
    {
      title: 'Tamamlanmış',
      value: data?.completed_responses || 0,
      subtitle: `${data?.completion_rate || 0}% tamamlama`,
      percentage: data?.completion_rate,
      showPercentage: true
    },
    {
      title: 'Orta Müddət',
      value: data?.average_completion_time ? formatTime(data.average_completion_time) : '-',
      subtitle: 'Cavab müddəti',
      showPercentage: false
    },
    {
      title: 'Cavab Dərəcəsi',
      value: `${data?.response_rate || 0}%`,
      subtitle: `${data?.total_responses || 0}/${data?.target_participants || 0}`,
      percentage: data?.response_rate,
      showPercentage: true
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3 rounded-lg border bg-white shadow-sm">
            <div className="h-4 bg-muted rounded w-2/3 mb-3"></div>
            <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpiCards.map((card, index) => (
        <div key={index} className="px-4 py-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</div>
            {card.showPercentage && card.percentage !== undefined && (
              <span 
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  card.percentage >= 75
                    ? 'bg-emerald-50 text-emerald-600'
                    : card.percentage >= 50
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                {card.percentage}%
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-slate-900 tracking-tight">{card.value}</div>
            <div className="text-[10px] text-slate-400 font-medium">{card.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SurveyKPIMetrics;
