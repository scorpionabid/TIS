// Report Tables Components
export { EditableTable } from './EditableTable';
export { MasterTableView } from './MasterTableView';
export { ReportTableApprovalQueue } from './ReportTableApprovalQueue';
export { ReportTableApprovalGroupedView } from './ReportTableApprovalGroupedView';
export { ReportTableReadyGroupedView } from './ReportTableReadyGroupedView';
export { ReportTableResponsesView } from './ReportTableResponsesView';
export { ReportTableStatisticsView } from './ReportTableStatisticsView';
export { SchoolFillStatisticsView } from './SchoolFillStatisticsView';
export { TableEntryCard } from './TableEntryCard';

// Shared Components (Refactored)
export { ResponseStatusBadge, RowStatusBadge, ProcessingStatusBadge } from './StatusBadge';
export { ReportTableErrorBoundary, TableRowErrorBoundary } from './ErrorBoundary';

// Bulk Operations (New)
export { BulkOperationsToolbar, RowCheckbox, useBulkSelection } from './BulkOperations';
export { BulkActionConfirmDialog } from './BulkActionConfirmDialog';

// Phase 3.2: Comments and Partial Return
export { RowComments } from './RowComments';
export { PartialReturnDialog } from './PartialReturnDialog';

// Phase 4.1: Templates and Versioning
export { TableTemplates } from './TableTemplates';
export { TableVersionHistory } from './TableVersionHistory';

// Phase 4.2: New Column Types
export { FileUploadInput } from './FileUploadInput';
export { SignatureInput } from './SignatureInput';
export { GPSInput } from './GPSInput';

// Phase 5: Analytics
export { TableAnalytics } from './TableAnalytics';

// Phase 6: Real-time Collaboration
export { RealTimeCollaboration, useCollaboration } from './RealTimeCollaboration';

// Note: validateRow and hasValidationErrors are now in @/utils/tableValidation
