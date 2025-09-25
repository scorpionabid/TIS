import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import {
  Search,
  Filter,
  BarChart,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PublishedSurvey, SurveyResponseForApproval } from '../../../services/surveyApproval';

// Survey Responses Data Table Component
interface SurveyResponsesDataTableProps {
  responses: SurveyResponseForApproval[];
  selectedSurvey: PublishedSurvey;
}

const SurveyResponsesDataTable: React.FC<SurveyResponsesDataTableProps> = ({
  responses,
  selectedSurvey
}) => {
  // Get questions from the first response or survey
  const questions = selectedSurvey.questions || [];

  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter responses based on search term
  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    const institutionName = response.institution?.name?.toLowerCase() || '';
    const institutionType = response.institution?.type?.toLowerCase() || '';
    return institutionName.includes(searchTerm.toLowerCase()) ||
           institutionType.includes(searchTerm.toLowerCase());
  });

  // Sort responses
  const sortedResponses = [...filteredResponses].sort((a, b) => {
    const nameA = a.institution?.name || '';
    const nameB = b.institution?.name || '';
    const comparison = nameA.localeCompare(nameB, 'az-AZ');
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Paginated responses
  const totalPages = Math.ceil(sortedResponses.length / pageSize);
  const paginatedResponses = sortedResponses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      {/* Professional Filter/Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search & Filter Section */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Müəssisə adı və ya tipini axtarın..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-10"
              />
            </div>

            {/* Sort Direction Toggle */}
            <Button
              variant="outline"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2"
            >
              {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              A-Z {sortDirection === 'asc' ? '↓' : '↑'}
            </Button>

            {/* Page Size Selector */}
            <Select value={pageSize.toString()} onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 sətir</SelectItem>
                <SelectItem value="25">25 sətir</SelectItem>
                <SelectItem value="50">50 sətir</SelectItem>
                <SelectItem value="100">100 sətir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>
                {filteredResponses.length} / {responses.length} müəssisə
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span>{questions.length} sual</span>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Table with Sticky Columns */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900 min-w-[200px] sticky left-0 bg-gray-50 z-10">
              Müəssisə
            </th>
            {questions.map((question: any, index: number) => (
              <th
                key={question.id || index}
                className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900 min-w-[150px] max-w-[250px]"
              >
                <div className="truncate" title={question.title}>
                  {question.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {question.type}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedResponses.map((response) => (
            <tr key={response.id} className="hover:bg-gray-50">
              {/* Institution Name - Sticky Column */}
              <td className="border border-gray-200 px-4 py-3 sticky left-0 bg-white z-10">
                <div className="font-medium text-gray-900">
                  {response.institution?.name}
                </div>
                <div className="text-sm text-gray-500">
                  {response.institution?.type}
                </div>
              </td>

              {/* Question Responses */}
              {questions.map((question: any, qIndex: number) => {
                // Get answer from responses object using question ID
                const answer = response.responses?.[question.id.toString()];

                return (
                  <td
                    key={question.id || qIndex}
                    className="border border-gray-200 px-4 py-3 max-w-[250px]"
                  >
                    <div className="text-sm text-gray-900 break-words">
                      {answer ? (
                        typeof answer === 'object'
                          ? JSON.stringify(answer, null, 2)
                          : answer || '-'
                      ) : '-'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        </table>
        </div>

        {/* Professional Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {/* Page Info */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  Səhifə {currentPage} / {totalPages}
                </span>
                <span>
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredResponses.length)} / {filteredResponses.length}
                </span>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  İlk
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Sonuncu
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Updated Summary with Filtered Data */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistikalar</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-600">Cari Səhifə</div>
            <div className="text-lg font-bold text-gray-900">{paginatedResponses.length}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Filterlənmiş</div>
            <div className="text-lg font-bold text-blue-600">{filteredResponses.length}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Ümumi Cavab</div>
            <div className="text-lg font-bold text-gray-900">{responses.length}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600">Sual Sayı</div>
            <div className="text-lg font-bold text-green-600">{questions.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SurveyResponsesDataTable);