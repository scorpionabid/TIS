import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDataTable } from '@/hooks/useDataTable'

describe('useDataTable Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useDataTable({ data: [] }))

    expect(result.current.currentPage).toBe(1)
    expect(result.current.pageSize).toBe(10)
    expect(result.current.sortBy).toBe('')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.filters).toEqual({})
    expect(result.current.searchQuery).toBe('')
    expect(result.current.totalItems).toBe(0)
  })

  it('should handle pagination correctly', () => {
    const data = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))
    
    const { result } = renderHook(() => useDataTable({ 
      data,
      pageSize: 5 
    }))

    act(() => {
      result.current.setPage(2)
    })

    expect(result.current.currentPage).toBe(2)
    expect(result.current.paginatedData).toEqual(data.slice(5, 10))
  })

  it('should handle sorting correctly', () => {
    const data = [
      { id: 1, name: 'Charlie', age: 30 },
      { id: 2, name: 'Alice', age: 25 },
      { id: 3, name: 'Bob', age: 35 }
    ]
    
    const { result } = renderHook(() => useDataTable({ 
      data,
      sortBy: 'name' 
    }))

    expect(result.current.sortedData).toEqual([
      { id: 2, name: 'Alice', age: 25 },
      { id: 3, name: 'Bob', age: 35 },
      { id: 1, name: 'Charlie', age: 30 }
    ])

    act(() => {
      result.current.setSortBy('age')
    })

    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.sortedData).toEqual([
      { id: 2, name: 'Alice', age: 25 },
      { id: 1, name: 'Charlie', age: 30 },
      { id: 3, name: 'Bob', age: 35 }
    ])
  })

  it('should handle filtering correctly', () => {
    const data = [
      { id: 1, name: 'Alice', role: 'admin', status: 'active' },
      { id: 2, name: 'Bob', role: 'user', status: 'inactive' },
      { id: 3, name: 'Charlie', role: 'user', status: 'active' }
    ]
    
    const { result } = renderHook(() => useDataTable({ 
      data,
      filters: { status: 'active' }
    }))

    expect(result.current.filteredData).toEqual([
      { id: 1, name: 'Alice', role: 'admin', status: 'active' },
      { id: 3, name: 'Charlie', role: 'user', status: 'active' }
    ])
  })

  it('should handle search correctly', () => {
    const data = [
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
      { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
      { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' }
    ]
    
    const { result } = renderHook(() => useDataTable({ 
      data,
      searchable: true,
      searchFields: ['name', 'email']
    }))

    act(() => {
      result.current.setSearchQuery('alice')
    })

    expect(result.current.filteredData).toEqual([
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com' }
    ])
  })

  it('should reset filters correctly', () => {
    const data = [
      { id: 1, name: 'Alice', role: 'admin', status: 'active' },
      { id: 2, name: 'Bob', role: 'user', status: 'inactive' }
    ]
    
    const { result } = renderHook(() => useDataTable({ 
      data,
      filters: { status: 'active' }
    }))

    act(() => {
      result.current.setFilters({ role: 'admin' })
    })
    expect(result.current.filters).toEqual({ role: 'admin' })

    act(() => {
      result.current.resetFilters()
    })
    expect(result.current.filters).toEqual({})
    expect(result.current.searchQuery).toBe('')
    expect(result.current.currentPage).toBe(1)
  })

  it('should calculate pagination correctly', () => {
    const data = Array.from({ length: 23 }, (_, i) => ({ id: i + 1 }))
    
    const { result } = renderHook(() => useDataTable({ 
      data,
      pageSize: 10 
    }))

    expect(result.current.totalPages).toBe(3)
    expect(result.current.totalItems).toBe(23)

    act(() => {
      result.current.setPage(3)
    })
    expect(result.current.paginatedData).toEqual(data.slice(20, 23))
  })
})
