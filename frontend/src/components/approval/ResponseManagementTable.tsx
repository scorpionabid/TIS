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
  Filter
} from 'lucide-react';
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
  onResponseEdit
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

  // Enhanced status badge styling - compact version
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: {
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Edit,
        text: 'Qaralama',
        dotColor: 'bg-orange-500'
      },
      submitted: {
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock,
        text: 'Təqdim edilib',
        dotColor: 'bg-blue-500'
      },
      approved: {
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        text: 'Təsdiqləndi',
        dotColor: 'bg-green-500'
      },
      rejected: {
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        text: 'Rədd edildi',
        dotColor: 'bg-red-500'
      },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        <Icon className="h-2.5 w-2.5" />
        <span className="text-xs">{config.text}</span>
      </div>
    );
  };

  // Enhanced approval status badge styling - compact version
  const getApprovalStatusBadge = (status?: string) => {
    if (!status) return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border bg-gray-50 text-gray-600 border-gray-200">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        <span className="text-xs">—</span>
      </div>
    );

    const statusConfig = {
      pending: {
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Clock,
        text: 'Gözləyir',
        dotColor: 'bg-amber-500'
      },
      in_progress: {
        className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: RefreshCw,
        text: 'İcrada',
        dotColor: 'bg-indigo-500'
      },
      approved: {
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        text: 'Təsdiqləndi',
        dotColor: 'bg-emerald-500'
      },
      rejected: {
        className: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: XCircle,
        text: 'Rədd edildi',
        dotColor: 'bg-rose-500'
      },
      returned: {
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: RefreshCw,
        text: 'Geri qaytarıldı',
        dotColor: 'bg-purple-500'
      },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        <Icon className="h-2.5 w-2.5" />
        <span className="text-xs">{config.text}</span>
      </div>
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
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
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

  // Bulk actions component
  const BulkActionsBar = () => {
    if (selectedResponses.length === 0) return null;

    return (
      <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span>{selectedResponses.length} element seçildi</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectAll(false)}
            className="h-8 text-xs"
          >
            Seçimi təmizlə
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => {
              // Handle bulk approve
              console.log('Bulk approve:', selectedResponses);
            }}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Toplu Təsdiq
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              // Handle bulk reject
              console.log('Bulk reject:', selectedResponses);
            }}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Toplu Rədd
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => {
              // Handle bulk export
              console.log('Bulk export:', selectedResponses);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            İxrac Et
          </Button>
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onResponseSelect(response)}
                  className="h-8 w-8 p-0"
                  title="Cavabı görüntülə"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canEditResponse(response) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResponseEdit?.(response)}
                    className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                    title="Cavabı redaktə et"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Card Content */}
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">{response.institution?.name || 'Müəssisə adı yoxdur'}</h4>
                <p className="text-xs text-muted-foreground">{response.institution?.type}</p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                {getStatusBadge(response.status)}
                {getApprovalStatusBadge(response.approvalRequest?.current_status)}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{response.respondent?.name || 'Bilinməyən'}</span>
                <span>
                  {response.submitted_at
                    ? new Date(response.submitted_at).toLocaleDateString('az-AZ')
                    : 'Təqdim edilməyib'}
                </span>
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
              <TableHead className="font-semibold w-32">
                <SortableHeader field="status">
                  <Clock className="h-4 w-4" />
                  Status
                </SortableHeader>
              </TableHead>
              <TableHead className="font-semibold w-36">
                <SortableHeader field="approval_status">
                  <CheckCircle className="h-4 w-4" />
                  Təsdiq
                </SortableHeader>
              </TableHead>
              <TableHead className="font-semibold w-44">
                <SortableHeader field="respondent_name">
                  <User className="h-4 w-4" />
                  Cavablayan
                </SortableHeader>
              </TableHead>
              <TableHead className="font-semibold w-36">
                <SortableHeader field="submitted_at">
                  <Calendar className="h-4 w-4" />
                  Tarix
                </SortableHeader>
              </TableHead>
              <TableHead className="font-semibold w-32">
                <SortableHeader field="progress_percentage">
                  <RefreshCw className="h-4 w-4" />
                  İrəliləmə
                </SortableHeader>
              </TableHead>
              <TableHead className="text-right font-semibold w-28">
                Əməliyyatlar
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response) => (
              <TableRow
                key={response.id}
                className={`
                  group transition-all duration-200 hover:bg-muted/30 hover:shadow-sm
                  ${selectedResponses.includes(response.id)
                    ? 'bg-primary/8 border-l-4 border-l-primary shadow-sm'
                    : 'border-l-4 border-l-transparent'
                  }
                `}
              >
                <TableCell className="py-3">
                  <Checkbox
                    checked={selectedResponses.includes(response.id)}
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
                        {response.institution?.name || 'Müəssisə adı yoxdur'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {response.institution?.type && (
                          <span className="px-2 py-0.5 bg-muted rounded-full">
                            {response.institution.type}
                          </span>
                        )}
                        {response.department?.name && (
                          <span>• {response.department.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="py-3">
                  {getStatusBadge(response.status)}
                </TableCell>

                <TableCell className="py-3">
                  {getApprovalStatusBadge(response.approvalRequest?.current_status)}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" title={response.respondent?.name}>
                        {response.respondent?.name || 'Bilinməyən'}
                      </div>
                      {response.respondent_role && (
                        <div className="text-xs text-muted-foreground">
                          {response.respondent_role}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="py-3">
                  <div className="text-sm min-w-0">
                    {response.submitted_at ? (
                      <div className="space-y-1">
                        <div className="font-medium">
                          {new Date(response.submitted_at).toLocaleDateString('az-AZ', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(response.submitted_at), {
                            addSuffix: true,
                            locale: az
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Təqdim edilməyib
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">İrəliləmə</span>
                      <span className="font-medium">
                        {response.progress_percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
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
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    {/* Always show view button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResponseSelect(response)}
                      className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                      title="Cavabı görüntülə"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Show edit for responses that can be edited by admins */}
                    {canEditResponse(response) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResponseEdit?.(response)}
                        className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                        title="Cavabı redaktə et"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Show quick actions for pending approval */}
                    {response.approvalRequest?.current_status === 'pending' && (
                      <div className="flex items-center gap-0.5 ml-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                          onClick={() => {
                            // Handle quick approve - will be implemented
                            onResponseSelect(response);
                          }}
                          title="Tez təsdiq et"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                          onClick={() => {
                            // Handle quick reject - will be implemented
                            onResponseSelect(response);
                          }}
                          title="Tez rədd et"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Status-based action indicator */}
                    {response.status === 'approved' && (
                      <div className="w-8 h-8 flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                    {response.status === 'rejected' && (
                      <div className="w-8 h-8 flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
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