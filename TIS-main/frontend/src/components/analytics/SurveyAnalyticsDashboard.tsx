import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { surveyApprovalService } from "@/services/surveyApproval";
import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import {
  TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, 
  AlertTriangle, Users, FileText, Calendar, Download,
  Activity, Target, Award, Zap
} from "lucide-react";

interface SurveyAnalyticsDashboardProps {
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function SurveyAnalyticsDashboard({ className }: SurveyAnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedInstitution, setSelectedInstitution] = useState<number | null>(null);

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['survey-analytics', selectedPeriod, selectedInstitution],
    queryFn: () => surveyApprovalService.getApprovalAnalytics({
      period: selectedPeriod,
      institution_id: selectedInstitution || undefined,
      include_details: true
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    refetchIntervalInBackground: false, // Don't poll in background
    refetchOnWindowFocus: false
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['approval-trends', selectedPeriod],
    queryFn: () => surveyApprovalService.getApprovalTrends({
      period: selectedPeriod,
      group_by: selectedPeriod === '7' ? 'day' : selectedPeriod === '30' ? 'week' : 'month'
    }),
    staleTime: 8 * 60 * 1000, // 8 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 8 * 60 * 1000, // Refresh every 8 minutes
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false
  });

  const { data: institutionPerformance, isLoading: performanceLoading } = useQuery({
    queryKey: ['institution-performance', selectedPeriod],
    queryFn: () => surveyApprovalService.getInstitutionPerformance({
      period: selectedPeriod
    }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchInterval: 12 * 60 * 1000, // Refresh every 12 minutes
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false
  });

  if (analyticsLoading || trendsLoading || performanceLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Sorğu Analitikası</h2>
            <p className="text-muted-foreground">Real-vaxt təsdiq prosesləri monitoru</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-32 bg-surface rounded-lg border border-border-light animate-pulse" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-surface rounded-lg border border-border-light animate-pulse" />
          <div className="h-64 bg-surface rounded-lg border border-border-light animate-pulse" />
        </div>
      </div>
    );
  }

  const overviewStats = analytics?.overview || {};
  const surveyMetrics = analytics?.survey_metrics || {};
  const bottlenecks = surveyMetrics.approval_bottlenecks || {};

  // Prepare data for charts
  const approvalStatusData = [
    { name: 'Gözləyən', value: overviewStats.pending_approvals || 0, color: '#FFBB28' },
    { name: 'Təsdiqləndi', value: overviewStats.completed_approvals || 0, color: '#00C49F' },
    { name: 'Rədd edildi', value: overviewStats.rejected_approvals || 0, color: '#FF8042' }
  ];

  const responseMetricsData = [
    {
      name: 'Ümumi cavablar',
      value: surveyMetrics.survey_response_approvals?.total_submissions || 0,
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      name: 'Gözləyən',
      value: surveyMetrics.survey_response_approvals?.pending_approvals || 0,
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      name: 'Təsdiqləndi',
      value: surveyMetrics.survey_response_approvals?.approved_responses || 0,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      name: 'Rədd nisbəti',
      value: `${(surveyMetrics.survey_response_approvals?.rejection_rate || 0).toFixed(1)}%`,
      icon: XCircle,
      color: 'text-red-600'
    }
  ];

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    try {
      const blob = await surveyApprovalService.exportApprovalData({
        format,
        date_from: new Date(Date.now() - parseInt(selectedPeriod) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_to: new Date().toISOString().split('T')[0],
        institution_id: selectedInstitution || undefined
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey_analytics_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sorğu Analitikası</h2>
          <p className="text-muted-foreground">Real-vaxt təsdiq prosesləri monitoru</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Son 7 gün</SelectItem>
              <SelectItem value="30">Son 30 gün</SelectItem>
              <SelectItem value="90">Son 90 gün</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport('xlsx')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {responseMetricsData.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.name}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <metric.icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Ümumi Baxış</TabsTrigger>
          <TabsTrigger value="trends">Tendensiyalar</TabsTrigger>
          <TabsTrigger value="performance">İnstitut Performansı</TabsTrigger>
          <TabsTrigger value="bottlenecks">Darboğazlar</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Approval Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Təsdiq Status Paylanması</CardTitle>
                <CardDescription>Cari dövrün ümumi təsdiq vəziyyəti</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={approvalStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {approvalStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Template Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Template İstifadəsi</CardTitle>
                <CardDescription>Template-lərin təsdiq statusu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Təqdim edildi</span>
                    <Badge variant="outline">
                      {surveyMetrics.template_approvals?.templates_submitted || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Təsdiqləndi</span>
                    <Badge variant="default">
                      {surveyMetrics.template_approvals?.templates_approved || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Baxılır</span>
                    <Badge variant="secondary">
                      {surveyMetrics.template_approvals?.templates_in_review || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Institutions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Ən Yaxşı İnstitutlar
              </CardTitle>
              <CardDescription>Təsdiq nisbətinə görə ən yüksək performans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {surveyMetrics.institution_performance?.top_performing_institutions?.slice(0, 5).map((institution, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{institution.institution_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {(institution.approval_rate * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {institution.average_response_time.toFixed(1)}h orta vaxt
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Təsdiq Tendensiyaları</CardTitle>
              <CardDescription>Zaman ərzində təsdiq fəaliyyətləri</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trends?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="approvals" 
                    stackId="1" 
                    stroke="#00C49F" 
                    fill="#00C49F" 
                    name="Təsdiqləndi" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rejections" 
                    stackId="1" 
                    stroke="#FF8042" 
                    fill="#FF8042" 
                    name="Rədd edildi" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pending" 
                    stackId="1" 
                    stroke="#FFBB28" 
                    fill="#FFBB28" 
                    name="Gözləyər" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>İnstitut Performans Reytinqi</CardTitle>
              <CardDescription>Təsdiq sürəti və keyfiyyətinə görə</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={institutionPerformance?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="institution_name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    yAxisId="left" 
                    dataKey="approval_rate" 
                    fill="#00C49F" 
                    name="Təsdiq nisbəti (%)" 
                  />
                  <Bar 
                    yAxisId="right" 
                    dataKey="average_response_time" 
                    fill="#FFBB28" 
                    name="Orta cavab vaxtı (saat)" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bottleneck Levels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Darboğaz Səviyyələri
                </CardTitle>
                <CardDescription>Təsdiq prosesində yavaşlıq mənbələri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bottlenecks.bottleneck_levels?.map((level, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium">{level.level}</div>
                        <div className="text-sm text-muted-foreground">
                          {level.pending_count} gözləyən təsdiq
                        </div>
                      </div>
                      <Badge variant="destructive">
                        {level.average_wait_time.toFixed(1)}h
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Slow Approvers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Yavaş Təsdiq Edənlər
                </CardTitle>
                <CardDescription>Cavab müddəti uzun olan istifadəçilər</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bottlenecks.slow_approvers?.slice(0, 5).map((approver, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <div className="font-medium">{approver.approver_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {approver.pending_count} gözləyən təsdiq
                        </div>
                      </div>
                      <Badge variant="outline">
                        {approver.average_response_time.toFixed(1)}h
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Təkmilləşdirmə Tövsiyələri
              </CardTitle>
              <CardDescription>Sistem performansını artırmaq üçün</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {bottlenecks.recommendations?.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}