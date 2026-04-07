import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  isLoading?: boolean;
  
  // Alternative prop names
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
  isLoading = false,
  // Alternative props
  total,
  perPage,
  onPerPageChange,
}) => {
  const [jumpPage, setJumpPage] = useState("");
  
  useEffect(() => {
    setJumpPage("");
  }, [currentPage]);

  const actualTotalItems = totalItems ?? total ?? 0;
  const actualItemsPerPage = itemsPerPage ?? perPage ?? 20;
  const actualOnItemsPerPageChange = onItemsPerPageChange ?? onPerPageChange;
  
  const actualStartIndex = startIndex ?? ((currentPage - 1) * actualItemsPerPage);
  const actualEndIndex = endIndex ?? Math.min(actualStartIndex + actualItemsPerPage, actualTotalItems);
  
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

  const handleJump = () => {
    const pageNum = parseInt(jumpPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    }
    setJumpPage("");
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage <= 3) {
        for (let i = 2; i <= 4; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
      <div className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium whitespace-nowrap text-slate-500">Səhifə başına:</p>
          <Select
            value={actualItemsPerPage.toString()}
            onValueChange={(value) => actualOnItemsPerPageChange?.(Number(value))}
          >
            <SelectTrigger className="h-9 w-[80px] border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium whitespace-nowrap ml-2 text-slate-500">Keçid:</p>
          <div className="flex items-center gap-1">
            <Input 
              className="h-9 w-14 text-center p-1 border-slate-200 bg-white focus-visible:ring-primary/20"
              placeholder="#"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-2 text-primary hover:bg-primary/10 font-bold transition-all active:scale-95" 
              onClick={handleJump}
            >
              OK
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center justify-center text-sm font-medium text-muted-foreground whitespace-nowrap bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
          <span className="font-bold text-primary">
            {actualTotalItems > 0 ? actualStartIndex + 1 : 0}-{actualEndIndex}
          </span>
          <span className="mx-1 text-slate-300">/</span>
          <span className="text-slate-600">{actualTotalItems}</span>
        </div>
        
        <Pagination>
          <PaginationContent className="gap-2">
            <PaginationItem>
              <PaginationPrevious 
                onClick={actualOnPrevious}
                className={!actualCanGoPrevious ? 'pointer-events-none opacity-30' : 'cursor-pointer hover:bg-white hover:shadow-md transition-all active:scale-95 bg-white border border-slate-200'}
              />
            </PaginationItem>
            
            {pageNumbers.map((pageNum, index) => (
              <PaginationItem key={index} className="hidden md:block">
                {pageNum === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => onPageChange(pageNum)}
                    isActive={pageNum === currentPage}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      pageNum === currentPage 
                        ? "shadow-lg shadow-primary/20 scale-105" 
                        : "hover:bg-white hover:shadow-md active:scale-95 bg-white border border-slate-100"
                    )}
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            {/* Mobile current page indicator with more context */}
            <PaginationItem className="md:hidden">
              <Badge variant="secondary" className="px-3 py-1 bg-primary/5 text-primary border-primary/10 font-bold">
                Səhifə {currentPage} / {totalPages}
              </Badge>
            </PaginationItem>
            
            <PaginationItem>
              <PaginationNext 
                onClick={actualOnNext}
                className={!actualCanGoNext ? 'pointer-events-none opacity-30' : 'cursor-pointer hover:bg-white hover:shadow-md transition-all active:scale-95 bg-white border border-slate-200'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
