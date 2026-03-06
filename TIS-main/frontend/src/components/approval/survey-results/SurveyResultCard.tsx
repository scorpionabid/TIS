import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Eye, Download, ChevronDown } from 'lucide-react';
import { Survey } from '../../../services/surveys';
import HierarchicalInstitutionBreakdown from './HierarchicalInstitutionBreakdown';

interface SurveyResultCardProps {
  survey: Survey;
  onExport: () => void;
  isExporting: boolean;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  navigate: (path: string) => void;
}

const SurveyResultCard: React.FC<SurveyResultCardProps> = ({
  survey,
  onExport,
  isExporting,
  getStatusColor,
  getStatusText,
  navigate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const responseRate = survey.max_responses
    ? Math.round((survey.response_count || 0) / survey.max_responses * 100)
    : 0;

  const responsesCount = survey.response_count || 0;
  const questionsCount = survey.questions_count || survey.questions?.length || 0;
  const targetInstitutionsCount = survey.target_institutions?.length || 0;

  return (
    <div className="bg-card border rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold truncate">{survey.title}</h3>
            <Badge className={getStatusColor(survey.status)} variant="secondary">
              {getStatusText(survey.status)}
            </Badge>
            {survey.is_anonymous && (
              <Badge variant="outline" className="text-xs">Anonim</Badge>
            )}
          </div>

          {survey.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
              {survey.description}
            </p>
          )}

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-primary">{responsesCount}</span>
              <span className="text-muted-foreground">cavab</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-green-600">{responseRate}%</span>
              <span className="text-muted-foreground">dərəcə</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-blue-600">{questionsCount}</span>
              <span className="text-muted-foreground">sual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{targetInstitutionsCount}</span>
              <span className="text-muted-foreground">müəssisə</span>
            </div>
          </div>

          {survey.start_date && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{new Date(survey.start_date).toLocaleDateString('az-AZ')}</span>
              {survey.end_date && (
                <>
                  <span>→</span>
                  <span>{new Date(survey.end_date).toLocaleDateString('az-AZ')}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 ml-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (survey.status === 'published') {
                navigate(`/survey-response/${survey.id}`)
              } else {
                navigate(`/surveys/${survey.id}`)
              }
            }}
            className="h-9"
          >
            <Eye className="h-4 w-4 mr-1.5" />
            {survey.status === 'published' ? 'Cavab ver' : 'Baxış'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isExporting || responsesCount === 0}
            className="h-9"
          >
            <Download className="h-4 w-4 mr-1.5" />
            {isExporting ? 'Yüklənir' : 'Yüklə'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-9"
            title="Müəssisələrə görə təfərrüat"
          >
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t pt-3">
          <HierarchicalInstitutionBreakdown surveyId={survey.id} />
        </div>
      )}
    </div>
  );
};

export default React.memo(SurveyResultCard);
