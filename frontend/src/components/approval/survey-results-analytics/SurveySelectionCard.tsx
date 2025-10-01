import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Target, Calendar, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { Survey } from '../../../services/surveys';

interface SurveySelectionCardProps {
  surveys: Survey[] | undefined;
  selectedSurvey: Survey | null;
  onSurveyChange: (survey: Survey) => void;
  isLoading: boolean;
}

const SurveySelectionCard: React.FC<SurveySelectionCardProps> = ({
  surveys,
  selectedSurvey,
  onSurveyChange,
  isLoading
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'draft':
        return 'bg-gray-500';
      case 'archived':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Aktiv';
      case 'paused':
        return 'Dayandırılıb';
      case 'draft':
        return 'Qaralama';
      case 'archived':
        return 'Arxivləşdirilib';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Sorğu Seçimi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <span>Sorğular yüklənir...</span>
          </div>
        ) : !Array.isArray(surveys) || surveys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm">Hazırda heç bir sorğu yoxdur</p>
          </div>
        ) : (
          <>
            {/* Survey Dropdown */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sorğu seçin</label>
              <Select
                value={selectedSurvey?.id.toString() || ''}
                onValueChange={(value) => {
                  const survey = surveys.find(s => s.id.toString() === value);
                  if (survey) {
                    onSurveyChange(survey);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sorğu seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{survey.title}</span>
                        <Badge
                          className={`${getStatusColor(survey.status)} text-white text-xs`}
                          variant="secondary"
                        >
                          {getStatusText(survey.status)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Survey Details */}
            {selectedSurvey && (
              <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{selectedSurvey.title}</h3>
                    {selectedSurvey.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {selectedSurvey.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={`${getStatusColor(selectedSurvey.status)} text-white flex-shrink-0`}
                    variant="secondary"
                  >
                    {getStatusText(selectedSurvey.status)}
                  </Badge>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tarix</p>
                      <p className="font-medium">
                        {formatDate(selectedSurvey.start_date)} - {formatDate(selectedSurvey.end_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cavablar</p>
                      <p className="font-semibold text-blue-600">
                        {selectedSurvey.response_count || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dərəcə</p>
                      <p className="font-semibold text-green-600">
                        {selectedSurvey.max_responses
                          ? Math.round(((selectedSurvey.response_count || 0) / selectedSurvey.max_responses) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Suallar</p>
                      <p className="font-semibold text-purple-600">
                        {selectedSurvey.questions_count || selectedSurvey.questions?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SurveySelectionCard;
