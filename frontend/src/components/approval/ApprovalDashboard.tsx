import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Check,
  X,
  ArrowLeft,
  FileText,
  Users
} from 'lucide-react';
import approvalService, { ApprovalRequest, ApprovalStats } from '../../services/approvalService';
// Note: For survey-specific approvals, use SurveyApprovalDashboard component instead
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import ApprovalDetailsModal from './ApprovalDetailsModal';
import ApprovalActionModal from './ApprovalActionModal';
import BulkApprovalModal from './BulkApprovalModal';
// MIGRATION: SurveyResponsesTab removed - survey approvals now handled by SurveyApprovalDashboard
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ApprovalDashboard: React.FC = () => {
  const { currentUser: user } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'return'>('approve');
  const [selectedApprovals, setSelectedApprovals] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [workflowFilter, setWorkflowFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Get approvals based on active tab
      let approvalsResponse;
      if (activeTab === 'pending' || activeTab === 'overdue') {
        approvalsResponse = await approvalService.getPendingApprovals();
      } else if (activeTab === 'my-requests') {
        approvalsResponse = await approvalService.getMyApprovals();
      } else {
        approvalsResponse = await approvalService.getApprovals({
          status: activeTab === 'all' ? undefined : activeTab,
          priority: priorityFilter && priorityFilter !== 'all' ? priorityFilter : undefined,
          workflow_type: workflowFilter && workflowFilter !== 'all' ? workflowFilter : undefined
        });
      }

      // Get analytics
      const analyticsResponse = await approvalService.getAnalytics();

      if (approvalsResponse.success) {
        let filteredApprovals = [];

        if (activeTab === 'pending') {
          // For pending approvals, data is in pending_approvals.data
          filteredApprovals = approvalsResponse.data?.pending_approvals?.data || [];
        } else {
          // For other tabs, use standard data structure
          filteredApprovals = Array.isArray(approvalsResponse.data)
            ? approvalsResponse.data
            : approvalsResponse.data.data || [];
        }

        // Apply search filter
        if (searchTerm) {
          filteredApprovals = filteredApprovals.filter(approval =>
            approval.workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            approval.submitter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            approval.comments?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        if (activeTab === 'overdue') {
          filteredApprovals = filteredApprovals.filter(
            (approval) =>
              approval.is_overdue ||
              (approval.deadline ? new Date(approval.deadline) < new Date() : false)
          );
        }

        setApprovals(filteredApprovals);
      }

      if (analyticsResponse.success) {
        setStats(analyticsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching approval data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, priorityFilter, workflowFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprovalAction = async (approval: ApprovalRequest, action: 'approve' | 'reject' | 'return') => {
    // MIGRATION NOTE: Survey response approvals should use SurveyApprovalDashboard
    if (approval.type === 'survey_response') {
      console.warn('DEPRECATED: Survey response approvals in ApprovalDashboard. Use SurveyApprovalDashboard instead.');
      await handleSurveyResponseAction(approval, action);
    } else {
      setSelectedApproval(approval);
      setActionType(action);
      setShowActionModal(true);
    }
  };

  /**
   * @deprecated Use SurveyApprovalDashboard for survey-specific approvals
   */
  const handleSurveyResponseAction = async (approval: ApprovalRequest, action: 'approve' | 'reject' | 'return') => {
    const responseId = approval.id.toString().replace('survey_', '');

    try {
      if (action === 'approve') {
        const response = await approvalService.approveSurveyResponse(parseInt(responseId));
        if (response.success) {
          toast.success('Sorğu cavabı təsdiqləndi');
          fetchData();
        }
      } else if (action === 'reject') {
        const reason = prompt('Rədd səbəbini daxil edin:');
        if (!reason) return;

        const response = await approvalService.rejectSurveyResponse(parseInt(responseId), reason);
        if (response.success) {
          toast.success('Sorğu cavabı rədd edildi');
          fetchData();
        }
      }
    } catch (error) {
      console.error('Survey response action error:', error);
      toast.error('Əməliyyat zamanı xəta baş verdi');
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (selectedApprovals.length === 0) return;
    setActionType(action);
    setShowBulkModal(true);
  };

  const handleSelectApproval = (approvalId: number) => {
    setSelectedApprovals(prev => 
      prev.includes(approvalId) 
        ? prev.filter(id => id !== approvalId)
        : [...prev, approvalId]
    );
  };

  const handleSelectAll = () => {
    if (selectedApprovals.length === approvals.length) {
      setSelectedApprovals([]);
    } else {
      setSelectedApprovals(approvals.map(approval => approval.id));
    }
  };

  const onActionComplete = () => {
    setShowActionModal(false);
    setShowBulkModal(false);
    setSelectedApproval(null);
    setSelectedApprovals([]);
    fetchData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'returned': return <RotateCcw className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    return null;
  };

  const canApprove = (approval: ApprovalRequest) => {
    if (!user) return false;
    
    const currentStep = approval.workflow.approval_chain.find(
      step => step.level === approval.current_approval_level
    );
    
    if (!currentStep || approval.status !== 'pending') return false;
    
    // Check user role
    const hasRequiredRole = user.role === currentStep.role;
    
    return hasRequiredRole;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Təsdiq Paneli</h1>
          <p className="text-gray-600">Sorğuları təsdiq edin və idarə edin</p>
        </div>
        {selectedApprovals.length > 0 && (
          <div className="flex gap-2">
            <Button 
              onClick={() => handleBulkAction('approve')}
              variant="default"
              size="sm"
            >
              <Check className="h-4 w-4 mr-1" />
              Seçilənləri Təsdiq Et ({selectedApprovals.length})
            </Button>
            <Button 
              onClick={() => handleBulkAction('reject')}
              variant="destructive"
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Seçilənləri Rədd Et ({selectedApprovals.length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Gözləyən</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Təsdiqlənmiş</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rədd edilmiş</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <RotateCcw className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Qaytarılmış</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.returned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mənim Gözləyən</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.my_pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Prioritet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün prioritetlər</SelectItem>
                <SelectItem value="high">Yüksək</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="low">Aşağı</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Növ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün növlər</SelectItem>
                <SelectItem value="survey">Sorğu</SelectItem>
                <SelectItem value="document">Sənəd</SelectItem>
                <SelectItem value="task">Tapşırıq</SelectItem>
                <SelectItem value="assessment">Qiymətləndirmə</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Gözləyən Təsdiqlər</TabsTrigger>
          <TabsTrigger value="overdue">Gecikən</TabsTrigger>
          {/* REMOVED: Survey responses tab - use SurveyApprovalDashboard component */}
          <TabsTrigger value="my-requests">Mənim Sorğularım</TabsTrigger>
          <TabsTrigger value="approved">Təsdiqlənmiş</TabsTrigger>
          <TabsTrigger value="rejected">Rədd edilmiş</TabsTrigger>
          <TabsTrigger value="all">Hamısı</TabsTrigger>
        </TabsList>

        {/* NOTE: Survey Responses Tab removed - use SurveyApprovalDashboard instead */}

        {/* All Tabs */}
        {(
          <TabsContent value={activeTab} className="space-y-4">
            {/* Select All Checkbox */}
            {(activeTab === 'pending' || activeTab === 'overdue') && approvals.length > 0 && (
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedApprovals.length === approvals.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <label className="text-sm font-medium">
                  Hamısını seç ({approvals.length} element)
                </label>
              </div>
            )}

            {/* Approval List */}
            <div className="space-y-4">
              {approvals.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Heç bir təsdiq sorğusu tapılmadı</p>
                  </CardContent>
                </Card>
              ) : (
                approvals.map((approval) => {
                  const deadlineDate = approval.deadline ? new Date(approval.deadline) : null;
                  const isOverdue = approval.is_overdue || (deadlineDate ? deadlineDate < new Date() : false);

                  return (
                  <Card key={approval.id} className={cn("hover:shadow-md transition-shadow", isOverdue && "border-destructive/40 bg-destructive/5")}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {(activeTab === 'pending' || activeTab === 'overdue') && (
                              <input
                                type="checkbox"
                                checked={selectedApprovals.includes(approval.id)}
                                onChange={() => handleSelectApproval(approval.id)}
                                className="rounded border-gray-300"
                              />
                            )}
                            {getPriorityIcon(approval.priority)}
                            <h3 className="text-lg font-medium text-gray-900">
                              {approval.workflow.name}
                              {/* REMOVED: Survey response badge - use SurveyApprovalDashboard for survey-specific items */}
                            </h3>
                            <Badge 
                              variant={approvalService.getStatusColor(approval.status) as any}
                              className="flex items-center space-x-1"
                            >
                              {getStatusIcon(approval.status)}
                              <span>{approvalService.getStatusText(approval.status)}</span>
                            </Badge>
                            <Badge variant="outline">
                              {approvalService.getPriorityText(approval.priority)}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="uppercase tracking-wide">
                                Gecikib
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                            <div>
                              <span className="font-medium">Göndərən:</span> {approval.submitter.name}
                            </div>
                            <div>
                              <span className="font-medium">Tarix:</span> {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true, locale: az })}
                            </div>
                            <div>
                              <span className="font-medium">Səviyyə:</span> {approval.current_approval_level}/{approval.workflow.approval_chain.length}
                            </div>
                          </div>

                          {approval.comments && (
                            <p className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded">
                              {approval.comments}
                            </p>
                          )}

                          {approval.deadline && (
                            <p
                              className={cn(
                                "text-sm mb-4 flex items-center gap-2",
                                isOverdue ? "text-destructive" : "text-orange-600"
                              )}
                            >
                              <AlertTriangle className="h-4 w-4" />
                              {isOverdue
                                ? `Müddət ${formatDistanceToNow(new Date(approval.deadline), {
                                    addSuffix: true,
                                    locale: az,
                                  })}`
                                : `Son tarix: ${new Date(approval.deadline).toLocaleDateString('az-AZ')} (${formatDistanceToNow(
                                    new Date(approval.deadline),
                                    { addSuffix: true, locale: az }
                                  )})`}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApproval(approval);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {canApprove(approval) && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprovalAction(approval, 'approve')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Təsdiq Et
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleApprovalAction(approval, 'reject')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rədd Et
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprovalAction(approval, 'return')}
                              >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Geri Qaytar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )})
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      {showDetailsModal && selectedApproval && (
        <ApprovalDetailsModal
          approval={selectedApproval}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedApproval(null);
          }}
        />
      )}

      {showActionModal && selectedApproval && (
        <ApprovalActionModal
          approval={selectedApproval}
          action={actionType}
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setSelectedApproval(null);
          }}
          onSuccess={onActionComplete}
        />
      )}

      {showBulkModal && (
        <BulkApprovalModal
          approvalIds={selectedApprovals}
          action={actionType}
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          onSuccess={onActionComplete}
        />
      )}
    </div>
  );
};

export default ApprovalDashboard;
