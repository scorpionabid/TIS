import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Stable mock refs — MUST be defined before vi.mock() calls.
// Defining these inside vi.mock factories creates NEW refs each render,
// which causes useEffect deps to change every render → infinite loop.
// ---------------------------------------------------------------------------
const stableSetExpandedIds = vi.fn();
const stableToggleExpand = vi.fn();
const stableSelectNode = vi.fn();

// ---------------------------------------------------------------------------
// Mocks (before component import)
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(() => [new URLSearchParams('tab=list'), vi.fn()]),
}));

// Mock Radix-backed UI components to avoid heavy module transforms
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/GradeBookRoleContext', () => ({
  GradeBookRoleProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGradeBookRole: vi.fn(),
}));

vi.mock('@/components/gradebook', () => ({
  GradeBookList: ({ institutionId }: { institutionId: number | null }) => (
    <div data-testid="grade-book-list" data-institution-id={String(institutionId)}>
      GradeBookList
    </div>
  ),
}));

vi.mock('@/components/gradebook/analysis/GradeBookAnalysis', () => ({
  GradeBookAnalysis: () => <div data-testid="grade-book-analysis">GradeBookAnalysis</div>,
}));

vi.mock('@/components/gradebook/admin', () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">AdminDashboard</div>,
}));

vi.mock('@/components/gradebook/HierarchyNavigator', () => ({
  HierarchyNavigator: () => <div data-testid="hierarchy-navigator" />,
  useHierarchyState: () => ({
    expandedIds: new Set(),
    setExpandedIds: stableSetExpandedIds,
    selectedNode: null,
    toggleExpand: stableToggleExpand,
    selectNode: stableSelectNode,
  }),
}));

vi.mock('@/services/hierarchy', () => ({
  hierarchyService: { getHierarchy: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('@/services/gradeBook', () => ({
  gradeBookService: { 
    getGradeBooks: vi.fn().mockResolvedValue({ success: true, data: [] }),
    exportGradeBook: vi.fn()
  }
}));

vi.mock('@/services/grades', () => ({
  gradeService: { get: vi.fn().mockResolvedValue({ success: true, items: [] }) },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import GradeBooksPage from '../GradeBooks';
import { useAuth } from '@/contexts/AuthContext';
import { useGradeBookRole } from '@/contexts/GradeBookRoleContext';
import { gradeService } from '@/services/grades';

// ---------------------------------------------------------------------------
// Typed mocks
// ---------------------------------------------------------------------------
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseGradeBookRole = useGradeBookRole as ReturnType<typeof vi.fn>;
const mockGradeService = gradeService as { get: ReturnType<typeof vi.fn> };

// ---------------------------------------------------------------------------
// Default role/user fixtures
// ---------------------------------------------------------------------------
const schoolAdminRole = {
  viewMode: 'school', canViewHierarchy: false, isRegionAdmin: false, isSectorAdmin: false, canCreate: true,
};

const regionAdminRole = {
  viewMode: 'region', canViewHierarchy: true, isRegionAdmin: true, isSectorAdmin: false, canCreate: false,
};

const schoolAdminUser = {
  id: 1, institution: { id: 10, name: 'Bakı Məktəbi №5' }, region: null, department: null,
};

const regionAdminUser = {
  id: 2, institution: null, region: { name: 'Bakı Regional' }, department: null,
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------
const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GradeBooksPage />
    </QueryClientProvider>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GradeBooks səhifəsi — tab görünürlüğü', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGradeService.get.mockResolvedValue({ items: [] });
  });

  it('assessments.read icazəsi varsa "Sinif Jurnalları" tab görünür', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);

    renderPage();

    expect(screen.getByRole('tab', { name: /Sinif Jurnalları/i })).toBeInTheDocument();
  });

  it('assessments.read icazəsi varsa "Nəticə Analizi" tab görünür', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);

    renderPage();

    expect(screen.getByRole('tab', { name: /Nəticə Analizi/i })).toBeInTheDocument();
  });

  it('assessments.read icazəsi yoxdursa tab-lar görünmür', () => {
    mockUseAuth.mockReturnValue({ hasPermission: () => false, currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);

    renderPage();

    expect(screen.queryByRole('tab', { name: /Sinif Jurnalları/i })).not.toBeInTheDocument();
  });

  it('Region Admin üçün "Admin İcmalı" tab görünür', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: regionAdminUser });
    mockUseGradeBookRole.mockReturnValue(regionAdminRole);

    renderPage();

    expect(screen.getByRole('tab', { name: /Admin İcmalı/i })).toBeInTheDocument();
  });

  it('SchoolAdmin üçün "Admin İcmalı" tab görünmür', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);

    renderPage();

    expect(screen.queryByRole('tab', { name: /Admin İcmalı/i })).not.toBeInTheDocument();
  });
});

