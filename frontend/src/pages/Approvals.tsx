import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SurveyApprovalDashboard from '../components/approval/SurveyApprovalDashboard';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Shield, AlertTriangle, Target, Eye, BarChart3 } from 'lucide-react';
import SurveyViewDashboard from '../components/approval/survey-view/SurveyViewDashboard';
import SurveyResultsAnalytics from '../components/approval/survey-results-analytics/SurveyResultsAnalytics';
import { useModuleAccess } from '@/hooks/useModuleAccess';

const Approvals: React.FC = () => {
  const { currentUser: user } = useAuth();
  const approvalsAccess = useModuleAccess('approvals');

  if (!approvalsAccess.canView) {
    return (
      <div className="container mx-auto px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Təsdiq Paneline Giriş Yoxdur
            </h2>
            <p className="text-gray-600 mb-4">
              Bu səhifəyə giriş üçün `approvals.read` və ya `survey_responses.read` icazəsi tələb olunur.
            </p>
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                RegionAdmin panelindən bu icazələri aktiv etdikdən sonra menyu avtomatik görünəcək.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">

      <Tabs defaultValue="survey-responses" className="space-y-2">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="survey-responses" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Sorğu Cavabları
          </TabsTrigger>
          <TabsTrigger value="survey-results" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sorğu Nəticələri
          </TabsTrigger>
          <TabsTrigger value="survey-view" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Sorğulara Baxış
          </TabsTrigger>
        </TabsList>

        <TabsContent value="survey-responses">
          <SurveyApprovalDashboard />
        </TabsContent>

        <TabsContent value="survey-results">
          <SurveyResultsAnalytics />
        </TabsContent>

        <TabsContent value="survey-view">
          <SurveyViewDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Approvals;
