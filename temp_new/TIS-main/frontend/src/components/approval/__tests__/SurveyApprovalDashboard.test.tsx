import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SurveyApprovalDashboard from '../SurveyApprovalDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock useAuth directly
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 1, name: 'Admin', role: 'superadmin' },
    isAuthenticated: true,
  })
}));

// Mock the hook
vi.mock('@/hooks/useModuleAccess', () => ({
  useModuleAccess: () => ({
    canView: true,
    canManage: true,
  })
}));

// Mock react-query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn((options: any) => {
      // Return published surveys
      if (options.queryKey[0] === 'published-surveys') {
        return {
          data: [{ id: 1, title: 'Test Survey', status: 'published' }],
          isLoading: false,
          error: null,
        };
      }
      
      // Return responses for approval
      if (options.queryKey[0] === 'survey-responses-approval') {
        return {
          data: {
            data: [{ id: 1, status: 'submitted', progress_percentage: 100 }],
            stats: {
              total: 1,
              pending: 1,
              approved: 0,
              rejected: 0,
              draft: 0,
              in_progress: 0,
              returned: 0,
              completion_rate: 100,
            },
            pagination: { total: 1, current_page: 1, last_page: 1, per_page: 25 }
          },
          isLoading: false,
          error: null,
          refetch: vi.fn()
        };
      }

      // Default mock 
      return { data: null, isLoading: false, error: null };
    }),
  };
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

export const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('SurveyApprovalDashboard Component', () => {
  beforeEach(() => {
    // Mock local storage to pre-select a survey
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => JSON.stringify({ id: 1, title: 'Test Survey', status: 'published' })),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true
    });
  });

  it('düzgün default state (Dashboard) göstərir və gələn rəqəmləri render edir', async () => {
    render(<SurveyApprovalDashboard />, { wrapper: AppWrapper });
    
    // Check main title
    expect(await screen.findByTestId('survey-approval-title')).toBeInTheDocument();
    expect(screen.getByText('Sorğu Cavablarının Təsdiqi', { selector: 'h1' })).toBeInTheDocument();

    // The component might need an extra tick to process local storage and render stats
    await waitFor(() => {
      expect(screen.getByTestId('stat-card-total')).toBeInTheDocument();
      expect(screen.getByTestId('stat-value-total')).toHaveTextContent('1');
    }, { timeout: 3000 });
    
    expect(screen.getByTestId('stat-card-pending')).toBeInTheDocument();
    expect(screen.getByTestId('stat-value-pending')).toHaveTextContent('1');
    
    expect(screen.getByTestId('stat-card-approved')).toBeInTheDocument();
  });
});
