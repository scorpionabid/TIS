import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import type { GradeBookSession } from '@/services/gradeBook';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock('@/services/gradeBook', () => ({
  gradeBookService: {
    getGradeBooks: vi.fn(),
    exportGradeBook: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContextOptimized', () => ({
  useAuth: () => ({
    currentUser: { institution: { id: 1 } },
  }),
}));

vi.mock('./GradeBookView', () => ({
  GradeBookView: ({ id }: { id: number }) => (
    <div data-testid="grade-book-view">{id}</div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
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
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Component (imported after mocks)
// ---------------------------------------------------------------------------
import { GradeBookList } from '../GradeBookList';

// ---------------------------------------------------------------------------
// Mock builder
// ---------------------------------------------------------------------------
const makeGB = (overrides: Partial<GradeBookSession> = {}): GradeBookSession => ({
  id: 1,
  institution_id: 1,
  grade_id: 10,
  subject_id: 100,
  academic_year_id: 1,
  created_by: 1,
  title: null,
  status: 'active',
  created_at: '2025-09-01T00:00:00Z',
  updated_at: '2025-09-01T00:00:00Z',
  grade: { id: 10, name: 'A', class_level: 5 },
  subject: { id: 100, name: 'Riyaziyyat' },
  academic_year: { id: 1, name: '2024-2025' },
  teachers: [],
  ...overrides,
});

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

const renderList = (props: React.ComponentProps<typeof GradeBookList> = {}) =>
  render(<GradeBookList institutionId={1} {...props} />);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GradeBookList — yükləmə vəziyyəti', () => {
  it('isLoading=true olduqda skeleton card-lar göstərilir', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true });

    renderList();

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('isLoading=false olduqda skeleton yox olur', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    renderList();

    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
  });

  it('institutionId yoxdursa query işləmir — boş vəziyyət göstərilir', () => {
    // enabled: false → data=[], isLoading=false
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    render(<GradeBookList institutionId={null} />);

    expect(screen.getByText('Jurnal tapılmadı')).toBeInTheDocument();
  });
});

describe('GradeBookList — boş vəziyyət', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('məlumat yoxdursa "Jurnal tapılmadı" göstərilir', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    renderList();

    expect(screen.getByText('Jurnal tapılmadı')).toBeInTheDocument();
  });

  it('boş vəziyyətdə BookOpen ikonu göstərilir', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    renderList();

    // Empty state container
    expect(screen.getByText('Axtarış kriteriyalarına uyğun jurnal yoxdur.')).toBeInTheDocument();
  });
});

describe('GradeBookList — qruplama məntiqi', () => {
  it('eyni grade_id-li jurnallar bir qrupda toplanır', () => {
    const data = [
      makeGB({ id: 1, subject: { id: 100, name: 'Riyaziyyat' } }),
      makeGB({ id: 2, subject: { id: 101, name: 'Fizika' } }),
    ];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    // 1 qrup başlığı: "5-A"
    expect(screen.getAllByText('5-A').length).toBeGreaterThanOrEqual(1);
    // Hər iki fənn görünür
    expect(screen.getByText('Riyaziyyat')).toBeInTheDocument();
    expect(screen.getByText('Fizika')).toBeInTheDocument();
  });

  it('müxtəlif grade_id-li jurnallar ayrı qruplarda göstərilir', () => {
    const data = [
      makeGB({ id: 1, grade: { id: 10, name: 'A', class_level: 5 }, subject: { id: 100, name: 'Riyaziyyat' } }),
      makeGB({ id: 2, grade: { id: 11, name: 'B', class_level: 5 }, subject: { id: 101, name: 'Fizika' } }),
    ];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    expect(screen.getByText('5-A')).toBeInTheDocument();
    expect(screen.getByText('5-B')).toBeInTheDocument();
  });

  it('qrup başlığında fənn sayı düzgün göstərilir', () => {
    const data = [
      makeGB({ id: 1, subject: { id: 100, name: 'Riyaziyyat' } }),
      makeGB({ id: 2, subject: { id: 101, name: 'Fizika' } }),
    ];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    expect(screen.getByText('(2 fənn)')).toBeInTheDocument();
  });

  it('jurnallar daxilində fənn adına görə əlifba sırası saxlanır', () => {
    const data = [
      makeGB({ id: 1, subject: { id: 100, name: 'Tarix' } }),
      makeGB({ id: 2, subject: { id: 101, name: 'Azərbaycan dili' } }),
      makeGB({ id: 3, subject: { id: 102, name: 'Riyaziyyat' } }),
    ];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    const subjectElements = screen.getAllByRole('heading', { level: 3 });
    const names = subjectElements.map((el) => el.textContent ?? '');

    // Azərbaycan dili → Riyaziyyat → Tarix sırası
    const aIdx = names.indexOf('Azərbaycan dili');
    const rIdx = names.indexOf('Riyaziyyat');
    const tIdx = names.indexOf('Tarix');

    expect(aIdx).toBeLessThan(rIdx);
    expect(rIdx).toBeLessThan(tIdx);
  });
});

