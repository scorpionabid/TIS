import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Eye, Download } from 'lucide-react';
import { surveyService, Survey } from '../../../services/surveys';

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
  useQuery({
    queryKey: ['survey-stats', survey.id],
    queryFn: () => surveyService.getStats(survey.id),
    enabled: !!survey.id,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const responseRate = survey.max_responses
    ? Math.round((survey.response_count || 0) / survey.max_responses * 100)
    : 0;

  // Handle different data field names from API
  const responsesCount = survey.response_count || 0;
  const questionsCount = survey.questions_count || survey.questions?.length || 0;
  const targetInstitutionsCount = survey.target_institutions?.length || 0;

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-medium">{survey.title}</h3>
          <Badge className={getStatusColor(survey.status)}>
            {getStatusText(survey.status)}
          </Badge>
          {survey.is_anonymous && (
            <Badge variant="outline">Anonim</Badge>
          )}
        </div>

        {survey.description && (
          <p className="text-sm text-muted-foreground mb-3 overflow-hidden text-ellipsis" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            maxHeight: '2.5em'
          }}>
            {survey.description}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {responsesCount}
            </div>
            <div className="text-xs text-muted-foreground">Cavab</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">
              {responseRate}%
            </div>
            <div className="text-xs text-muted-foreground">Cavab dərəcəsi</div>
            <Progress value={responseRate} className="mt-1 h-1" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">
              {questionsCount}
            </div>
            <div className="text-xs text-muted-foreground">Sual</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {targetInstitutionsCount}
            </div>
            <div className="text-xs text-muted-foreground">Hədəf müəssisə</div>
          </div>
        </div>

        {survey.start_date && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Başlama: {new Date(survey.start_date).toLocaleDateString('az-AZ')}</span>
            {survey.end_date && (
              <span>Bitmə: {new Date(survey.end_date).toLocaleDateString('az-AZ')}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (survey.status === 'published') {
              navigate(`/survey-response/${survey.id}`)
            } else {
              // For draft/unpublished surveys, show a preview or edit action
              // TODO: Navigate to survey preview or edit page
              navigate(`/surveys/${survey.id}`)
            }
          }}
          title={
            survey.status === 'published'
              ? 'Survey cavablarını gör'
              : survey.status === 'draft'
                ? 'Survey qaralamadır - yalnız baxış mümkündür'
                : 'Survey aktiv deyil'
          }
        >
          <Eye className="h-3 w-3 mr-1" />
          {survey.status === 'published' ? 'Cavab ver' : 'Baxış'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting || responsesCount === 0}
          title={responsesCount === 0 ? 'Cavab yoxdur' : 'Nəticələri yüklə'}
        >
          <Download className="h-3 w-3 mr-1" />
          {isExporting ? 'Yüklənir...' : 'Yüklə'}
        </Button>
      </div>
    </div>
  );
};

export default React.memo(SurveyResultCard);