describe('GradeBooks səhifəsi — institution chip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGradeService.get.mockResolvedValue({ items: [] });
  });

  it('Məktəb admin üçün institution adı göstərilir', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);

    renderPage();

    expect(screen.getAllByText('Bakı Məktəbi №5').length).toBeGreaterThan(0);
  });

  it('Region Admin üçün region adı göstərilir', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: regionAdminUser });
    mockUseGradeBookRole.mockReturnValue(regionAdminRole);

    renderPage();

    expect(screen.getByText('Bakı Regional')).toBeInTheDocument();
  });
});

describe('GradeBooks səhifəsi — layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGradeService.get.mockResolvedValue({ items: [] });
  });

  it('SchoolAdmin üçün HierarchyNavigator göstərilmir', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);

    renderPage();

    expect(screen.queryByTestId('hierarchy-navigator')).not.toBeInTheDocument();
  });

  it('Region Admin üçün HierarchyNavigator göstərilir', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: regionAdminUser });
    mockUseGradeBookRole.mockReturnValue(regionAdminRole);

    renderPage();

    expect(screen.getByTestId('hierarchy-navigator')).toBeInTheDocument();
  });

  it('SchoolAdmin üçün GradeBookList institution_id=10 ilə render edilir', async () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);

    renderPage();

    await waitFor(() => {
      const list = screen.getByTestId('grade-book-list');
      expect(list.getAttribute('data-institution-id')).toBe('10');
    });
  });

  it('Region Admin məktəb seçmədən "Jurnalları görmək üçün məktəb seçin" görünür', () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: regionAdminUser });
    mockUseGradeBookRole.mockReturnValue(regionAdminRole);

    renderPage();

    expect(screen.getByText('Jurnalları görmək üçün məktəb seçin')).toBeInTheDocument();
  });
});

describe('GradeBooks səhifəsi — sinif paneli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Siniflər yüklənəndə "Bütün siniflər" düyməsi görünür', async () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);
    mockGradeService.get.mockResolvedValue({
      items: [
        { id: 1, full_name: '5A', display_name: '5A sinfi', name: 'A', student_count: 25 },
        { id: 2, full_name: '5B', display_name: '5B sinfi', name: 'B', student_count: 22 },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bütün siniflər/i })).toBeInTheDocument();
    });
  });

  it('Sinif axtarışı filtr işləyir', async () => {
    mockUseAuth.mockReturnValue({ hasPermission: (p: string) => p === 'assessments.read', currentUser: schoolAdminUser });
    mockUseGradeBookRole.mockReturnValue(schoolAdminRole);
    mockGradeService.get.mockResolvedValue({
      items: [
        { id: 1, full_name: '5A', display_name: '5A sinfi', name: 'A', student_count: 25 },
        { id: 2, full_name: '7B', display_name: '7B sinfi', name: 'B', student_count: 22 },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('5A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Sinif axtar...');
    fireEvent.change(searchInput, { target: { value: '7B' } });

    expect(screen.queryByText('5A')).not.toBeInTheDocument();
    expect(screen.getByText('7B')).toBeInTheDocument();
  });
});
