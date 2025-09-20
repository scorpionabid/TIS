import React, { useState, useMemo, useCallback } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import {
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Building,
  User,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  MoreHorizontal,
  MoreVertical,
  X,
  TrendingUp,
  BarChart3,
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
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import {
  SurveyResponseForApproval,
  ResponseFilters
} from '../../services/surveyResponseApproval';
import { useAuth } from '../../contexts/AuthContext';
interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
interface ResponseManagementTableProps {
  responses: SurveyResponseForApproval[];
  pagination?: PaginationData;
  loading: boolean;
  error: any;
  selectedResponses: number[];
  onResponseSelect: (response: SurveyResponseForApproval) => void;
  onBulkSelect: (responseIds: number[]) => void;
  onFiltersChange: (key: keyof ResponseFilters, value: any) => void;
  filters: ResponseFilters;
  onResponseEdit?: (response: SurveyResponseForApproval) => void;
  onResponseViewTab?: (response: SurveyResponseForApproval, tab: 'details' | 'responses' | 'history') => void;
}
const ResponseManagementTable: React.FC<ResponseManagementTableProps> = ({
  responses,
  pagination,
  loading,
  error,
  selectedResponses,
  onResponseSelect,
  onBulkSelect,
  onFiltersChange,
  filters,
  onResponseEdit,
  onResponseViewTab
}) => {
  const { user } = useAuth();
  const [selectAll, setSelectAll] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // Helper function to check if user can edit a response
  const canEditResponse = useCallback((response: SurveyResponseForApproval) => {
    if (!user || !onResponseEdit) return false;
    // Only sektoradmin and regionadmin can edit responses
    const canEditRoles = ['sektoradmin', 'regionadmin', 'superadmin'];
    const hasEditRole = user.roles?.some(role => canEditRoles.includes(role.name));
    if (!hasEditRole) return false;
    // Can only edit unapproved responses (not approved or rejected)
    const canEditStatuses = ['draft', 'submitted'];
    const isEditableStatus = canEditStatuses.includes(response.status);
    // Can only edit if approval status is not final
    const canEditApprovalStatuses = ['pending', 'in_progress', undefined];
    const isEditableApprovalStatus = canEditApprovalStatuses.includes(response.approvalRequest?.current_status);
    return isEditableStatus && isEditableApprovalStatus;
  }, [user, onResponseEdit]);

  // Helper functions for approval checks
  const canApproveResponse = useCallback((response: SurveyResponseForApproval) => {
    if (!user) return false;
    const canApproveRoles = ['sektoradmin', 'regionadmin', 'superadmin'];
    const hasApproveRole = user.roles?.some(role => canApproveRoles.includes(role.name));
    if (!hasApproveRole) return false;
    return response.approvalRequest?.current_status === 'pending';
  }, [user]);

  const canRejectResponse = useCallback((response: SurveyResponseForApproval) => {
    if (!user) return false;
    const canRejectRoles = ['sektoradmin', 'regionadmin', 'superadmin'];
    const hasRejectRole = user.roles?.some(role => canRejectRoles.includes(role.name));
    if (!hasRejectRole) return false;
    return response.approvalRequest?.current_status === 'pending';
  }, [user]);

  const handleApproval = useCallback((responseId: number, action: 'approve' | 'reject') => {
    console.log(`${action} response:`, responseId);
    // Here will be the actual approval logic
  }, []);

  // Ultra-compact status indicators - just colored dots with tooltips (80% space saving)
  const getStatusDot = (status: string) => {
    const statusConfig = {
      draft: {
        dotColor: 'bg-orange-500',
        label: 'Qaralama',
        tooltip: 'Hələ tamamlanmayıb'
      },
      submitted: {
        dotColor: 'bg-blue-500',
        label: 'Təqdim edilib',
        tooltip: 'Yoxlanmaq üçün göndərilib'
      },
      approved: {
        dotColor: 'bg-green-500',
        label: 'Təsdiqləndi',
        tooltip: 'Rəsmi olaraq təsdiqlənib'
      },
      rejected: {
        dotColor: 'bg-red-500',
        label: 'Rədd edildi',
        tooltip: 'Təkrar işləmə tələb olunur'
      },
    } as const;
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <div
        className={`w-3 h-3 rounded-full ${config.dotColor} ring-2 ring-white shadow-sm cursor-help`}
        title={`${config.label} - ${config.tooltip}`}
      />
    );
  };
  // Ultra-compact approval status indicators - just colored dots with tooltips
  const getApprovalStatusDot = (status?: string) => {
    if (!status) return (
      <div
        className="w-3 h-3 rounded-full bg-gray-400 ring-2 ring-white shadow-sm cursor-help"
        title="Təsdiq gözlənilmir"
      />
    );
    const statusConfig = {
      pending: {
        dotColor: 'bg-amber-500',
        label: 'Gözləyir',
        tooltip: 'Təsdiq gözlənilir'
      },
      in_progress: {
        dotColor: 'bg-indigo-500',
        label: 'İcrada',
        tooltip: 'Hazırda təsdiq edilir'
      },
      approved: {
        dotColor: 'bg-emerald-500',
        label: 'Təsdiqləndi',
        tooltip: 'Rəsmi olaraq təsdiqlənib'
      },
      rejected: {
        dotColor: 'bg-rose-500',
        label: 'Rədd edildi',
        tooltip: 'Təkrar işləmə tələb olunur'
      },
      returned: {
        dotColor: 'bg-purple-500',
        label: 'Geri qaytarıldı',
        tooltip: 'Yenidən işləmə üçün qaytarılıb'
      },
    } as const;
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <div
        className={`w-3 h-3 rounded-full ${config.dotColor} ring-2 ring-white shadow-sm cursor-help`}
        title={`${config.label} - ${config.tooltip}`}
      />
    );
  };
  // Handle individual checkbox
  const handleResponseCheckbox = useCallback((responseId: number, checked: boolean) => {
    if (checked) {
      onBulkSelect([...selectedResponses, responseId]);
    } else {
      onBulkSelect(selectedResponses.filter(id => id !== responseId));
      setSelectAll(false);
    }
  }, [selectedResponses, onBulkSelect]);
  // Handle select all checkbox
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onBulkSelect(responses.map(r => r.id));
    } else {
      onBulkSelect([]);
    }
  }, [responses, onBulkSelect]);
  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    if (pagination && page >= 1 && page <= pagination.last_page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Trigger re-fetch with new page - this should be handled by parent
      // For now, we'll update the filters
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('page', page.toString());
      window.history.pushState({}, '', `?${searchParams.toString()}`);
    }
  }, [pagination]);
  // Handle page size change
  const handlePageSizeChange = useCallback((pageSize: number) => {
    onFiltersChange('per_page', pageSize);
  }, [onFiltersChange]);
  // Handle sorting
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    // Apply sort to filters
    onFiltersChange('sort_by', field);
    onFiltersChange('sort_direction', sortDirection === 'asc' ? 'desc' : 'asc');
  }, [sortField, sortDirection, onFiltersChange]);
  // Sortable column header component
  const SortableHeader = ({ field, children, className = '' }: {
    field: string;
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortField === field;
    const getSortIcon = () => {
      if (!isActive) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
      return sortDirection === 'asc'
        ? <ArrowUp className="h-3 w-3" />
        : <ArrowDown className="h-3 w-3" />;
    };
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-2 hover:bg-muted/50 p-2 rounded transition-colors ${className} ${
          isActive ? 'text-primary' : ''
        }`}
      >
        {children}
        {getSortIcon()}
      </button>
    );
  };
  // Enhanced pagination component
  const PaginationComponent = useMemo(() => {
    if (!pagination || pagination.total === 0) return null;
    const { current_page, last_page, total } = pagination;
    const startItem = ((current_page - 1) * pagination.per_page) + 1;
    const endItem = Math.min(current_page * pagination.per_page, total);
    return (
      <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/20">
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{startItem}-{endItem}</span>
            <span>/</span>
            <span className="font-medium text-foreground">{total}</span>
            <span>nəticə</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Səhifədə:</span>
            <select
              value={pagination.per_page}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-muted bg-background rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value={10}>10 (Sürətli)</option>
              <option value={25}>25 (Normal)</option>
              <option value={50}>50 (Daha çox)</option>
              <option value={100}>100 (Böyük səhifə)</option>
              <option value={200}>200 (Ənterprayz)</option>
            </select>
          </div>
          {/* Performance Metrics */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md">
              <RefreshCw className="h-3 w-3" />
              <span>Yükləndi: {responses.length}</span>
            </div>
            {selectedResponses.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                <CheckCircle className="h-3 w-3" />
                <span>Seçildi: {selectedResponses.length}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
              <BarChart3 className="h-3 w-3" />
              <span>Səhifə: {current_page}/{last_page}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={current_page === 1}
            className="h-9 w-9 p-0 hover:bg-primary hover:text-primary-foreground"
            title="İlk səhifə"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(current_page - 1)}
            disabled={current_page === 1}
            className="h-9 w-9 p-0 hover:bg-primary hover:text-primary-foreground"
            title="Əvvəlki səhifə"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, last_page) }, (_, i) => {
              let pageNum: number;
              if (last_page <= 5) {
                pageNum = i + 1;
              } else if (current_page <= 3) {
                pageNum = i + 1;
              } else if (current_page >= last_page - 2) {
                pageNum = last_page - 4 + i;
              } else {
                pageNum = current_page - 2 + i;
              }
              const isCurrentPage = current_page === pageNum;
              return (
                <Button
                  key={pageNum}
                  variant={isCurrentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-9 w-9 p-0 font-medium ${
                    isCurrentPage
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-primary hover:text-primary-foreground'
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(current_page + 1)}
            disabled={current_page === last_page}
            className="h-9 w-9 p-0 hover:bg-primary hover:text-primary-foreground"
            title="Növbəti səhifə"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(last_page)}
            disabled={current_page === last_page}
            className="h-9 w-9 p-0 hover:bg-primary hover:text-primary-foreground"
            title="Son səhifə"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }, [pagination, handlePageChange, handlePageSizeChange]);
  // Memoized row component for performance optimization
  const ResponseTableRow = React.memo(({ response }: { response: SurveyResponseForApproval }) => {
    const isSelected = selectedResponses.includes(response.id);
    return (
      <TableRow
        key={response.id}
        className={`
          group transition-all duration-200 hover:bg-muted/30 hover:shadow-sm
          ${isSelected
            ? 'bg-primary/8 border-l-4 border-l-primary shadow-sm'
            : 'border-l-4 border-l-transparent'
          }
        `}
      >
        <TableCell className="py-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) =>
              handleResponseCheckbox(response.id, Boolean(checked))
            }
            className="rounded-md"
          />
        </TableCell>

        <TableCell className="py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate" title={response.institution?.name}>
                {response.institution?.short_name || response.institution?.name || 'Müəssisə adı yoxdur'}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {response.department?.name && (
                  <span>{response.department.name}</span>
                )}
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell className="py-3">
          <div className="space-y-3 max-w-md">
            {response.responses && Object.keys(response.responses).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(response.responses).slice(0, 3).map(([questionId, answer], index) => (
                  <div key={questionId} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-[10px] font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium text-muted-foreground">Sual {questionId}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-primary/10"
                        onClick={() => onResponseViewTab ? onResponseViewTab(response, 'responses') : onResponseSelect(response)}
                        title="Sorğu cavablarını görüntülə"
                      >
                        <Eye className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                    <div className="text-xs text-foreground pl-7">
                      {Array.isArray(answer) ? (
                        <div className="space-y-1">
                          {answer.slice(0, 1).map((item, i) => (
                            <div key={i} className="px-2 py-1 bg-muted/50 rounded text-xs">
                              {String(item).slice(0, 50)}{String(item).length > 50 ? '...' : ''}
                            </div>
                          ))}
                          {answer.length > 1 && (
                            <div className="text-xs text-muted-foreground">
                              +{answer.length - 1} əlavə cavab
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-2 py-1 bg-muted/50 rounded text-xs">
                          {String(answer || 'Cavab verilməyib').slice(0, 50)}
                          {String(answer || '').length > 50 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {Object.keys(response.responses).length > 3 && (
                  <div className="text-xs text-muted-foreground pt-1 border-t border-muted pl-7">
                    +{Object.keys(response.responses).length - 3} əlavə sual
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2 hover:bg-primary/10"
                      onClick={() => onResponseViewTab ? onResponseViewTab(response, 'responses') : onResponseSelect(response)}
                      title="Bütün sorğu cavablarını görüntülə"
                    >
                      <Eye className="h-3 w-3 text-primary" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-primary/10"
                  onClick={() => onResponseViewTab ? onResponseViewTab(response, 'responses') : onResponseSelect(response)}
                  title="Sorğu detallarını görüntülə"
                >
                  <Eye className="h-3 w-3 text-primary" />
                </Button>
              </div>
            )}
          </div>
        </TableCell>

        <TableCell className="py-3">
          <div className="flex justify-center">
            {getStatusDot(response.status)}
          </div>
        </TableCell>

        <TableCell className="py-3">
          <div className="flex justify-center">
            {getApprovalStatusDot(response.approvalRequest?.current_status)}
          </div>
        </TableCell>

        <TableCell className="py-3">
          <div className="min-w-0">
            <div className="font-medium text-sm truncate" title={response.respondent?.name}>
              {response.respondent?.name || 'Bilinməyən'}
            </div>
            <div className="text-xs text-muted-foreground truncate" title={response.respondent?.email}>
              {response.respondent?.email || ''}
            </div>
            <div className="text-xs text-muted-foreground">
              {response.submitted_at
                ? formatDistanceToNow(new Date(response.submitted_at), {
                    addSuffix: true,
                    locale: az
                  })
                : 'Təqdim edilməyib'
              }
            </div>
          </div>
        </TableCell>

        <TableCell className="py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    (response.progress_percentage || 0) === 100
                      ? 'bg-green-500'
                      : (response.progress_percentage || 0) >= 50
                      ? 'bg-blue-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${response.progress_percentage || 0}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
              {response.progress_percentage || 0}%
            </span>
          </div>
        </TableCell>

      </TableRow>
    );
  });
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-64 border rounded-xl">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Cavablar yüklənir...</h3>
            <p className="text-muted-foreground text-sm">
              Zəhmət olmasa gözləyin
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-64 border rounded-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-red-900">Xəta baş verdi</h3>
            <p className="text-muted-foreground mb-4">
              Cavablar yüklənə bilmədi. Səhifəni yenidən yükləyin.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenidən yüklə
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (!responses || responses.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-64 border rounded-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Cavab tapılmadı</h3>
            <p className="text-muted-foreground mb-4">
              Seçilmiş filterlərə uyğun cavab mövcud deyil.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                // Reset filters
                onFiltersChange('status', undefined);
                onFiltersChange('approval_status', undefined);
                onFiltersChange('search', undefined);
              }}
              className="text-sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filterləri sıfırla
            </Button>
          </div>
        </div>
      </div>
    );
  }
  // Advanced bulk actions component with enterprise features
  const BulkActionsBar = () => {
    if (selectedResponses.length === 0) return null;
    const selectedResponsesData = responses.filter(r => selectedResponses.includes(r.id));
    const canApproveAll = selectedResponsesData.every(r => canApproveResponse(r));
    const canRejectAll = selectedResponsesData.every(r => canRejectResponse(r));
    const pendingCount = selectedResponsesData.filter(r => r.approvalRequest?.current_status === 'pending').length;
    const approvedCount = selectedResponsesData.filter(r => r.approvalRequest?.current_status === 'approved').length;
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
              onClick={() => handleSelectAll(false)}
              className="h-7 text-xs hover:bg-white/50"
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
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  Sürətli Filtr
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => {
                  const pendingIds = responses.filter(r => r.approvalRequest?.current_status === 'pending').map(r => r.id);
                  onBulkSelect(pendingIds);
                }}>
                  <Clock className="h-4 w-4 mr-2 text-amber-600" />
                  Gözləyən cavabları seç
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const highProgressIds = responses.filter(r => (r.progress_percentage || 0) >= 80).map(r => r.id);
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
              Orta irəliləmə: {Math.round(selectedResponsesData.reduce((acc, r) => acc + (r.progress_percentage || 0), 0) / selectedResponsesData.length || 0)}%
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
                  console.log('Bulk approve:', selectedResponses);
                  // Here will be the actual bulk approve logic
                }}
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
                  console.log('Bulk reject:', selectedResponses);
                  // Here will be the actual bulk reject logic
                }}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Toplu Rədd ({pendingCount})
              </Button>
            )}
            {/* Advanced Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <MoreHorizontal className="h-3 w-3 mr-1" />
                  Əlavə
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => console.log('Bulk export:', selectedResponses)}>
                  <Download className="h-4 w-4 mr-2 text-blue-600" />
                  Excel formatında ixrac et
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log('Bulk PDF export:', selectedResponses)}>
                  <FileText className="h-4 w-4 mr-2 text-red-600" />
                  PDF formatında ixrac et
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => console.log('Bulk assign:', selectedResponses)}>
                  <UserPlus className="h-4 w-4 mr-2 text-purple-600" />
                  Cavablamaq üçün təyin et
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log('Bulk notify:', selectedResponses)}>
                  <Bell className="h-4 w-4 mr-2 text-orange-600" />
                  Xatırlatma göndər
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => console.log('Bulk priority:', selectedResponses)}
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
  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      <BulkActionsBar />
      {/* Mobile Card Layout - visible on small screens */}
      <div className="block md:hidden space-y-3">
        {responses.map((response) => (
          <div
            key={response.id}
            className={`p-4 border rounded-lg transition-all ${
              selectedResponses.includes(response.id)
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedResponses.includes(response.id)}
                  onCheckedChange={(checked) =>
                    handleResponseCheckbox(response.id, Boolean(checked))
                  }
                  className="rounded-md"
                />
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building className="h-4 w-4 text-primary" />
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted/50"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onResponseSelect(response)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Cavabı görüntülə
                  </DropdownMenuItem>
                  {canEditResponse(response) && (
                    <DropdownMenuItem onClick={() => onResponseEdit?.(response)}>
                      <Edit className="h-4 w-4 mr-2 text-orange-600" />
                      Cavabı redaktə et
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {canApproveResponse(response) && (
                    <DropdownMenuItem
                      onClick={() => handleApproval(response.id, 'approve')}
                      className="text-green-600 focus:text-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Təsdiqlə
                    </DropdownMenuItem>
                  )}
                  {canRejectResponse(response) && (
                    <DropdownMenuItem
                      onClick={() => handleApproval(response.id, 'reject')}
                      className="text-red-600 focus:text-red-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rədd et
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Card Content */}
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">{response.institution?.short_name || response.institution?.name || 'Müəssisə adı yoxdur'}</h4>
              </div>

              {/* Survey Responses */}
              <div className="p-2 bg-muted/30 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-muted-foreground">Sorğu Cavabları:</div>
                  {response.responses && Object.keys(response.responses).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-primary/10"
                      onClick={() => onResponseViewTab ? onResponseViewTab(response, 'responses') : onResponseSelect(response)}
                      title="Sorğu cavablarını görüntülə"
                    >
                      <Eye className="h-3 w-3 text-primary" />
                    </Button>
                  )}
                </div>
                {response.responses && Object.keys(response.responses).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(response.responses).slice(0, 2).map(([questionId, answer], index) => (
                      <div key={questionId} className="space-y-1">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="w-4 h-4 bg-primary/20 text-primary rounded-full flex items-center justify-center text-[10px] font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium text-muted-foreground">Sual {questionId}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-primary/10"
                            onClick={() => onResponseViewTab ? onResponseViewTab(response, 'responses') : onResponseSelect(response)}
                            title="Bu sorğu cavabını görüntülə"
                          >
                            <Eye className="h-2.5 w-2.5 text-primary" />
                          </Button>
                        </div>
                        <div className="text-xs text-foreground ml-5">
                          {Array.isArray(answer) ? (
                            <div className="space-y-1">
                              {answer.slice(0, 1).map((item, i) => (
                                <div key={i} className="px-2 py-1 bg-background/50 rounded text-xs">
                                  {String(item).slice(0, 40)}{String(item).length > 40 ? '...' : ''}
                                </div>
                              ))}
                              {answer.length > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  +{answer.length - 1} əlavə
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="px-2 py-1 bg-background/50 rounded text-xs">
                              {String(answer || 'Cavab verilməyib').slice(0, 40)}
                              {String(answer || '').length > 40 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {Object.keys(response.responses).length > 2 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-muted/50 ml-5">
                        <span>+{Object.keys(response.responses).length - 2} əlavə sual</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-primary/10"
                          onClick={() => onResponseViewTab ? onResponseViewTab(response, 'responses') : onResponseSelect(response)}
                          title="Bütün sorğu cavablarını görüntülə"
                        >
                          <Eye className="h-2.5 w-2.5 text-primary" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-primary/10"
                      onClick={() => onResponseViewTab ? onResponseViewTab(response, 'responses') : onResponseSelect(response)}
                      title="Sorğu detallarını görüntülə"
                    >
                      <Eye className="h-2.5 w-2.5 text-primary" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  {getStatusDot(response.status)}
                  {getApprovalStatusDot(response.approvalRequest?.current_status)}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  <div className="font-medium">{response.respondent?.name || 'Bilinməyən'}</div>
                  <div className="text-xs text-muted-foreground">{response.respondent?.email || ''}</div>
                </div>
                <div className="text-right">
                  {response.submitted_at
                    ? new Date(response.submitted_at).toLocaleDateString('az-AZ')
                    : 'Təqdim edilməyib'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">İrəliləmə</span>
                  <span className="font-medium">{response.progress_percentage || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (response.progress_percentage || 0) === 100
                        ? 'bg-green-500'
                        : (response.progress_percentage || 0) >= 50
                        ? 'bg-blue-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${response.progress_percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop Table Layout - hidden on small screens */}
      <div className="hidden md:block border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-muted/30 to-muted/50 border-b-2">
              <TableHead className="w-10 py-3">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  className="rounded-md"
                />
              </TableHead>
              <TableHead className="font-semibold">
                <SortableHeader field="institution_name">
                  <Building className="h-4 w-4" />
                  Müəssisə
                </SortableHeader>
              </TableHead>
              <TableHead className="font-semibold w-80">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Sorğu Cavabları
                </div>
              </TableHead>
              <TableHead className="font-semibold w-24 text-center">
                <SortableHeader field="status">
                  <Clock className="h-4 w-4" />
                  Status
                </SortableHeader>
              </TableHead>
              <TableHead className="font-semibold w-24 text-center">
                <SortableHeader field="approval_status">
                  <CheckCircle className="h-4 w-4" />
                  Təsdiq
                </SortableHeader>
              </TableHead>
              <TableHead className="font-semibold w-52">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cavablayan / Tarix
                </div>
              </TableHead>
              <TableHead className="font-semibold w-32">
                <SortableHeader field="progress_percentage">
                  <RefreshCw className="h-4 w-4" />
                  İrəliləmə
                </SortableHeader>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response) => (
              <ResponseTableRow key={response.id} response={response} />
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      {PaginationComponent}
    </div>
  );
};
export default ResponseManagementTable;
