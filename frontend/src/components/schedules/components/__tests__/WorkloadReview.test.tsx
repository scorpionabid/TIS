import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkloadReview } from '../WorkloadReview';
import { WorkloadData } from '../../ScheduleBuilder';

const mockWorkloadData: WorkloadData = {
  institution: {
    id: 1,
    name: 'Test School',
    type: 'school'
  },
  academic_year_id: 1,
  settings: {
    working_days: [1, 2, 3, 4, 5],
    daily_periods: 7,
    period_duration: 45,
    break_periods: [3, 6],
    lunch_break_period: 4,
    first_period_start: '08:00',
    break_duration: 10,
    lunch_duration: 60
  },
  teaching_loads: [
    {
      id: 1,
      teacher: {
        id: 1,
        name: 'Mahmud Əliyev',
        email: 'mahmud@test.com'
      },
      subject: {
        id: 1,
        name: 'Riyaziyyat',
        code: 'RZ'
      },
      class: {
        id: 1,
        name: '9-A',
        grade_level: 9
      },
      weekly_hours: 4,
      priority_level: 8,
      preferred_consecutive_hours: 2,
      preferred_time_slots: [],
      unavailable_periods: [],
      distribution_pattern: {},
      ideal_distribution: [
        { day: 1, lessons: 1 },
        { day: 3, lessons: 2 },
        { day: 5, lessons: 1 }
      ],
      constraints: {}
    },
    {
      id: 2,
      teacher: {
        id: 2,
        name: 'Leyla Həsənova',
        email: 'leyla@test.com'
      },
      subject: {
        id: 2,
        name: 'Azərbaycan dili',
        code: 'AD'
      },
      class: {
        id: 2,
        name: '10-B',
        grade_level: 10
      },
      weekly_hours: 3,
      priority_level: 9,
      preferred_consecutive_hours: 1,
      preferred_time_slots: [],
      unavailable_periods: [],
      distribution_pattern: {},
      ideal_distribution: [
        { day: 2, lessons: 1 },
        { day: 4, lessons: 2 }
      ],
      constraints: {}
    }
  ],
  time_slots: [
    {
      period_number: 1,
      start_time: '08:00',
      end_time: '08:45',
      duration: 45,
      is_break: false,
      slot_type: 'lesson'
    }
  ],
  validation: {
    is_valid: true,
    errors: [],
    warnings: [],
    total_hours: 7,
    teacher_hours: {
      '1': 4,
      '2': 3
    },
    loads_count: 2
  },
  statistics: {
    total_loads: 2,
    total_weekly_hours: 7,
    unique_teachers: 2,
    unique_subjects: 2,
    unique_classes: 2,
    average_hours_per_teacher: 3.5,
    max_hours_per_teacher: 4,
    min_hours_per_teacher: 3
  },
  ready_for_generation: true
};

const mockInvalidWorkloadData: WorkloadData = {
  ...mockWorkloadData,
  validation: {
    is_valid: false,
    errors: ['Müəllim Mahmud Əliyev həftəlik maksimum saat həddini aşır (26 > 25)'],
    warnings: ['Leyla Həsənova yüksək iş yükü'],
    total_hours: 29,
    teacher_hours: {
      '1': 26,
      '2': 3
    },
    loads_count: 2
  },
  ready_for_generation: false
};

