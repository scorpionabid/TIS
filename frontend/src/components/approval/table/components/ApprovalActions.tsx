import React from 'react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../../../ui/dropdown-menu';
import { SurveyResponseForApproval } from "../../../../services/surveyApproval";

interface ApprovalActionsProps {
  response: SurveyResponseForApproval;
  onAction: (responseId: number, action: 'approve' | 'reject' | 'return', comments?: string) => void;
  isProcessing: boolean;
  canApprove: boolean;
  canReject: boolean;
}

const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  response,
  onAction,
  isProcessing,
  canApprove,
  canReject
}) => {
  if (!response) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground">-</span>
      </div>
    );
  }

  const approvalStatus = response.approvalRequest?.current_status;

  // Show badge for final statuses
  if (approvalStatus === 'approved') {
    return (
      <div className="flex justify-center">
        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
          <CheckCircle className="h-3 w-3 mr-1" />
          Təsdiqləndi
        </Badge>
      </div>
    );
  }

  if (approvalStatus === 'rejected') {
    return (
      <div className="flex justify-center">
        <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
          <XCircle className="h-3 w-3 mr-1" />
          Rədd edildi
        </Badge>
      </div>
    );
  }

  if (approvalStatus === 'returned') {
    return (
      <div className="flex justify-center">
        <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
          <RefreshCw className="h-3 w-3 mr-1" />
          Geri qaytarıldı
        </Badge>
      </div>
    );
  }

  const isActionableStatus = approvalStatus === 'pending' || approvalStatus === 'in_progress';

  // Show action buttons for actionable status
  if (isActionableStatus && (canApprove || canReject)) {
    return (
      <div className="flex items-center gap-1">
        {/* Quick approve button */}
        {canApprove && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-green-700 border-green-300 hover:bg-green-50"
            onClick={() => onAction(response.id, 'approve', 'Sürətli təsdiq')}
            disabled={isProcessing}
          >
            {isProcessing && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
            <CheckCircle className="h-3 w-3" />
          </Button>
        )}

        {approvalStatus === 'in_progress' && (
          <Badge variant="outline" className="h-7 px-2 text-xs text-blue-700 border-blue-300 bg-blue-50">
            İcrada
          </Badge>
        )}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={isProcessing}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canApprove && (
              <DropdownMenuItem
                onClick={() => onAction(response.id, 'approve', 'Dropdown vasitəsilə təsdiqləndi')}
                className="text-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Təsdiq et
              </DropdownMenuItem>
            )}

            {canReject && (
              <>
                <DropdownMenuItem
                  onClick={() => onAction(response.id, 'reject', 'Dropdown vasitəsilə rədd edildi')}
                  className="text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rədd et
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onAction(response.id, 'return', 'Dropdown vasitəsilə geri qaytarıldı')}
                  className="text-purple-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Geri qaytart
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Show pending badge if no actions available
  if (approvalStatus === 'pending') {
    return (
      <div className="flex justify-center">
        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
          <Clock className="h-3 w-3 mr-1" />
          Gözləyir
        </Badge>
      </div>
    );
  }

  if (approvalStatus === 'in_progress') {
    return (
      <div className="flex justify-center">
        <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
          <RefreshCw className="h-3 w-3 mr-1" />
          İcrada
        </Badge>
      </div>
    );
  }

  // Default case - no approval request or unknown status
  return (
    <div className="flex justify-center">
      <span className="text-xs text-muted-foreground">
        {response.status === 'draft' ? 'Qaralama' : 'Təsdiq tələb olunmur'}
      </span>
    </div>
  );
};

export default React.memo(ApprovalActions);
