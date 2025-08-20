import React from 'react';
import { School, Globe, BarChart3, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AssessmentOverviewTabProps {
  assessmentData: any;
  analyticsData: any;
  analyticsLoading: boolean;
  getScoreColor: (score: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

export const AssessmentOverviewTab: React.FC<AssessmentOverviewTabProps> = ({
  assessmentData,
  analyticsData,
  analyticsLoading,
  getScoreColor,
  getStatusBadge
}) => {
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Təsdiqlənib</Badge>;
      case 'draft':
        return <Badge variant="outline">Layihə</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Rədd edilib</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KSQ Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <School className="h-5 w-5" />
              <span>KSQ Nəticələri</span>
            </CardTitle>
            <CardDescription>Keyfiyyət Standartları Qiymətləndirməsi</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentData?.data?.ksq_results?.data?.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {assessmentData.data.ksq_results.data.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Ümumi qiymətləndirmə</p>
                </div>
                <div className="space-y-2">
                  {assessmentData.data.ksq_results.data.slice(0, 3).map((assessment: any, index: number) => (
                    <div key={assessment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{assessment.assessment_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${getScoreColor(assessment.percentage_score)}`}>
                          {assessment.percentage_score}%
                        </span>
                        {renderStatusBadge(assessment.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Hələ KSQ qiymətləndirməsi yoxdur</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BSQ Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>BSQ Nəticələri</span>
            </CardTitle>
            <CardDescription>Beynəlxalq Standartlar Qiymətləndirməsi</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentData?.data?.bsq_results?.data?.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {assessmentData.data.bsq_results.data.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Ümumi qiymətləndirmə</p>
                </div>
                <div className="space-y-2">
                  {assessmentData.data.bsq_results.data.slice(0, 3).map((assessment: any, index: number) => (
                    <div key={assessment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{assessment.international_standard}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${getScoreColor(assessment.percentage_score)}`}>
                          {assessment.percentage_score}%
                        </span>
                        {renderStatusBadge(assessment.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Hələ BSQ qiymətləndirməsi yoxdur</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      {analyticsData?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Analitika və Tövsiyələr</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Analitika məlumatları yüklənir...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analyticsData.data.overall_analytics?.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Tövsiyələr
                    </h4>
                    <ul className="space-y-2">
                      {analyticsData.data.overall_analytics.recommendations.map((recommendation: string, index: number) => (
                        <li key={index} className="text-sm p-2 bg-blue-50 dark:bg-blue-950/20 rounded border-l-4 border-blue-500">
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {analyticsData.data.overall_analytics?.risk_areas?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Risk Sahələri
                    </h4>
                    <ul className="space-y-2">
                      {analyticsData.data.overall_analytics.risk_areas.map((risk: string, index: number) => (
                        <li key={index} className="text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded border-l-4 border-red-500">
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};