describe('WorkloadReview', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully with valid workload data', () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Dərs Yükü Baxışı')).toBeInTheDocument();
    expect(screen.getByText('Cədvəl yaratmadan əvvəl dərs yüklərini nəzərdən keçirin')).toBeInTheDocument();
  });

  it('shows validation success message for valid data', () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Dərs yükü məlumatları cədvəl yaratmaq üçün hazırdır')).toBeInTheDocument();
  });

  it('shows validation errors for invalid data', () => {
    render(
      <WorkloadReview
        workloadData={mockInvalidWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Dərs yükü məlumatlarında problemlər aşkarlandı:')).toBeInTheDocument();
    expect(screen.getByText('Müəllim Mahmud Əliyev həftəlik maksimum saat həddini aşır (26 > 25)')).toBeInTheDocument();
  });

  it('displays correct statistics', () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    const teachersLabel = screen.getAllByText('Müəllimlər').find(node => node.tagName === 'P');
    expect(teachersLabel).toBeDefined();
    const teachersValue = teachersLabel?.parentElement?.querySelector('p:nth-of-type(2)');
    expect(teachersValue?.textContent).toBe(String(mockWorkloadData.statistics.unique_teachers));

    const hoursLabel = screen.getAllByText('Həftəlik Saat').find(node => node.tagName === 'P');
    expect(hoursLabel).toBeDefined();
    const hoursValue = hoursLabel?.parentElement?.querySelector('p:nth-of-type(2)');
    expect(hoursValue?.textContent).toBe(String(mockWorkloadData.statistics.total_weekly_hours));
  });

  it('switches between tabs correctly', async () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    // Click on Details tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Təfərrüatlı' }));
    
    await screen.findByText('Dərs Yükləri');
    expect(screen.getByText('2 yük')).toBeInTheDocument();

    // Click on Teachers tab
    await user.click(screen.getByRole('tab', { name: 'Müəllimlər' }));
    
    await screen.findByText('Müəllim Yük Analizi');
  });

  it('displays teaching loads correctly', async () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    // Switch to details tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Təfərrüatlı' }));

    expect(await screen.findByText('Mahmud Əliyev')).toBeInTheDocument();
    expect(screen.getByText('Riyaziyyat')).toBeInTheDocument();
    expect(screen.getByText(/Sinif: 9-A/)).toBeInTheDocument();
    expect(screen.getByText(/4 saat\/həftə/)).toBeInTheDocument();
  });

  it('shows teacher workload analysis', async () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    // Switch to teachers tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Müəllimlər' }));

    expect(await screen.findByText('Mahmud Əliyev')).toBeInTheDocument();
    expect(screen.getByText('mahmud@test.com')).toBeInTheDocument();
    expect(screen.getByText('4h')).toBeInTheDocument();
    expect(screen.getAllByText('/ 25h maksimum').length).toBeGreaterThan(0);
  });

  it('detects teacher overload', async () => {
    const overloadedData = {
      ...mockWorkloadData,
      teaching_loads: [{
        ...mockWorkloadData.teaching_loads[0],
        weekly_hours: 26
      }]
    };

    render(
      <WorkloadReview
        workloadData={overloadedData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    // Switch to teachers tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Müəllimlər' }));

    expect(await screen.findByText('Hədd aşıldı')).toBeInTheDocument();
  });

  it('shows ideal distribution for teaching loads', async () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    // Switch to details tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Təfərrüatlı' }));

    expect(screen.getByText('B.E: 1')).toBeInTheDocument();
    expect(screen.getByText('Çər: 2')).toBeInTheDocument();
    expect(screen.getByText('Cümə: 1')).toBeInTheDocument();
  });

  it('calls onNext when Continue button is clicked with valid data', () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    fireEvent.click(screen.getByText('Davam et'));
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('disables Continue button with invalid data', () => {
    render(
      <WorkloadReview
        workloadData={mockInvalidWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    const continueButton = screen.getByText('Problemləri həll edin');
    expect(continueButton).toBeDisabled();
  });

  it('calls onBack when Back button is clicked', () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    fireEvent.click(screen.getByText('Geri'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('displays warnings when present', async () => {
    const dataWithWarnings = {
      ...mockWorkloadData,
      validation: {
        ...mockWorkloadData.validation,
        warnings: ['Leyla Həsənova yüksək iş yükü']
      }
    };

    render(
      <WorkloadReview
        workloadData={dataWithWarnings}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    // Switch to teachers tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Müəllimlər' }));

    expect(await screen.findByText('Xəbərdarlıqlar:')).toBeInTheDocument();
    expect(screen.getByText('Leyla Həsənova yüksək iş yükü')).toBeInTheDocument();
  });

  it('calculates workload percentage correctly', async () => {
    render(
      <WorkloadReview
        workloadData={mockWorkloadData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    // Switch to teachers tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Müəllimlər' }));

    // For 4 hours out of 25 maximum: (4/25)*100 = 16%
    expect(await screen.findByText('16%')).toBeInTheDocument();
  });

  it('handles empty teaching loads gracefully', () => {
    const emptyData = {
      ...mockWorkloadData,
      teaching_loads: [],
      statistics: {
        ...mockWorkloadData.statistics,
        total_loads: 0,
        unique_teachers: 0
      }
    };

    render(
      <WorkloadReview
        workloadData={emptyData}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );

    const teachersLabel = screen.getAllByText('Müəllimlər').find(node => node.tagName === 'P');
    expect(teachersLabel).toBeDefined();
    const teachersValue = teachersLabel?.parentElement?.querySelector('p:nth-of-type(2)');
    expect(teachersValue?.textContent).toBe('0');
  });
});