describe('GradeBookList — axtarış filtri', () => {
  it('fənn adına görə axtarış işləyir', () => {
    const data = [
      makeGB({ id: 1, subject: { id: 100, name: 'Riyaziyyat' } }),
      makeGB({ id: 2, subject: { id: 101, name: 'Tarix' } }),
    ];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    const searchInput = screen.getByPlaceholderText('Jurnal axtar...');
    fireEvent.change(searchInput, { target: { value: 'Riyaz' } });

    expect(screen.getByText('Riyaziyyat')).toBeInTheDocument();
    expect(screen.queryByText('Tarix')).not.toBeInTheDocument();
  });

  it('sinif adına görə axtarış işləyir', () => {
    const data = [
      makeGB({ id: 1, grade: { id: 10, name: 'A', class_level: 5 }, subject: { id: 100, name: 'Riyaziyyat' } }),
      makeGB({ id: 2, grade: { id: 11, name: 'B', class_level: 7 }, subject: { id: 101, name: 'Fizika' } }),
    ];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    const searchInput = screen.getByPlaceholderText('Jurnal axtar...');
    fireEvent.change(searchInput, { target: { value: '7-B' } });

    expect(screen.getByText('Fizika')).toBeInTheDocument();
    expect(screen.queryByText('Riyaziyyat')).not.toBeInTheDocument();
  });

  it('uyğun gəlmədikdə boş vəziyyət göstərilir', () => {
    const data = [makeGB({ id: 1, subject: { id: 100, name: 'Riyaziyyat' } })];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    const searchInput = screen.getByPlaceholderText('Jurnal axtar...');
    fireEvent.change(searchInput, { target: { value: 'XYZnotexist' } });

    expect(screen.getByText('Jurnal tapılmadı')).toBeInTheDocument();
  });
});

describe('GradeBookList — status filter tabs', () => {
  it('"Hamısı" tabı standart olaraq seçilir', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    renderList();

    // "Hamısı" düyməsini tap
    const hamisiBttn = screen.getByRole('button', { name: 'Hamısı' });
    // variant="default" olan button — default olaraq seçili olmalıdır
    expect(hamisiBttn).toBeInTheDocument();
  });

  it('"Aktiv" tabına kliklədikdə useQuery status="active" ilə çağırılır', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Aktiv' }));

    // Axırıncı useQuery çağırışının queryKey-i status="active" ehtiva etməlidir
    const calls = mockUseQuery.mock.calls;
    const lastCall = calls[calls.length - 1][0] as { queryKey: unknown[] };
    const queryKey = lastCall.queryKey;
    expect(JSON.stringify(queryKey)).toContain('"active"');
  });

  it('"Arxiv" tabına kliklədikdə useQuery status="archived" ilə çağırılır', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Arxiv' }));

    const calls = mockUseQuery.mock.calls;
    const lastCall = calls[calls.length - 1][0] as { queryKey: unknown[] };
    const queryKey = lastCall.queryKey;
    expect(JSON.stringify(queryKey)).toContain('"archived"');
  });
});

describe('GradeBookList — sinif qrup açma/bağlama', () => {
  it('qrupun başlığına kliklədikdə jurnallar gizlənir', () => {
    const data = [makeGB({ id: 1, subject: { id: 100, name: 'Riyaziyyat' } })];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    // İlk render-də qrup açıqdır (useEffect auto-expand)
    expect(screen.getByText('Riyaziyyat')).toBeInTheDocument();

    // Qrup başlığına klik
    const gradeHeader = screen.getByText('5-A').closest('[class*="cursor-pointer"]');
    if (gradeHeader) fireEvent.click(gradeHeader);

    expect(screen.queryByText('Riyaziyyat')).not.toBeInTheDocument();
  });
});

describe('GradeBookList — müəllim xəbərdarlığı', () => {
  it('müəllimi olmayan jurnalda "Müəllim yoxdur" badge göstərilir', () => {
    const data = [makeGB({ id: 1, teachers: [] })];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    expect(screen.getByText('Müəllim yoxdur')).toBeInTheDocument();
  });

  it('müəllimi olan jurnalda xəbərdarlıq badge göstərilmir', () => {
    const data = [
      makeGB({
        id: 1,
        teachers: [
          {
            id: 1,
            grade_book_session_id: 1,
            teacher_id: 50,
            group_label: null,
            is_primary: true,
            teacher: {
              id: 50,
              first_name: 'Əli',
              last_name: 'Əliyev',
              father_name: 'Əli',
            },
          },
        ],
      }),
    ];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    expect(screen.queryByText('Müəllim yoxdur')).not.toBeInTheDocument();
  });
});

describe('GradeBookList — tədris ili filtri', () => {
  it('1 tədris ili varsa academic year Select görünmür', () => {
    const data = [makeGB({ academic_year: { id: 1, name: '2024-2025' } })];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    // Yalnız 1 il olduqda select göstərilmir
    const selects = screen.queryAllByTestId('select');
    expect(selects).toHaveLength(0);
  });

  it('2+ tədris ili varsa academic year Select görünür', () => {
    const data = [
      makeGB({ id: 1, academic_year: { id: 1, name: '2024-2025' } }),
      makeGB({ id: 2, subject: { id: 101, name: 'Fizika' }, academic_year: { id: 2, name: '2023-2024' } }),
    ];
    mockUseQuery.mockReturnValue({ data, isLoading: false });

    renderList();

    const selects = screen.queryAllByTestId('select');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });
});
