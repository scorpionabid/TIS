import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, CheckCircle, TrendingUp, ChevronDown, School } from 'lucide-react';
import { surveyService } from '../../../services/surveys';

interface HierarchicalInstitutionBreakdownProps {
  surveyId: number;
}

interface SchoolStat {
  institution_id: number;
  institution_name: string;
  institution_type: string;
  level: number;
  responses_count: number;
  completed_count: number;
  targeted_count: number;
  response_rate: number;
  completion_rate: number;
}

interface SectorStat {
  institution_id: number;
  institution_name: string;
  institution_type: string;
  level: number;
  responses_count: number;
  completed_count: number;
  targeted_count: number;
  response_rate: number;
  completion_rate: number;
  total_schools: number;
  responded_schools: number;
  school_response_rate: number;
  children?: SchoolStat[];
}

const HierarchicalInstitutionBreakdown: React.FC<HierarchicalInstitutionBreakdownProps> = ({ surveyId }) => {
  const [expandedSectors, setExpandedSectors] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['survey-hierarchical-breakdown', surveyId],
    queryFn: () => surveyService.getHierarchicalBreakdown(surveyId),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  const toggleSector = (sectorId: number) => {
    const newExpanded = new Set(expandedSectors);
    if (newExpanded.has(sectorId)) {
      newExpanded.delete(sectorId);
    } else {
      newExpanded.add(sectorId);
    }
    setExpandedSectors(newExpanded);
  };

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

  const isHierarchical = data.breakdown.some((item: SectorStat) => item.children && item.children.length > 0);

  return (
    <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-dashed">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {isHierarchical ? 'Sektor və Məktəblərə görə' : 'Müəssisələrə görə'} ({data.breakdown.length})
        </h4>
        {data.user_scope && (
          <span className="text-xs text-muted-foreground capitalize">
            {data.user_scope}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {data.breakdown.map((sector: SectorStat) => {
          const isExpanded = expandedSectors.has(sector.institution_id);
          const hasChildren = sector.children && sector.children.length > 0;

          return (
            <div key={sector.institution_id} className="space-y-1">
              {/* Sector Row */}
              <div className="flex items-center justify-between p-2 bg-card rounded border hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {hasChildren && (
                    <button
                      onClick={() => toggleSector(sector.institution_id)}
                      className="flex-shrink-0 hover:bg-muted rounded p-1 transition-colors"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sector.institution_name}</p>
                    {hasChildren && (
                      <p className="text-xs text-muted-foreground">
                        {sector.responded_schools}/{sector.total_schools} məktəb cavab verib ({sector.school_response_rate}%)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <div className="text-center">
                    <Users className="h-3 w-3 mx-auto mb-0.5 text-blue-500" />
                    <span className="font-semibold">{sector.responses_count}</span>
                  </div>

                  <div className="text-center">
                    <TrendingUp className="h-3 w-3 mx-auto mb-0.5 text-green-500" />
                    <span className="font-semibold text-green-600">{sector.response_rate}%</span>
                  </div>

                  <div className="text-center">
                    <CheckCircle className="h-3 w-3 mx-auto mb-0.5 text-emerald-500" />
                    <span className="font-semibold text-emerald-600">{sector.completion_rate}%</span>
                  </div>
                </div>
              </div>

              {/* Schools (Children) */}
              {isExpanded && hasChildren && (
                <div className="ml-6 space-y-1 pl-3 border-l-2 border-muted">
                  {sector.children!.map((school: SchoolStat) => (
                    <div
                      key={school.institution_id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded border border-dashed hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <School className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{school.institution_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        <div className="text-center">
                          <Users className="h-3 w-3 mx-auto mb-0.5 text-blue-500" />
                          <span className="font-semibold">{school.responses_count}</span>
                        </div>

                        <div className="text-center">
                          <TrendingUp className="h-3 w-3 mx-auto mb-0.5 text-green-500" />
                          <span className="font-semibold text-green-600">{school.response_rate}%</span>
                        </div>

                        <div className="text-center">
                          <CheckCircle className="h-3 w-3 mx-auto mb-0.5 text-emerald-500" />
                          <span className="font-semibold text-emerald-600">{school.completion_rate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.total_responses > 0 && (
        <div className="pt-2 mt-2 border-t text-xs text-muted-foreground text-right">
          Ümumi cavab: {data.total_responses}
        </div>
      )}
    </div>
  );
};

export default HierarchicalInstitutionBreakdown;
