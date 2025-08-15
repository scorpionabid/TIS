import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurveyResponseForm } from '@/components/surveys/SurveyResponseForm';
import { SurveyResponse as SurveyResponseType } from '@/services/surveys';

export default function SurveyResponse() {
  const { surveyId, responseId } = useParams<{
    surveyId: string;
    responseId?: string;
  }>();
  const navigate = useNavigate();

  const handleComplete = (response: SurveyResponseType) => {
    // Navigate to surveys list or dashboard after completion
    navigate('/surveys', { 
      replace: true,
      state: { 
        message: 'Survey uğurla təqdim edildi!',
        surveyId: response.survey_id 
      }
    });
  };

  const handleSave = (response: SurveyResponseType) => {
    // Could show a toast or update UI to indicate save
    console.log('Survey saved:', response);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (!surveyId) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Survey tapılmadı</h2>
          <p className="text-gray-600">Zəhmət olmasa, düzgün survey ID daxil edin.</p>
          <Button onClick={() => navigate('/surveys')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Surveys siyahısına qayıt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Survey Cavabı</h1>
          <p className="text-gray-600">Survey sorğularını cavablandırın</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <SurveyResponseForm
          surveyId={parseInt(surveyId)}
          responseId={responseId ? parseInt(responseId) : undefined}
          onComplete={handleComplete}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}