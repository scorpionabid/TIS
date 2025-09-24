import React from 'react';
import { Table, TableBody } from '../../ui/table';
import { Alert, AlertDescription } from '../../ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  SurveyResponseForApproval,
  ResponseFilters
} from "../../../../services/surveyApproval";
import { useAuth } from '../../../contexts/AuthContext';

// Import hooks
import { useTableState } from './hooks/useTableState';
import { useResponseActions } from './hooks/useResponseActions';
import { useBulkActions } from './hooks/useBulkActions';
import { useExportActions } from './hooks/useExportActions';

// Import components
import BulkActionsBar from './components/BulkActionsBar';
import ResponseTableHeader from './components/ResponseTableHeader';
import ResponseTableRow from './components/ResponseTableRow';
import TablePagination from './components/TablePagination';
import UnifiedResponseEditModal from '../UnifiedResponseEditModal';

// Import utilities
import { canEditResponse, canApproveResponse, canRejectResponse } from './utils/permissionHelpers';

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
  onUpdate?: () => void;
  selectedSurvey?: { id: number; title: string };
  onBulkAction?: (action: 'approve' | 'reject' | 'return', comments?: string) => void;
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
  onResponseViewTab,
  onUpdate,
  selectedSurvey,
  onBulkAction
}) => {
  const { currentUser: user } = useAuth();

  // Initialize hooks
  const tableState = useTableState({
    onFiltersChange,
    onBulkSelect,
    selectedResponses,
    responses,
    pagination
  });

  const responseActions = useResponseActions({
    onUpdate,
    onResponseEdit
  });

  const bulkActions = useBulkActions({
    responses,
    selectedResponses,
    onBulkSelect,
    onUpdate
  });

  const exportActions = useExportActions({
    selectedSurvey,
    selectedResponses,
    filters
  });

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Məlumatlar yüklənərkən xəta baş verdi: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (loading && responses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Cavablar yüklənir...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && responses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Heç bir cavab tapılmadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedResponses={selectedResponses}
        responses={responses}
        onBulkAction={onBulkAction || bulkActions.handleBulkApproval}
        onBulkSelect={onBulkSelect}
        onExport={exportActions.handleExport}
        isExporting={exportActions.isExporting}
        isBulkProcessing={bulkActions.isBulkProcessing}
        selectedSurvey={selectedSurvey}
        user={user}
      />

      {/* Mobile Card Layout - visible on small screens */}
      <div className="block md:hidden space-y-3">
        {responses.filter(response => response != null).map((response) => (
          <div
            key={response.id}
            className={`p-4 border rounded-lg transition-all ${
              selectedResponses.includes(response.id)
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {/* Mobile card content - simplified for now */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedResponses.includes(response.id)}
                    onChange={(e) => tableState.handleResponseCheckbox(response.id, e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="font-medium text-sm">
                    {response.institution?.short_name || response.institution?.name}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  #{response.id}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <div>Cavabverən: {response.respondent?.name || 'Naməlum'}</div>
                <div>İrəliləmə: {response.progress_percentage || 0}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout - hidden on small screens */}
      <div className="hidden md:block rounded-md border overflow-hidden">
        <Table>
          <ResponseTableHeader
            selectAll={tableState.selectAll}
            onSelectAll={tableState.handleSelectAll}
            sortField={tableState.sortField}
            sortDirection={tableState.sortDirection}
            onSort={tableState.handleSort}
            selectedCount={tableState.selectedCount}
            totalCount={tableState.totalCount}
          />
          <TableBody>
            {responses.filter(response => response != null).map((response) => (
              <ResponseTableRow
                key={response.id}
                response={response}
                isSelected={selectedResponses.includes(response.id)}
                onSelect={(checked) => tableState.handleResponseCheckbox(response.id, checked)}
                onEdit={() => responseActions.handleOpenEditModal(response)}
                onView={(tab) => onResponseViewTab?.(response, tab || 'details')}
                onApprovalAction={responseActions.handleApproval}
                canEdit={canEditResponse(response, user)}
                canApprove={canApproveResponse(response, user)}
                canReject={canRejectResponse(response, user)}
                isProcessing={responseActions.isProcessing(response.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        pagination={pagination}
        onPageChange={tableState.handlePageChange}
        onPageSizeChange={tableState.handlePageSizeChange}
        loading={loading}
      />

      {/* Edit Modal */}
      {responseActions.editModalOpen && responseActions.selectedResponseForEdit && (
        <UnifiedResponseEditModal
          open={responseActions.editModalOpen}
          onClose={responseActions.handleCloseEditModal}
          response={responseActions.selectedResponseForEdit}
          onUpdate={responseActions.handleEditModalUpdate}
          enableDebugLogging={process.env.NODE_ENV === 'development'}
          showDetailedErrors={true}
        />
      )}
    </div>
  );
};

export default ResponseManagementTable;