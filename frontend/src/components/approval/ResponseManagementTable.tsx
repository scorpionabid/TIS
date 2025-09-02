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
  ChevronsRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { 
  SurveyResponseForApproval, 
  ResponseFilters 
} from '../../services/surveyResponseApproval';

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
  filters
}) => {
  const [selectAll, setSelectAll] = useState(false);

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary', icon: Edit, text: 'Qaralama' },
      submitted: { variant: 'default', icon: Clock, text: 'Təqdim edilib' },
      approved: { variant: 'success', icon: CheckCircle, text: 'Təsdiqləndi' },
      rejected: { variant: 'destructive', icon: XCircle, text: 'Rədd edildi' },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  // Approval status badge styling
  const getApprovalStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig = {
      pending: { variant: 'default', icon: Clock, text: 'Gözləyir' },
      in_progress: { variant: 'default', icon: RefreshCw, text: 'İcrada' },
      approved: { variant: 'success', icon: CheckCircle, text: 'Təsdiqləndi' },
      rejected: { variant: 'destructive', icon: XCircle, text: 'Rədd edildi' },
      returned: { variant: 'secondary', icon: RefreshCw, text: 'Geri qaytarıldı' },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
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
  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.last_page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Trigger re-fetch with new page - this should be handled by parent
      // For now, we'll update the filters
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('page', page.toString());
      window.history.pushState({}, '', `?${searchParams.toString()}`);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    onFiltersChange('per_page', pageSize);
  };

  // Memoized pagination component
  const PaginationComponent = useMemo(() => {
    if (!pagination || pagination.total === 0) return null;

    const { current_page, last_page, total } = pagination;
    const startItem = ((current_page - 1) * pagination.per_page) + 1;
    const endItem = Math.min(current_page * pagination.per_page, total);

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {startItem}-{endItem} / {total} nəticə
          </span>
          <div className="flex items-center gap-2">
            <span>Səhifədə:</span>
            <select
              value={pagination.per_page}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={current_page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(current_page - 1)}
            disabled={current_page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
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
              
              return (
                <Button
                  key={pageNum}
                  variant={current_page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
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
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(last_page)}
            disabled={current_page === last_page}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }, [pagination, handlePageChange, handlePageSizeChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Cavablar yüklənir...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Xəta baş verdi</h3>
          <p className="text-muted-foreground">
            Cavablar yüklənə bilmədi. Səhifəni yenidən yükləyin.
          </p>
        </div>
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Cavab tapılmadı</h3>
          <p className="text-muted-foreground">
            Seçilmiş filterlərə uyğun cavab mövcud deyil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Müəssisə</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Təsdiq Statusu</TableHead>
              <TableHead>Cavablayan</TableHead>
              <TableHead>Təqdim Tarixi</TableHead>
              <TableHead>Tamamlanma</TableHead>
              <TableHead className="text-right">Əməliyyatlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response) => (
              <TableRow 
                key={response.id}
                className={`
                  transition-colors hover:bg-muted/50
                  ${selectedResponses.includes(response.id) ? 'bg-primary/10' : ''}
                `}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedResponses.includes(response.id)}
                    onCheckedChange={(checked) => 
                      handleResponseCheckbox(response.id, Boolean(checked))
                    }
                  />
                </TableCell>
                
                <TableCell>
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="font-medium">
                        {response.institution?.name || 'Müəssisə adı yoxdur'}
                      </div>
                      {response.institution?.type && (
                        <div className="text-sm text-muted-foreground">
                          {response.institution.type}
                        </div>
                      )}
                      {response.department?.name && (
                        <div className="text-xs text-muted-foreground">
                          {response.department.name}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  {getStatusBadge(response.status)}
                </TableCell>
                
                <TableCell>
                  {getApprovalStatusBadge(response.approvalRequest?.current_status)}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm">
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
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      {response.submitted_at ? (
                        <>
                          <div>
                            {new Date(response.submitted_at).toLocaleDateString('az-AZ')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(response.submitted_at), {
                              addSuffix: true,
                              locale: az
                            })}
                          </div>
                        </>
                      ) : (
                        'Təqdim edilməyib'
                      )}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${response.progress_percentage || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium min-w-[3ch]">
                      {response.progress_percentage || 0}%
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResponseSelect(response)}
                      title="Cavabı görüntülə"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {response.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResponseSelect(response)}
                        title="Cavabı redaktə et"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {response.approvalRequest?.current_status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
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
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            // Handle quick reject - will be implemented
                            onResponseSelect(response);
                          }}
                          title="Tez rədd et"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
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