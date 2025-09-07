import { useState, useMemo } from "react";

export interface PaginationOptions {
  initialPage?: number;
  initialItemsPerPage?: number;
}

export interface PaginationResult<T> {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  paginatedItems: T[];
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export function usePagination<T>(
  items: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const { initialPage = 1, initialItemsPerPage = 10 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const result = useMemo(() => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Ensure current page is within bounds
    const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
    
    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return {
      currentPage: validCurrentPage,
      itemsPerPage,
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      paginatedItems,
      canGoNext: validCurrentPage < totalPages,
      canGoPrevious: validCurrentPage > 1,
    };
  }, [items, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, result.totalPages));
    setCurrentPage(validPage);
  };

  const goToNextPage = () => {
    if (result.canGoNext) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (result.canGoPrevious) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleSetItemsPerPage = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    // Reset to first page when changing items per page
    setCurrentPage(1);
  };

  return {
    ...result,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setItemsPerPage: handleSetItemsPerPage,
  };
}