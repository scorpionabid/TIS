import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, CheckCircle, TrendingUp } from 'lucide-react';
import { surveyService } from '../../../services/surveys';

interface InstitutionBreakdownProps {
  surveyId: number;
}

interface InstitutionStat {
  institution_id: number;
  institution_name: string;
  institution_type: string;
  level: number;
  responses_count: number;
  completed_count: number;
  targeted_count: number;
  response_rate: number;
  completion_rate: number;
  last_response_at: string | null;
}

const InstitutionBreakdown: React.FC<InstitutionBreakdownProps> = ({ surveyId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['survey-institution-breakdown', surveyId],
    queryFn: () => surveyService.getInstitutionBreakdown(surveyId),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  if (isLoading) {
    return (
      <div className="p-3 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!data?.breakdown || data.breakdown.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground text-center">
        Müəssisə məlumatı tapılmadı
      </div>
    );
  }

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'system': return 'Bütün müəssisələr';
      case 'regional': return 'Region müəssisələri';
      case 'sector': return 'Sektor müəssisələri';
      case 'school': return 'Məktəb';
      default: return '';
    }
  };

  return (
    <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-dashed">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Müəssisələrə görə ({data.breakdown.length})
        </h4>
        {data.user_scope && (
          <span className="text-xs text-muted-foreground">
            {getScopeLabel(data.user_scope)}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {data.breakdown.map((inst: InstitutionStat) => (
          <div 
            key={inst.institution_id} 
            className="flex items-center justify-between p-2 bg-card rounded border hover:border-primary/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{inst.institution_name}</p>
              <p className="text-xs text-muted-foreground">{inst.institution_type}</p>
            </div>
            
            <div className="flex items-center gap-3 text-xs flex-shrink-0">
              <div className="text-center">
                <Users className="h-3 w-3 mx-auto mb-0.5 text-blue-500" />
                <span className="font-semibold">{inst.responses_count}</span>
              </div>
              
              <div className="text-center">
                <TrendingUp className="h-3 w-3 mx-auto mb-0.5 text-green-500" />
                <span className="font-semibold text-green-600">{inst.response_rate}%</span>
              </div>
              
              <div className="text-center">
                <CheckCircle className="h-3 w-3 mx-auto mb-0.5 text-emerald-500" />
                <span className="font-semibold text-emerald-600">{inst.completion_rate}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.total_responses > 0 && (
        <div className="pt-2 mt-2 border-t text-xs text-muted-foreground text-right">
          Ümumi cavab: {data.total_responses}
        </div>
      )}
    </div>
  );
};

export default InstitutionBreakdown;
