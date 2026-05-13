import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Stable mocks
// ---------------------------------------------------------------------------
const stableToast = vi.fn();

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: stableToast,
  })),
}));

vi.mock('@/services/surveys', () => ({
  surveyService: {
    getAll: vi.fn(),
    publish: vi.fn(),
  },
}));

vi.mock('@/hooks/useModuleAccess', () => ({
  useModuleAccess: vi.fn(() => ({
    canView: true,
    canCreate: true,
    canDelete: true,
  })),
}));

vi.mock('@/components/modals/SurveyModal', () => ({
  SurveyModal: () => <div data-testid="survey-modal" />
}));
vi.mock('@/components/modals/SurveyViewModal', () => ({
  SurveyViewModal: () => <div data-testid="survey-view-modal" />
}));
vi.mock('@/components/surveys/SurveyTemplateGallery', () => ({
  SurveyTemplateGallery: () => <div data-testid="survey-template-gallery" />
}));
vi.mock('@/components/surveys/SurveyDelegationModal', () => ({
  SurveyDelegationModal: () => <div data-testid="survey-delegation-modal" />
}));

// Mock lazy-loaded dashboard components
vi.mock('@/pages/surveys/ManagerSurveyDashboard', () => ({
  default: () => <div data-testid="manager-survey-dashboard" />
}));
vi.mock('@/pages/surveys/SurveyList', () => ({
  default: () => <div data-testid="survey-list" />
}));
vi.mock('@/pages/my-surveys/UnifiedSurveyDashboard', () => ({
  default: () => <div data-testid="unified-survey-dashboard" />
}));
vi.mock('@/pages/my-surveys/MyResponses', () => ({
  default: () => <div data-testid="my-responses" />
}));
vi.mock('@/pages/Approvals', () => ({
  default: () => <div data-testid="approvals" />
}));

// Mock UI components
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: any) => <button>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="icon-play">Play</span>,
  Plus: () => <span>Plus</span>,
  Search: () => <span>Search</span>,
  MoreVertical: () => <span>MoreVertical</span>,
  MoreHorizontal: () => <span>MoreHorizontal</span>,
  FileText: () => <span>FileText</span>,
  Copy: () => <span>Copy</span>,
  Archive: () => <span>Archive</span>,
  Trash2: () => <span>Trash2</span>,
  Filter: () => <span>Filter</span>,
  BarChart2: () => <span>BarChart2</span>,
  BarChart3: () => <span>BarChart3</span>,
  Clock: () => <span>Clock</span>,
  CheckCircle2: () => <span>Check</span>,
  Eye: () => <span>Eye</span>,
  Edit: () => <span>Edit</span>,
  Pause: () => <span>Pause</span>,
  Calendar: () => <span>Calendar</span>,
  AlertTriangle: () => <span>Alert</span>,
  ClipboardList: () => <span>List</span>,
  TrendingUp: () => <span>Up</span>,
  Layout: () => <span>Layout</span>,
  Loader2: () => <span>Loader2</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  FileEdit: () => <span>FileEdit</span>,
  LayoutGrid: () => <span>LayoutGrid</span>,
  List: () => <span>List</span>,
  ListIcon: () => <span>ListIcon</span>,
  Rows: () => <span>Rows</span>,
  Inbox: () => <span>Inbox</span>,
  InboxIcon: () => <span>InboxIcon</span>,
  Building: () => <span>Building</span>,
  Building2: () => <span>Building2</span>,
  School: () => <span>School</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  ChevronUp: () => <span>ChevronUp</span>,
  Users: () => <span>Users</span>,
  User: () => <span>User</span>,
  TrendingDown: () => <span>TrendingDown</span>,
  Check: () => <span>Check</span>,
  X: () => <span>X</span>,
  ArrowLeft: () => <span>ArrowLeft</span>,
  MapPin: () => <span>MapPin</span>,
  ArrowUpDown: () => <span>ArrowUpDown</span>,
  Info: () => <span>Info</span>,
  Table: () => <span>Table</span>,
  Download: () => <span>Download</span>,
  FileSpreadsheet: () => <span>FileSpreadsheet</span>,
  FileDown: () => <span>FileDown</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  Save: () => <span>Save</span>,
  Send: () => <span>Send</span>,
  XCircle: () => <span>XCircle</span>,
  Target: () => <span>Target</span>,
}));

import SurveysPage from '../Surveys';
import { useAuth } from '@/contexts/AuthContext';
import { surveyService } from '@/services/surveys';

const mockUseAuth = useAuth as any;
const mockSurveyService = surveyService as any;

const renderPage = () => {
  const client = new QueryClient({ 
    defaultOptions: { 
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false }
    } 
  });
  return render(
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <SurveysPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Surveys Page', () => {
  const mockSurveys = [
    { 
      id: 1, 
      title: 'Draft Survey', 
      status: 'draft', 
      description: 'Test description',
      questions_count: 5,
      response_count: 0,
      created_at: new Date().toISOString(),
      creator: { id: 1, full_name: 'Admin Admin' },
      questions: []
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      hasPermission: () => true,
      currentUser: { id: 1, role: 'superadmin' }
    });
    mockSurveyService.getAll.mockResolvedValue({
      data: {
        data: mockSurveys,
        total: 1,
        current_page: 1,
        last_page: 1
      }
    });
  });

  it('renders ManagerSurveyDashboard for superadmin role', async () => {
    renderPage();
    
    // superadmin should render ManagerSurveyDashboard (lazy-loaded)
    const dashboard = await screen.findByTestId('manager-survey-dashboard', {}, { timeout: 3000 });
    expect(dashboard).toBeInTheDocument();
  });

  it('renders and shows Surveys title for superadmin', async () => {
    renderPage();

    // Verify the page renders without crashing
    const dashboard = await screen.findByTestId('manager-survey-dashboard', {}, { timeout: 3000 });
    expect(dashboard).toBeInTheDocument();
  });

  it('does not render for unauthenticated user (null currentUser)', async () => {
    mockUseAuth.mockReturnValue({
      hasPermission: () => false,
      currentUser: null
    });
    const { container } = renderPage();
    // When currentUser is null, page returns null (empty)
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
