import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye, Edit, Play, Pause, BarChart3,
  MoreHorizontal, Archive, Trash2, Copy, Calendar, AlertTriangle,
} from 'lucide-react';
import { Survey } from '@/services/surveys';
import { getSurveyDeadlineInfo } from '@/utils/surveyHelpers';

const STATUS_BADGE_CONFIG: Record<string, { variant: 'secondary' | 'default' | 'outline' | 'destructive'; label: string }> = {
  draft:     { variant: 'secondary',   label: 'Layihə'       },
  active:    { variant: 'default',     label: 'Aktiv'        },
  paused:    { variant: 'outline',     label: 'Dayandırıldı' },
  completed: { variant: 'outline',     label: 'Tamamlandı'   },
  archived:  { variant: 'destructive', label: 'Arxivləndi'   },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('az-AZ', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export interface SurveyListRowProps {
  survey: Survey;
  currentUserId?: number;
  currentUserRole?: string;
  canCreate: boolean;
  canDelete: boolean;
  isPublishing: boolean;
  isPausing: boolean;
  onView: (survey: Survey) => void;
  onEdit: (survey: Survey) => void;
  onPublish: (id: number) => void;
  onPause: (id: number) => void;
  onDelete: (id: number, forceDelete: boolean) => void;
  onCreateTemplate: (survey: Survey) => void;
}

const MANAGEMENT_ROLES = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'];

export function SurveyListRow({
  survey,
  currentUserId,
  currentUserRole,
  canCreate,
  canDelete,
  isPublishing,
  isPausing,
  onView,
  onEdit,
  onPublish,
  onPause,
  onDelete,
  onCreateTemplate,
}: SurveyListRowProps) {
  const deadlineInfo = getSurveyDeadlineInfo(survey);

  const deadlineBadgeParts: string[] = [];
  if (deadlineInfo?.statusBadge) deadlineBadgeParts.push(deadlineInfo.statusBadge);
  if (deadlineInfo?.relativeText) deadlineBadgeParts.push(deadlineInfo.relativeText);
  const deadlineBadgeText = deadlineBadgeParts.join(' • ');

  const isSurveyOwner = survey.creator?.id === currentUserId;
  const role = (currentUserRole ?? '').toLowerCase();
  const showManagementActions =
    role === 'superadmin' || isSurveyOwner || MANAGEMENT_ROLES.includes(role);
  const canAccessDeletionMenu = canDelete || isSurveyOwner;

  const isEditable =
    survey.status === 'draft' ||
    survey.status === 'active' ||
    (survey.status === 'published' && (survey.response_count ?? 0) === 0);

  const statusConfig = STATUS_BADGE_CONFIG[survey.status] ?? { variant: 'secondary' as const, label: survey.status };

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg hover:bg-surface/50 transition-colors gap-4 ${
        deadlineInfo?.isExpired ? 'border-destructive/50 bg-destructive/5' : ''
      }`}
    >
      {/* Məlumat */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-medium text-foreground">{survey.title}</h3>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-2">
          {survey.description && survey.description.length > 100
            ? `${survey.description.substring(0, 100)}...`
            : survey.description || 'Təsvir yoxdur'}
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>{survey.response_count ?? 0} cavab</span>
          <span>{survey.questions_count ?? survey.questions?.length ?? 0} sual</span>
          <span>Yaradıldı: {formatDate(survey.created_at)}</span>
          {survey.creator && (
            <span>Yaradan: {survey.creator.full_name ?? survey.creator.username}</span>
          )}
          {deadlineInfo && (
            <span className={`flex items-center gap-1 ${deadlineInfo.isExpired ? 'text-destructive font-semibold' : ''}`}>
              <Calendar className="h-3 w-3" />
              Bitmə: {deadlineInfo.dueDateLabel}
            </span>
          )}
        </div>

        {deadlineInfo && deadlineBadgeText && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge
              variant={deadlineInfo.badgeVariant ?? 'outline'}
              className={`flex items-center gap-1 ${deadlineInfo.isExpired ? 'text-destructive' : ''}`}
            >
              {deadlineInfo.isExpired && <AlertTriangle className="h-3 w-3" />}
              <span>{deadlineBadgeText}</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Əməliyyatlar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onView(survey)} title="Sorğunu göstər">
          <Eye className="h-4 w-4" />
        </Button>

        {canCreate && (
          <Button variant="ghost" size="sm" title="Nəticələr">
            <BarChart3 className="h-4 w-4" />
          </Button>
        )}

        {showManagementActions && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(survey)}
              disabled={!isEditable}
              title={isEditable ? 'Sorğunu düzəliş et' : 'Yayımlanmış və cavabları olan sorğuları düzəliş etmək olmaz'}
            >
              <Edit className={`h-4 w-4 ${!isEditable ? 'text-muted-foreground' : ''}`} />
            </Button>

            {survey.status === 'draft' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPublish(survey.id)}
                disabled={isPublishing}
                title="Yayımla"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            {survey.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPause(survey.id)}
                disabled={isPausing}
                title="Dayandır"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}

            {canAccessDeletionMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onCreateTemplate(survey)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Template kimi saxla
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(survey.id, false)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arxivə göndər
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(survey.id, true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Tam sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>
    </div>
  );
}
