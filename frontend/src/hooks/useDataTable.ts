import { useState, useEffect, useMemo, useCallback } from 'react'

interface UseDataTableOptions<T> {
  data: T[]
  pageSize?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  filters?: Record<string, any>
  searchable?: boolean
  searchFields?: string[]
}

interface UseDataTableReturn<T> {
  paginatedData: T[]
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  sortBy: string
  sortDirection: 'asc' | 'desc'
  filters: Record<string, any>
  searchQuery: string
  isLoading: boolean
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSortBy: (field: string) => void
  setSortDirection: (direction: 'asc' | 'desc') => void
  setFilters: (filters: Record<string, any>) => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void
  nextPage: () => void
  prevPage: () => void
  refresh: () => void
}

export function useDataTable<T extends { id: string | number }>(
  options: UseDataTableOptions<T>
): UseDataTableReturn<T> {
  const {
    data,
    pageSize: initialPageSize = 10,
    sortBy: initialSortBy,
    sortDirection: initialSortDirection = 'asc',
    filters: initialFilters = {},
    searchable = false,
    searchFields = []
  } = options

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [sortBy, setSortBy] = useState(initialSortBy || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection)
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Filter and search logic
  const filteredData = useMemo(() => {
    let result = [...data]

    // Apply search
    if (searchable && searchQuery) {
      result = result.filter(item => {
        return searchFields.some(field => {
          const value = getNestedValue(item, field)
          return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        })
      })
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result = result.filter(item => {
          const itemValue = getNestedValue(item, key)
          if (Array.isArray(value)) {
            return value.includes(itemValue)
          }
          return itemValue === value
        })
      }
    })

    return result
  }, [data, searchQuery, filters, searchable, searchFields])

  // Sort logic
  const sortedData = useMemo(() => {
    if (!sortBy) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortBy)
      const bValue = getNestedValue(b, sortBy)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortBy, sortDirection])

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pageSize])

  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / pageSize)
  }, [sortedData, pageSize])

  const totalItems = sortedData.length

  // Action handlers
  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when page size changes
  }, [])

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }, [sortBy])

  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page when search changes
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
    setSearchQuery('')
    setCurrentPage(1)
  }, [initialFilters])

  const nextPage = useCallback(() => {
    setPage(currentPage + 1)
  }, [currentPage, setPage])

  const prevPage = useCallback(() => {
    setPage(currentPage - 1)
  }, [currentPage, setPage])

  const refresh = useCallback(() => {
    setIsLoading(true)
    // Simulate data refresh
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }, [])

  return {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    sortBy,
    sortDirection,
    filters,
    searchQuery,
    isLoading,
    setPage,
    setPageSize,
    setSortBy: handleSort,
    setSortDirection,
    setFilters: handleFilterChange,
    setSearchQuery: handleSearchChange,
    resetFilters,
    nextPage,
    prevPage,
    refresh
  }
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null
  }, obj)
}
