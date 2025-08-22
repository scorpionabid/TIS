import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  Workflow,
  Target
} from 'lucide-react';
import { ApprovalRequest } from '../../services/approvalService';
import approvalService from '../../services/approvalService';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';

interface ApprovalDetailsModalProps {
  approval: ApprovalRequest;
  isOpen: boolean;
  onClose: () => void;
}

const ApprovalDetailsModal: React.FC<ApprovalDetailsModalProps> = ({
  approval,
  isOpen,
  onClose
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-orange-500" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'returned': return <RotateCcw className="h-5 w-5 text-blue-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getLevelStatus = (level: number) => {
    if (level < approval.current_approval_level) return 'completed';
    if (level === approval.current_approval_level) return 'current';
    return 'pending';
  };

  const getLevelStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'current': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pending': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatWorkflowType = (type: string) => {
    switch (type) {
      case 'survey': return 'Sorğu';
      case 'document': return 'Sənəd';
      case 'task': return 'Tapşırıq';
      case 'assessment': return 'Qiymətləndirmə';
      case 'schedule': return 'Cədvəl';
      case 'report': return 'Hesabat';
      case 'attendance': return 'Davamiyyət';
      default: return type;
    }
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'regionadmin': return 'Region Admin';
      case 'sektoradmin': return 'Sektor Admin';
      case 'schooladmin': return 'Məktəb Admin';
      case 'müəllim': return 'Müəllim';
      default: return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getStatusIcon(approval.status)}
            <span>{approval.workflow.name}</span>
          </DialogTitle>
          <DialogDescription>
            Təsdiq sorğusunun ətraflı məlumatları
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center space-x-4">
            <Badge 
              variant={approvalService.getStatusColor(approval.status) as any}
              className="flex items-center space-x-1"
            >
              {getStatusIcon(approval.status)}
              <span>{approvalService.getStatusText(approval.status)}</span>
            </Badge>
            <Badge 
              variant={approvalService.getPriorityColor(approval.priority) as any}
            >
              {approval.priority === 'high' && <AlertTriangle className="h-4 w-4 mr-1" />}
              {approvalService.getPriorityText(approval.priority)}
            </Badge>
            <Badge variant="outline">
              {formatWorkflowType(approval.workflow.workflow_type)}
            </Badge>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Göndərən</p>
                  <p className="text-sm text-gray-600">{approval.submitter.name}</p>
                  <p className="text-xs text-gray-500">{approval.submitter.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Göndərilmə tarixi</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(approval.created_at), 'dd.MM.yyyy HH:mm', { locale: az })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true, locale: az })}
                  </p>
                </div>
              </div>

              {approval.deadline && (
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Son tarix</p>
                    <p className="text-sm text-orange-600">
                      {format(new Date(approval.deadline), 'dd.MM.yyyy HH:mm', { locale: az })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Workflow className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">İş axını</p>
                  <p className="text-sm text-gray-600">{approval.workflow.name}</p>
                  {approval.workflow.description && (
                    <p className="text-xs text-gray-500">{approval.workflow.description}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Cari mərhələ</p>
                <p className="text-sm text-gray-600">
                  {approval.current_approval_level} / {approval.workflow.approval_chain.length}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(approval.current_approval_level / approval.workflow.approval_chain.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
          {approval.comments && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="h-5 w-5 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Şərh</h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{approval.comments}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Approval Workflow Chain */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Təsdiq Mərhələləri</h3>
            <div className="space-y-3">
              {approval.workflow.approval_chain.map((level, index) => {
                const status = getLevelStatus(level.level);
                const relatedAction = approval.actions?.find(action => action.level === level.level);
                
                return (
                  <div key={level.level} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${getLevelStatusColor(status)}`}>
                        <span className="text-xs font-medium">{level.level}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{level.title}</p>
                          <p className="text-xs text-gray-500">{formatRoleName(level.role)}</p>
                          {level.required && (
                            <Badge variant="secondary" className="text-xs mt-1">Tələb olunur</Badge>
                          )}
                        </div>
                        
                        <div className="text-right">
                          {status === 'completed' && relatedAction && (
                            <>
                              <Badge 
                                variant={relatedAction.action === 'approved' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {approvalService.getActionText(relatedAction.action)}
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                {relatedAction.approver.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(relatedAction.created_at), 'dd.MM.yyyy HH:mm')}
                              </p>
                            </>
                          )}
                          {status === 'current' && (
                            <Badge variant="secondary" className="text-xs">
                              Gözləyir
                            </Badge>
                          )}
                          {status === 'pending' && (
                            <Badge variant="outline" className="text-xs">
                              Gözləmədə
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {relatedAction && relatedAction.comments && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <strong>Şərh:</strong> {relatedAction.comments}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission Data */}
          {approval.submission_data && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Göndərilən Məlumatlar</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(approval.submission_data, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Action History */}
          {approval.actions && approval.actions.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Əməliyyat Tarixçəsi</h3>
                <div className="space-y-3">
                  {approval.actions.map((action) => (
                    <div key={action.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        {action.action === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {action.action === 'rejected' && <XCircle className="h-5 w-5 text-red-500" />}
                        {action.action === 'returned' && <RotateCcw className="h-5 w-5 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {action.approver.name} - {approvalService.getActionText(action.action)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(action.created_at), 'dd.MM.yyyy HH:mm')}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">Səviyyə {action.level}</p>
                        {action.comments && (
                          <p className="text-sm text-gray-600 mt-1">{action.comments}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalDetailsModal;