import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssessmentGradebook } from '../AssessmentGradebook';
import * as useGradebookHook from '../hooks/useAssessmentGradebook';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutContext } from '../../../contexts/LayoutContext';

// Wrapper for React Query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

vi.mock('../../../contexts/LayoutContext', () => ({
  useLayout: () => ({
    sidebarCollapsed: false,
    sidebarHovered: false,
    isMobile: false,
    preferencesModalOpen: false,
    setSidebarCollapsed: vi.fn(),
    setSidebarHovered: vi.fn(),
    toggleSidebar: vi.fn(),
    setPreferencesModalOpen: vi.fn(),
    openPreferencesModal: vi.fn(),
  }),
}));

export const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock the hook
vi.mock('../hooks/useAssessmentGradebook');

describe('AssessmentGradebook Component', () => {
  it('düzgün default state (Sinif seçmə propmptu) göstərir', () => {
    // Mock return value for non-selected state
    vi.spyOn(useGradebookHook, 'useAssessmentGradebook').mockReturnValue({
        selectedClassId: null,
        selectedAssessmentId: null,
        viewMode: 'assessments',
        gradeData: {},
        createModalOpen: false,
        newAssessment: {} as any,
        classes: [],
        assessments: [],
        students: [],
        grades: [],
        assessmentsLoading: false,
        gradesLoading: false,
        createAssessmentMutation: { isPending: false } as any,
        saveGradesMutation: { isPending: false } as any,
        submitAssessmentMutation: { isPending: false } as any,
        setSelectedClassId: vi.fn(),
        setSelectedAssessmentId: vi.fn(),
        setViewMode: vi.fn(),
        setGradeData: vi.fn(),
        setCreateModalOpen: vi.fn(),
        setNewAssessment: vi.fn(),
        refetchAssessments: vi.fn(),
        refetchGrades: vi.fn(),
        handleCreateAssessment: vi.fn(),
        handleSaveGrades: vi.fn(),
        handleSubmitAssessment: vi.fn(),
        updateGrade: vi.fn(),
        getAssessmentTypeText: vi.fn(),
        getGradeColor: vi.fn(),
        getGradeLetter: vi.fn(),
        calculateClassAverage: vi.fn(),
        getSelectedAssessment: vi.fn(),
    });

    render(<AssessmentGradebook />, { wrapper: AppWrapper });
    
    expect(screen.getByTestId('class-select')).toBeInTheDocument();
    expect(screen.getAllByText('Sinif seçin', { selector: 'h3' })[0]).toBeInTheDocument();
  });

  it('sinif seçildikdə qiymətləndirmələr tablarını göstərir', () => {
    // Mock return value for selected class state
    vi.spyOn(useGradebookHook, 'useAssessmentGradebook').mockReturnValue({
        selectedClassId: 1,
        selectedAssessmentId: null,
        viewMode: 'assessments',
        gradeData: {},
        createModalOpen: false,
        newAssessment: {} as any,
        classes: [{ id: 1, name: '10A' } as any],
        assessments: [],
        students: [],
        grades: [],
        assessmentsLoading: false,
        gradesLoading: false,
        createAssessmentMutation: { isPending: false } as any,
        saveGradesMutation: { isPending: false } as any,
        submitAssessmentMutation: { isPending: false } as any,
        setSelectedClassId: vi.fn(),
        setSelectedAssessmentId: vi.fn(),
        setViewMode: vi.fn(),
        setGradeData: vi.fn(),
        setCreateModalOpen: vi.fn(),
        setNewAssessment: vi.fn(),
        refetchAssessments: vi.fn(),
        refetchGrades: vi.fn(),
        handleCreateAssessment: vi.fn(),
        handleSaveGrades: vi.fn(),
        handleSubmitAssessment: vi.fn(),
        updateGrade: vi.fn(),
        getAssessmentTypeText: vi.fn(),
        getGradeColor: vi.fn(),
        getGradeLetter: vi.fn(),
        calculateClassAverage: vi.fn(),
        getSelectedAssessment: vi.fn(),
    });

    render(<AssessmentGradebook />, { wrapper: AppWrapper });
    
    expect(screen.getByTestId('assessments-tab')).toBeInTheDocument();
    expect(screen.getByTestId('grades-tab')).toBeInTheDocument();
    expect(screen.getByTestId('new-assessment-btn')).toBeInTheDocument();
  });
});
