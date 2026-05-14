import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2 } from 'lucide-react';
import { SurveyFormSchema } from '@/services/surveys';

interface SurveyFormHeaderProps {
  surveyData: SurveyFormSchema;
  completionPercentage: number;
  isReadOnly: boolean;
  isSubmitted: boolean;
}

export const SurveyFormHeader: React.FC<SurveyFormHeaderProps> = ({
  surveyData,
  completionPercentage,
  isReadOnly,
  isSubmitted
}) => {
  return (
    <CardHeader className="border-b border-slate-100 bg-slate-50/30">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold text-slate-800">{surveyData.title}</CardTitle>
          {surveyData.description && (
            <CardDescription className="text-slate-500 max-w-3xl">{surveyData.description}</CardDescription>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {isReadOnly ? (
            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
              <Eye className="h-3 w-3 mr-1" /> Yalnız baxış
            </Badge>
          ) : isSubmitted ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Təqdim edilib
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">
              <Clock className="h-3 w-3 mr-1" /> Qaralama
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-500">Tamamlanma</span>
          <span className={completionPercentage === 100 ? "text-emerald-600" : "text-blue-600"}>
            {completionPercentage}%
          </span>
        </div>
        <Progress value={completionPercentage} className="h-2" />
      </div>
    </CardHeader>
  );
};

import { Eye } from 'lucide-react';
