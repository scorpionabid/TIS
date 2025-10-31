import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  startIndex?: number;
  endIndex?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  
  // Alternative prop names for backward compatibility
  total?: number;
  perPage?: number;
  onPerPageChange?: (perPage: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  // Alternative props
  total,
  perPage,
  onPerPageChange,
}) => {
  // Use alternative prop names if provided
  const actualTotalItems = totalItems ?? total ?? 0;
  const actualItemsPerPage = itemsPerPage ?? perPage ?? 20;
  const actualOnItemsPerPageChange = onItemsPerPageChange ?? onPerPageChange;
  
  // Calculate derived values if not provided
  const actualStartIndex = startIndex ?? ((currentPage - 1) * actualItemsPerPage);
  const actualEndIndex = endIndex ?? Math.min(actualStartIndex + actualItemsPerPage, actualTotalItems);
  
  // Default navigation functions
  const actualOnPrevious = onPrevious ?? (() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  });
  
  const actualOnNext = onNext ?? (() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  });
  
  const actualCanGoPrevious = canGoPrevious ?? (currentPage > 1);
  const actualCanGoNext = canGoNext ?? (currentPage < totalPages);
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Current page is near the beginning
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Current page is near the end
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Current page is in the middle
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-sm font-medium">Səhifə başına</p>
        <Select
          value={actualItemsPerPage.toString()}
          onValueChange={(value) => actualOnItemsPerPageChange?.(Number(value))}
        >
          <SelectTrigger className="h-9 w-full sm:w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 50, 100].map((pageSize) => (
              <SelectItem key={pageSize} value={pageSize.toString()}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
        <div className="flex items-center justify-center text-sm font-medium">
          {actualStartIndex + 1}-{actualEndIndex} / {actualTotalItems}
        </div>
        
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={actualOnPrevious}
                className={!actualCanGoPrevious ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {pageNumbers.map((pageNum, index) => (
              <PaginationItem key={index}>
                {pageNum === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => onPageChange(pageNum)}
                    isActive={pageNum === currentPage}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                onClick={actualOnNext}
                className={!actualCanGoNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
