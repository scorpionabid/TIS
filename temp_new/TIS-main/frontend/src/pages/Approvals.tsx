import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SurveyApprovalDashboard from '@/components/approval/SurveyApprovalDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, Target, Eye, BarChart3 } from 'lucide-react';
import SurveyViewDashboard from '@/components/approval/survey-view/SurveyViewDashboard';
import SurveyResultsAnalytics from '@/components/approval/survey-results-analytics/SurveyResultsAnalytics';
import { useModuleAccess } from '@/hooks/useModuleAccess';

const Approvals: React.FC = () => {
  const { currentUser: user } = useAuth();
  const approvalsAccess = useModuleAccess('approvals');

  if (!approvalsAccess.canView) {
    return (
      <div className="w-full">
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
    <div className="w-full">
      <Tabs defaultValue="survey-responses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 p-1 rounded-xl h-11 border border-border/40">
          <TabsTrigger value="survey-responses" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Target className="h-4 w-4" />
            Sorğu Cavabları
          </TabsTrigger>
          <TabsTrigger value="survey-results" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" />
            Sorğu Nəticələri
          </TabsTrigger>
          <TabsTrigger value="survey-view" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Eye className="h-4 w-4" />
            Sorğulara Baxış
          </TabsTrigger>
        </TabsList>

        <TabsContent value="survey-responses" className="mt-4 focus-visible:outline-none">
          <SurveyApprovalDashboard />
        </TabsContent>

        <TabsContent value="survey-results" className="mt-4 focus-visible:outline-none">
          <SurveyResultsAnalytics />
        </TabsContent>

        <TabsContent value="survey-view" className="mt-4 focus-visible:outline-none">
          <SurveyViewDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Approvals;
