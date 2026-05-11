import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

import { useLinkDatabaseData } from '../useLinkDatabaseData';
import { linkDatabaseService } from '@/services/linkDatabase';
import type { LinkDatabaseFiltersState } from '../../types/linkDatabase.types';

// Mock the service
vi.mock('@/services/linkDatabase', () => ({
  linkDatabaseService: {
    getDepartments: vi.fn(),
    getLinksByDepartmentType: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useLinkDatabaseData', () => {
  const mockUpdateFilter = vi.fn();
  
  const defaultFilters: LinkDatabaseFiltersState = {
    departmentId: '',
    search: '',
    sortBy: 'created_at',
    sortDirection: 'desc',
    linkType: 'all',
    status: 'all',
  };

  const defaultProps = {
    filters: defaultFilters,
    debouncedSearch: '',
    currentPage: 1,
    perPage: 10,
    updateFilter: mockUpdateFilter,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(linkDatabaseService.getDepartments).mockResolvedValue([
      { id: 1, name: 'IT Department', users_count: 5 },
      { id: 2, name: 'HR Department', users_count: 3 },
    ]);

    vi.mocked(linkDatabaseService.getLinksByDepartmentType).mockResolvedValue({
      data: [
        { id: 101, title: 'Test Link 1', url: 'https://test1.com', status: 'active', is_featured: true },
        { id: 102, title: 'Test Link 2', url: 'https://test2.com', status: 'expired', is_featured: false },
      ],
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 2,
    } as any);
  });

  it('fetches and auto-selects the first department if none is selected', async () => {
    renderHook(() => useLinkDatabaseData(defaultProps), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(linkDatabaseService.getDepartments).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockUpdateFilter).toHaveBeenCalledWith('departmentId', '1');
    });
  });

  it('does not auto-select department if one is already selected', async () => {
    renderHook(() => useLinkDatabaseData({
      ...defaultProps,
      filters: { ...defaultFilters, departmentId: '2' }
    }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(linkDatabaseService.getDepartments).toHaveBeenCalled();
    });

    expect(mockUpdateFilter).not.toHaveBeenCalled();
  });

  it('fetches links when departmentId is available', async () => {
    const { result } = renderHook(() => useLinkDatabaseData({
      ...defaultProps,
      filters: { ...defaultFilters, departmentId: '1' }
    }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.currentLinks).toHaveLength(2);
    });

    expect(linkDatabaseService.getLinksByDepartmentType).toHaveBeenCalledWith('1', expect.objectContaining({
      per_page: 10,
      page: 1,
    }));
  });

  it('computes stats and featured links correctly', async () => {
    const { result } = renderHook(() => useLinkDatabaseData({
      ...defaultProps,
      filters: { ...defaultFilters, departmentId: '1' }
    }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.currentLinks).toHaveLength(2);
    });

    expect(result.current.stats).toEqual({
      total: 2,
      active: 1,
      expired: 1,
      featured: 1,
    });

    expect(result.current.featuredLinks).toHaveLength(1);
    expect(result.current.featuredLinks[0].id).toBe(101);
  });

  it('builds API filters correctly based on input props', async () => {
    renderHook(() => useLinkDatabaseData({
      ...defaultProps,
      debouncedSearch: 'test search',
      currentPage: 2,
      perPage: 20,
      filters: {
        ...defaultFilters,
        departmentId: '2',
        linkType: 'external',
        status: 'active',
        sortBy: 'title',
        sortDirection: 'asc',
        isFeatured: true,
      }
    }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(linkDatabaseService.getLinksByDepartmentType).toHaveBeenCalledWith('2', {
        search: 'test search',
        sort_by: 'title',
        sort_direction: 'asc',
        per_page: 20,
        page: 2,
        link_type: 'external',
        status: 'active',
        is_featured: true,
      });
    });
  });
});
