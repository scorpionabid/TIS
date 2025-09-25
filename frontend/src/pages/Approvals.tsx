import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SurveyApprovalDashboard from '../components/approval/SurveyApprovalDashboard';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Shield, AlertTriangle, Target, Eye, BarChart3 } from 'lucide-react';
import SurveyViewDashboard from '../components/approval/survey-view/SurveyViewDashboard';
import SurveyResultsTab from '../components/approval/survey-results/SurveyResultsTab';

const Approvals: React.FC = () => {
  const { currentUser: user } = useAuth();

  // Check if user has approval permissions
  const hasApprovalPermissions = () => {
    if (!user) {
      return false;
    }

    const approvalRoles = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'];

    // Check user.role
    if (user.role && approvalRoles.includes(user.role)) {
      return true;
    }

    return false;
  };

  if (!hasApprovalPermissions()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Təsdiq Paneline Giriş Yoxdur
            </h2>
            <p className="text-gray-600 mb-4">
              Bu səhifəyə giriş üçün təsdiq icazələriniz yoxdur.
            </p>
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Təsdiq paneline giriş üçün SuperAdmin, RegionAdmin, SektorAdmin və ya SchoolAdmin rolları tələb olunur.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Təsdiq Paneli
        </h1>
        <p className="text-muted-foreground mt-1">
          Məlumat təsdiqi və sorğu cavablarının idarə edilməsi
        </p>
      </div>

      <Tabs defaultValue="survey-responses" className="space-y-6">
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
          <SurveyResultsTab />
        </TabsContent>

        <TabsContent value="survey-view">
          <SurveyViewDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Approvals;