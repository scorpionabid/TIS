import React from 'react';
import { Card } from '../../ui/card';
import { Users, CheckCircle2, Clock, Target } from 'lucide-react';

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
      icon: Users,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Tamamlanmış',
      value: data?.completed_responses || 0,
      subtitle: `${data?.completion_rate || 0}% tamamlama`,
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      percentage: data?.completion_rate,
    },
    {
      title: 'Orta Müddət',
      value: data?.average_completion_time ? formatTime(data.average_completion_time) : '-',
      subtitle: 'Cavab müddəti',
      icon: Clock,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      isTime: true,
    },
    {
      title: 'Cavab Dərəcəsi',
      value: `${data?.response_rate || 0}%`,
      subtitle: `${data?.total_responses || 0}/${data?.target_participants || 0}`,
      icon: Target,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      percentage: data?.response_rate,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-2/3 mb-3"></div>
            <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpiCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={`p-4 border-l-4 ${card.borderColor} hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              {card.percentage !== undefined && (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    card.percentage >= 75
                      ? 'bg-green-100 text-green-700'
                      : card.percentage >= 50
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {card.percentage}%
                </span>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
              <p className={`text-2xl font-bold ${card.isTime ? 'text-base' : ''}`}>
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default SurveyKPIMetrics;
