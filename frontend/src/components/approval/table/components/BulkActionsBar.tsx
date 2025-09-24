import React from 'react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  X,
  Filter,
  MoreHorizontal,
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  FileText,
  UserPlus,
  Bell,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
import { SurveyResponseForApproval } from "../../../../services/surveyApproval";
import { canPerformBulkAction } from '../utils/permissionHelpers';

interface BulkActionsBarProps {
  selectedResponses: number[];
  responses: SurveyResponseForApproval[];
  onBulkAction: (action: 'approve' | 'reject' | 'return', comments?: string) => void;
  onBulkSelect: (responseIds: number[]) => void;
  onExport: (format: 'xlsx' | 'csv') => void;
  isExporting: boolean;
  isBulkProcessing: boolean;
  selectedSurvey?: { id: number; title: string };
  user?: any;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedResponses,
  responses,
  onBulkAction,
  onBulkSelect,
  onExport,
  isExporting,
  isBulkProcessing,
  selectedSurvey,
  user
}) => {
  if (selectedResponses.length === 0) return null;

  const selectedResponsesData = responses.filter(r => selectedResponses.includes(r.id));
  const canApproveAll = canPerformBulkAction(responses, selectedResponses, 'approve', user);
  const canRejectAll = canPerformBulkAction(responses, selectedResponses, 'reject', user);

  const pendingCount = selectedResponsesData.filter(r =>
    r.approvalRequest?.current_status === 'pending'
  ).length;

  const approvedCount = selectedResponsesData.filter(r =>
    r.approvalRequest?.current_status === 'approved'
  ).length;

  const averageProgress = Math.round(
    selectedResponsesData.reduce((acc, r) => acc + (r.progress_percentage || 0), 0) /
    selectedResponsesData.length || 0
  );

  return (
    <div className="flex flex-col gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg shadow-sm">
      {/* Selection Info & Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span>{selectedResponses.length} element seçildi</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>🟡 {pendingCount} gözləyir</span>
            <span>🟢 {approvedCount} təsdiqləndi</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBulkSelect([])}
            className="h-7 text-xs hover:bg-white/50"
            disabled={isBulkProcessing}
          >
            <X className="h-3 w-3 mr-1" />
            Təmizlə
          </Button>
        </div>
      </div>

      {/* Advanced Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Quick Status Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={isBulkProcessing}
              >
                <Filter className="h-3 w-3 mr-1" />
                Sürətli Filtr
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => {
                const pendingIds = responses
                  .filter(r => r.approvalRequest?.current_status === 'pending')
                  .map(r => r.id);
                onBulkSelect(pendingIds);
              }}>
                <Clock className="h-4 w-4 mr-2 text-amber-600" />
                Gözləyən cavabları seç
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const highProgressIds = responses
                  .filter(r => (r.progress_percentage || 0) >= 80)
                  .map(r => r.id);
                onBulkSelect(highProgressIds);
              }}>
                <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                Tamamlanan cavabları seç
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const todayIds = responses.filter(r => {
                  if (!r.submitted_at) return false;
                  const today = new Date();
                  const submitDate = new Date(r.submitted_at);
                  return submitDate.toDateString() === today.toDateString();
                }).map(r => r.id);
                onBulkSelect(todayIds);
              }}>
                <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                Bu günkü cavabları seç
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Progress Summary */}
          <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-white/50 rounded text-xs">
            <BarChart3 className="h-3 w-3" />
            Orta irəliləmə: {averageProgress}%
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Approval Actions */}
          {canApproveAll && pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-green-700 border-green-300 hover:bg-green-50 text-xs"
              onClick={() => {
                // Debug logging moved to hook level
                onBulkAction('approve', 'Bulk Actions Bar vasitəsilə təsdiqləndi');
              }}
              disabled={isBulkProcessing}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Toplu Təsdiq ({pendingCount})
            </Button>
          )}

          {canRejectAll && pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-red-700 border-red-300 hover:bg-red-50 text-xs"
              onClick={() => {
                // Debug logging moved to hook level
                onBulkAction('reject', 'Bulk Actions Bar vasitəsilə rədd edildi');
              }}
              disabled={isBulkProcessing}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Toplu Rədd ({pendingCount})
            </Button>
          )}

          {/* Advanced Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={isBulkProcessing}
              >
                <MoreHorizontal className="h-3 w-3 mr-1" />
                Əlavə
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => onExport('xlsx')}
                disabled={isExporting || !selectedSurvey}
              >
                <Download className={`h-4 w-4 mr-2 ${isExporting ? 'text-gray-400' : 'text-blue-600'}`} />
                {isExporting ? 'İxrac edilir...' : 'Excel formatında ixrac et'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExport('csv')}
                disabled={isExporting || !selectedSurvey}
              >
                <FileText className={`h-4 w-4 mr-2 ${isExporting ? 'text-gray-400' : 'text-green-600'}`} />
                {isExporting ? 'İxrac edilir...' : 'CSV formatında ixrac et'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={true} // TODO: Implement bulk assign functionality
              >
                <UserPlus className="h-4 w-4 mr-2 text-purple-600" />
                Cavablamaq üçün təyin et
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={true} // TODO: Implement bulk notify functionality
              >
                <Bell className="h-4 w-4 mr-2 text-orange-600" />
                Xatırlatma göndər
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={true} // TODO: Implement bulk priority functionality
                className="text-amber-700"
              >
                <Star className="h-4 w-4 mr-2" />
                Prioritet olaraq işarələ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BulkActionsBar);