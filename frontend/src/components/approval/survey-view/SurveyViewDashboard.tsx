import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import {
  Eye,
  BarChart3,
  AlertTriangle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
} from 'lucide-react';
import surveyApprovalService, { PublishedSurvey, ResponseFilters } from '../../../services/surveyApproval';
import SurveyResponsesDataTable from './SurveyResponsesDataTable';
import UnifiedSurveySelector from '../UnifiedSurveySelector';
import { storageHelpers } from '@/utils/helpers';

const STORAGE_KEY = 'surveyViewDashboard_selectedSurveyId';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Bütün statuslar' },
  { value: 'draft', label: 'Qaralama' },
  { value: 'submitted', label: 'Göndərilmiş' },
  { value: 'approved', label: 'Təsdiqlənmiş' },
  { value: 'rejected', label: 'Rədd edilmiş' },
  { value: 'returned', label: 'Geri qaytarılmış' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SurveyViewDashboard: React.FC = () => {
  const [selectedSurvey, setSelectedSurvey] = useState<PublishedSurvey | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Helper functions for localStorage
  const getStoredSurveyId = (): string | null => {
    try {
      return storageHelpers.get<string>(STORAGE_KEY);
    } catch {
      return null;
    }
  };

  const storeSurveyId = (surveyId: string | null) => {
    try {
      if (surveyId) {
        storageHelpers.set(STORAGE_KEY, surveyId);
      } else {
        storageHelpers.remove(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  // Fetch published surveys
  const { data: publishedSurveys, isLoading: surveysLoading } = useQuery({
    queryKey: ['published-surveys-view'],
    queryFn: () => surveyApprovalService.getPublishedSurveys(),
    staleTime: 5 * 60 * 1000,
  });

  // Build filters for server-side request
  // 'all' sentinel means no status filter — do not send to backend
  const activeStatus = statusFilter !== 'all' ? statusFilter : '';
  const filters: ResponseFilters = {
    per_page: pageSize,
    page: currentPage,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(activeStatus ? { status: activeStatus as ResponseFilters['status'] } : {}),
  };

  // Fetch survey responses (server-side paginated)
  const {
    data: responsesData,
    isLoading: responsesLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['survey-responses-view', selectedSurvey?.id, filters],
    queryFn: () =>
      selectedSurvey
        ? surveyApprovalService.getResponsesForApproval(selectedSurvey.id, filters)
        : null,
    enabled: !!selectedSurvey,
    staleTime: 30 * 1000,
    keepPreviousData: true,
  } as any);

  // Restore selected survey from localStorage or auto-select first survey
  useEffect(() => {
    if (Array.isArray(publishedSurveys) && publishedSurveys.length > 0 && !selectedSurvey) {
      const storedSurveyId = getStoredSurveyId();

      if (storedSurveyId) {
        const storedSurvey = publishedSurveys.find(
          (survey: any) => survey.id.toString() === storedSurveyId
        );
        if (storedSurvey) {
          setSelectedSurvey(storedSurvey);
          return;
        }
        storeSurveyId(null);
      }

      const firstSurvey = publishedSurveys[0];
      setSelectedSurvey(firstSurvey);
      storeSurveyId(firstSurvey.id.toString());
    }
  }, [publishedSurveys, selectedSurvey]);

  const handleSurveySelect = (survey: PublishedSurvey) => {
    setSelectedSurvey(survey);
    storeSurveyId(survey.id.toString());
    // Reset filters when switching survey
    setCurrentPage(1);
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('all');
  };

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setCurrentPage(1);
  }, []);

  const responses = (responsesData as any)?.responses || [];
  const pagination = (responsesData as any)?.pagination;
  const stats = (responsesData as any)?.stats;
  const totalPages = pagination?.last_page || 1;
  const totalItems = pagination?.total || 0;
  const isFiltered = !!(debouncedSearch || activeStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Eye className="h-8 w-8 text-primary" />
          Sorğulara Baxış
        </h1>
        <p className="text-muted-foreground mt-1">
          Sorğulara verilən cavabları görüntüləyin və analiz edin
        </p>
      </div>

      {/* Unified Survey Selection */}
      <UnifiedSurveySelector
        surveys={publishedSurveys}
        selectedSurvey={selectedSurvey}
        onSurveySelect={(survey) => handleSurveySelect(survey as PublishedSurvey)}
        isLoading={surveysLoading}
      />

      {/* Survey Responses */}
      {selectedSurvey && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sorğu Cavabları
                  {totalItems > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {totalItems} müəssisə
                    </Badge>
                  )}
                  {isFetching && !responsesLoading && (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
                  )}
                </CardTitle>
                <CardDescription>{selectedSurvey.title} sorğusuna verilən cavablar</CardDescription>
              </div>

              {/* Stats badges */}
              {stats && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">Cəmi: {stats.total}</Badge>
                  {stats.approved > 0 && (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      ✓ {stats.approved} Təsdiqlənib
                    </Badge>
                  )}
                  {stats.pending > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      ⏳ {stats.pending} Gözləyir
                    </Badge>
                  )}
                  {stats.draft > 0 && (
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                      ✎ {stats.draft} Qaralama
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Müəssisə adı ilə axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status seç..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Page size */}
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size} sətir
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear filters */}
              {isFiltered && (
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="shrink-0">
                  <X className="h-4 w-4 mr-1" />
                  Filtrləri sil
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {responsesLoading ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="animate-spin h-8 w-8 text-primary mr-3" />
                <span className="text-muted-foreground">Cavablar yüklənir...</span>
              </div>
            ) : responses.length === 0 ? (
              <div className="p-8">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {isFiltered
                      ? 'Bu filtr şərtlərinə uyğun cavab tapılmadı.'
                      : 'Bu sorğuya hələ cavab verilməyib.'}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                <SurveyResponsesDataTable
                  responses={responses}
                  selectedSurvey={selectedSurvey}
                  isFetching={isFetching}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                    <div className="text-sm text-muted-foreground">
                      {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalItems)} / {totalItems} müəssisə
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default React.memo(SurveyViewDashboard);
