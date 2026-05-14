import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Clock, Zap, FileQuestion, ArrowRight } from 'lucide-react';
import { PendingSurveyDetail } from '@/services/schoolAdmin';
import { cn } from '@/lib/utils';

interface QuickResponsePanelProps {
  surveys: PendingSurveyDetail[];
  isLoading?: boolean;
  onRespond: (surveyId: number) => void;
  className?: string;
}

export const QuickResponsePanel: React.FC<QuickResponsePanelProps> = ({
  surveys,
  isLoading,
  onRespond,
  className,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            SÜRƏTLƏ CAVABLA
          </CardTitle>
          <CardDescription>Gözləyən sorğular</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg border animate-pulse">
                <div className="w-3/4 h-4 bg-muted rounded mb-2" />
                <div className="w-1/2 h-3 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!surveys || surveys.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            SÜRƏTLƏ CAVABLA
          </CardTitle>
          <CardDescription>Gözləyən sorğular</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Gözləyən sorğu yoxdur</p>
            <p className="text-xs text-muted-foreground mt-2">Bütün sorğular cavablandırılıb</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              SÜRƏTLƏ CAVABLA
            </CardTitle>
            <CardDescription>
              {surveys.length} sorğu cavab gözləyir
            </CardDescription>
          </div>
          <Badge variant="warning" className="text-lg px-3 py-1">
            {surveys.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {surveys.slice(0, 5).map((survey) => (
            <div
              key={survey.id}
              className={cn(
                "p-4 rounded-lg border transition-all cursor-pointer",
                "hover:shadow-md hover:scale-[1.02]",
                survey.is_urgent && "border-destructive bg-destructive/5"
              )}
              onClick={() => onRespond(survey.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                    <h4 className="font-semibold truncate">{survey.title}</h4>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {survey.description}
                  </p>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {survey.days_remaining <= 0
                          ? 'Bugün bitir'
                          : `${survey.days_remaining} gün qalıb`}
                      </span>
                    </div>

                    <Badge variant="secondary" className="text-xs">
                      {survey.question_count} sual
                    </Badge>

                    <Badge variant="secondary" className="text-xs">
                      ~{survey.estimated_duration} dəq
                    </Badge>

                    <Badge variant={getPriorityColor(survey.priority)} className="text-xs">
                      {survey.priority === 'high' ? 'Yüksək' :
                       survey.priority === 'medium' ? 'Orta' : 'Aşağı'}
                    </Badge>

                    {survey.is_urgent && (
                      <Badge variant="destructive" className="text-xs animate-pulse">
                        TƏCİLİ
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRespond(survey.id);
                  }}
                >
                  Cavabla
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          ))}

          {surveys.length > 5 && (
            <Button variant="outline" className="w-full" size="sm">
              Daha {surveys.length - 5} sorğu gör
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
