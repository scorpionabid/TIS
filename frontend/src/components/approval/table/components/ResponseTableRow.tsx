import React from 'react';
import { TableCell, TableRow } from '../../../ui/table';
import { Checkbox } from '../../../ui/checkbox';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
  Eye,
  Edit,
  Building,
  User,
  Calendar,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { SurveyResponseForApproval } from "../../../../services/surveyApproval";
import { getStatusBadge, getProgressColor } from '../utils/statusHelpers';
import ApprovalActions from './ApprovalActions';


interface ResponseTableRowProps {
  response: SurveyResponseForApproval;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onView: (tab?: 'details' | 'responses' | 'history') => void;
  onApprovalAction: (responseId: number, action: 'approve' | 'reject' | 'return', comments?: string) => void;
  canEdit: boolean;
  canApprove: boolean;
  canReject: boolean;
  isProcessing: boolean;
}

const ResponseTableRow: React.FC<ResponseTableRowProps> = ({
  response,
  isSelected,
  onSelect,
  onEdit,
  onView,
  onApprovalAction,
  canEdit,
  canApprove,
  canReject,
  isProcessing
}) => {
  if (!response) {
    return null;
  }

  return (
    <TableRow
      key={response.id}
      className={`
        hover:bg-muted/50 transition-colors
        ${isSelected ? 'bg-muted/30' : ''}
        ${isProcessing ? 'opacity-60' : ''}
      `}
    >
      {/* Selection Checkbox */}
      <TableCell className="w-12">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            disabled={isProcessing}
            aria-label={`Select response ${response.id}`}
          />
        </div>
      </TableCell>

      {/* Institution Info */}
      <TableCell className="py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {response.institution?.short_name || response.institution?.name || 'Naməlum müəssisə'}
            </span>
          </div>
          {response.institution?.type && (
            <div className="text-xs text-muted-foreground ml-6">
              {response.institution.type}
            </div>
          )}
          {response.department?.name && (
            <div className="text-xs text-muted-foreground ml-6">
              📁 {response.department.name}
            </div>
          )}
        </div>
      </TableCell>

      {/* Respondent Info */}
      <TableCell className="py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {response.respondent?.name || 'Naməlum'}
            </span>
          </div>
          {response.respondent_role && (
            <div className="text-xs text-muted-foreground ml-6">
              {response.respondent_role}
            </div>
          )}
        </div>
      </TableCell>

      {/* Progress */}
      <TableCell className="py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>{response.progress_percentage || 0}%</span>
            <span className="text-muted-foreground">
              {response.is_complete ? 'Tamamlandı' : 'Davam edir'}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(response.progress_percentage || 0)}`}
              style={{ width: `${response.progress_percentage || 0}%` }}
            />
          </div>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="py-3">
        <div className="flex justify-center">
          {getStatusBadge(response?.status || 'draft')}
        </div>
      </TableCell>

      {/* Submitted Date */}
      <TableCell className="py-3">
        {response.submitted_at ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div>{new Date(response.submitted_at).toLocaleDateString('az-AZ')}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(response.submitted_at), {
                  addSuffix: true,
                  locale: az
                })}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Təqdim edilməyib</span>
        )}
      </TableCell>

      {/* Approval Status & Actions */}
      <TableCell className="py-3">
        <ApprovalActions
          response={response}
          onAction={onApprovalAction}
          isProcessing={isProcessing}
          canApprove={canApprove}
          canReject={canReject}
        />
      </TableCell>

      {/* Action Buttons */}
      <TableCell className="py-3">
        <div className="flex items-center gap-1">
          {/* View Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onView('details')}
            disabled={isProcessing}
          >
            <Eye className="h-3 w-3" />
          </Button>

          {/* Edit Button */}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onEdit}
              disabled={isProcessing}
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(ResponseTableRow);