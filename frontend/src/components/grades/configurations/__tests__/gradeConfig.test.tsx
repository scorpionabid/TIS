import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/services/grades', () => ({
  gradeService: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStatistics: vi.fn(),
    downloadTemplate: vi.fn(),
  },
}));

vi.mock('@/services/students', () => ({
  studentService: { getAll: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

// Shadcn Select → native <select> kimi simulate et (jsdom üçün)
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { gradeCustomLogic, GradeFiltersComponent } from '../gradeConfig';
import type { Grade } from '@/services/grades';

// ---------------------------------------------------------------------------
// Mock Grade builders
// ---------------------------------------------------------------------------
const makeGrade = (overrides: Partial<Grade> = {}): Grade => ({
  id: 1,
  name: 'A',
  full_name: '5A',
  display_name: '5A sinfi',
  class_level: 5,
  academic_year_id: 10,
  institution_id: 20,
  student_count: 25,
  is_active: true,
  room_id: 100,
  homeroom_teacher_id: 200,
  capacity_status: 'available',
  utilization_rate: 75,
  available_spots: 5,
  created_at: '2025-09-01T00:00:00Z',
  updated_at: '2025-09-01T00:00:00Z',
  ...overrides,
});

// ===========================================================================
// gradeCustomLogic — pure function tests
// ===========================================================================
describe('gradeCustomLogic.validateCreateData()', () => {
  it('boş ad üçün xəta qaytarır', () => {
    const result = gradeCustomLogic.validateCreateData({
      name: '',
      class_level: 5,
      academic_year_id: 10,
      institution_id: 20,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('kiçik hərf ad üçün xəta qaytarır', () => {
    const result = gradeCustomLogic.validateCreateData({
      name: 'a',
      class_level: 5,
      academic_year_id: 10,
      institution_id: 20,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('çox simvollu ad üçün xəta qaytarır ("AB" keçmir)', () => {
    const result = gradeCustomLogic.validateCreateData({
      name: 'AB',
      class_level: 5,
      academic_year_id: 10,
      institution_id: 20,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('class_level 0 üçün xəta qaytarır', () => {
    const result = gradeCustomLogic.validateCreateData({
      name: 'A',
      class_level: 0,
      academic_year_id: 10,
      institution_id: 20,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.class_level).toBeDefined();
  });

  it('class_level 13 üçün xəta qaytarır', () => {
    const result = gradeCustomLogic.validateCreateData({
      name: 'A',
      class_level: 13,
      academic_year_id: 10,
      institution_id: 20,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.class_level).toBeDefined();
  });

  it('academic_year_id=0 üçün xəta qaytarır', () => {
    const result = gradeCustomLogic.validateCreateData({
      name: 'A',
      class_level: 5,
      academic_year_id: 0,
      institution_id: 20,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.academic_year_id).toBeDefined();
  });

  it('düzgün data üçün isValid=true qaytarır', () => {
    const result = gradeCustomLogic.validateCreateData({
      name: 'B',
      class_level: 10,
      academic_year_id: 1,
      institution_id: 5,
    });
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe('gradeCustomLogic.getCapacityWarnings()', () => {
  it('room_id yoxdursa "Otaq təyin edilməyib" qaytarır', () => {
    const grade = makeGrade({ room_id: undefined });
    expect(gradeCustomLogic.getCapacityWarnings(grade)).toContain('Otaq təyin edilməyib');
  });

  it('homeroom_teacher_id yoxdursa "Sinif rəhbəri" xəbərdarlığı qaytarır', () => {
    const grade = makeGrade({ homeroom_teacher_id: undefined });
    expect(gradeCustomLogic.getCapacityWarnings(grade)).toContain('Sinif rəhbəri təyin edilməyib');
  });

  it('over_capacity statusunda xəbərdarlıq qaytarır', () => {
    const grade = makeGrade({ capacity_status: 'over_capacity' });
    expect(gradeCustomLogic.getCapacityWarnings(grade)).toContain('Sinif həddindən çox doludur');
  });

  it('tam dolu sinif üçün boş array qaytarır', () => {
    const grade = makeGrade({
      room_id: 100,
      homeroom_teacher_id: 200,
      capacity_status: 'available',
      utilization_rate: 80,
    });
    expect(gradeCustomLogic.getCapacityWarnings(grade)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe('gradeCustomLogic.getStatusColor()', () => {
  it('deaktiv sinif üçün muted rəng qaytarır', () => {
    const grade = makeGrade({ is_active: false });
    expect(gradeCustomLogic.getStatusColor(grade)).toBe('text-muted-foreground');
  });

  it('over_capacity üçün red qaytarır', () => {
    const grade = makeGrade({ capacity_status: 'over_capacity' });
    expect(gradeCustomLogic.getStatusColor(grade)).toBe('text-red-600');
  });

  it('aktiv normal sinif üçün green qaytarır', () => {
    const grade = makeGrade({ capacity_status: 'available' });
    expect(gradeCustomLogic.getStatusColor(grade)).toBe('text-green-600');
  });
});

// ---------------------------------------------------------------------------
describe('gradeCustomLogic.getSortValue()', () => {
  it('"name" key-i üçün lowercase string qaytarır', () => {
    const grade = makeGrade({ name: 'B' });
    expect(gradeCustomLogic.getSortValue(grade, 'name')).toBe('b');
  });

  it('"class_level" key-i üçün rəqəm qaytarır', () => {
    const grade = makeGrade({ class_level: 7 });
    expect(gradeCustomLogic.getSortValue(grade, 'class_level')).toBe(7);
  });

  it('"student_count" key-i üçün rəqəm qaytarır', () => {
    const grade = makeGrade({ student_count: 30 });
    expect(gradeCustomLogic.getSortValue(grade, 'student_count')).toBe(30);
  });

  it('bilinməyən key üçün boş string qaytarır', () => {
    const grade = makeGrade();
    expect(gradeCustomLogic.getSortValue(grade, 'unknown_field')).toBe('');
  });
});

// ===========================================================================
// GradeFiltersComponent — render tests
// ===========================================================================
describe('GradeFiltersComponent', () => {
  const defaultProps = {
    filters: {},
    onFiltersChange: vi.fn(),
    availableInstitutions: [],
    availableAcademicYears: [],
  };

  beforeEach(() => {
    defaultProps.onFiltersChange.mockReset();
  });

  it('Status, Otaq, Müəllim, Sinif səviyyəsi select-ləri render olunur', () => {
    render(<GradeFiltersComponent {...defaultProps} />);
    // 4 select olmalıdır: class_level, has_room, has_teacher, is_active
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBeGreaterThanOrEqual(4);
  });

  it('availableInstitutions boş olduqda institution filter görünmür', () => {
    render(<GradeFiltersComponent {...defaultProps} availableInstitutions={[]} />);
    // institution filter olmamalı — sadəcə digər filterlər var
    const selects = screen.getAllByTestId('select');
    // 4 filter: class_level + has_room + has_teacher + is_active
    expect(selects).toHaveLength(4);
  });

  it('2 institution olduqda institution filter görünür', () => {
    const props = {
      ...defaultProps,
      availableInstitutions: [
        { id: 1, name: 'Məktəb 1' },
        { id: 2, name: 'Məktəb 2' },
      ],
    };
    render(<GradeFiltersComponent {...props} />);
    // 5 filter: institution + class_level + has_room + has_teacher + is_active
    const selects = screen.getAllByTestId('select');
    expect(selects).toHaveLength(5);
  });

  it('academic year filter olduqda görünür', () => {
    const props = {
      ...defaultProps,
      availableAcademicYears: [
        { id: 1, name: '2024-2025', is_active: true },
      ],
    };
    render(<GradeFiltersComponent {...props} />);
    // 5 filter: academic_year + class_level + has_room + has_teacher + is_active
    const selects = screen.getAllByTestId('select');
    expect(selects).toHaveLength(5);
  });

  it('Status filter dəyişdikdə onFiltersChange page=1 ilə çağırılır', () => {
    render(<GradeFiltersComponent {...defaultProps} filters={{ is_active: true }} />);

    const selects = screen.getAllByTestId('select');
    // Sonuncu select is_active-dir
    const statusSelect = selects[selects.length - 1];
    fireEvent.change(statusSelect, { target: { value: 'false' } });

    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false, page: 1 }),
    );
  });

  it('class_level seçildikdə onFiltersChange rəqəm ilə çağırılır', () => {
    render(<GradeFiltersComponent {...defaultProps} />);

    const selects = screen.getAllByTestId('select');
    // İlk select class_level-dir (institution yoxdursa)
    fireEvent.change(selects[0], { target: { value: '7' } });

    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ class_level: 7 }),
    );
  });

  it('boş dəyər seçildikdə filter undefined olur', () => {
    render(
      <GradeFiltersComponent
        {...defaultProps}
        filters={{ has_room: true }}
      />,
    );

    const selects = screen.getAllByTestId('select');
    // İkinci select has_room-dur
    fireEvent.change(selects[1], { target: { value: '' } });

    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ has_room: undefined }),
    );
  });
});
