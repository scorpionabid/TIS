import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.hoisted() ensures these run before any imports
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const apiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  return { apiClient };
});

vi.mock('@/services/api', () => ({
  apiClient: mocks.apiClient,
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

import { gradeService, type Grade, type GradeCreateData, type GradeFilters } from '@/services/grades';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockGrade: Grade = {
  id: 1,
  name: 'A',
  full_name: '5A',
  display_name: '5A sinfi',
  class_level: 5,
  academic_year_id: 10,
  institution_id: 20,
  student_count: 25,
  male_student_count: 12,
  female_student_count: 13,
  is_active: true,
  capacity_status: 'available',
  utilization_rate: 83,
  available_spots: 5,
  created_at: '2025-09-01T00:00:00Z',
  updated_at: '2025-09-01T00:00:00Z',
};

const mockInactiveGrade: Grade = {
  ...mockGrade,
  id: 2,
  name: 'B',
  full_name: '5B',
  is_active: false,
  deactivated_at: '2025-12-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Helper: reset all mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  mocks.apiClient.get.mockReset();
  mocks.apiClient.post.mockReset();
  mocks.apiClient.put.mockReset();
  mocks.apiClient.delete.mockReset();
});

// ===========================================================================
// GradeService
// ===========================================================================
describe('GradeService', () => {

  // -------------------------------------------------------------------------
  // get() — response format parsing
  // -------------------------------------------------------------------------
  describe('get() — response format parsing', () => {
    it('{ data: { grades: [] } } formatını parse edir', async () => {
      mocks.apiClient.get.mockResolvedValue({
        data: { grades: [mockGrade], pagination: { total: 1, per_page: 20, current_page: 1, last_page: 1 } },
      });

      const result = await gradeService.get();

      expect(result.items).toEqual([mockGrade]);
      expect(result.pagination?.total).toBe(1);
    });

    it('ikiqat nested { data: { data: { grades: [] } } } formatını idarə edir', async () => {
      mocks.apiClient.get.mockResolvedValue({
        data: { data: { grades: [mockGrade], pagination: null } },
      });

      const result = await gradeService.get();

      expect(result.items).toEqual([mockGrade]);
    });

    it('birbaşa array cavabını idarə edir', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: [mockGrade] });

      const result = await gradeService.get();

      expect(result.items).toEqual([mockGrade]);
      expect(result.pagination).toBeNull();
    });

    it('boş / gözlənilməz cavabda boş array qaytarır', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: null });

      const result = await gradeService.get();

      expect(result.items).toEqual([]);
      expect(result.pagination).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getGrades() — URL param building
  // -------------------------------------------------------------------------
  describe('getGrades() — URL param building', () => {
    it('filter olmadan /grades URL-inə müraciət edir', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { grades: [] } });

      await gradeService.getGrades();

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/grades');
    });

    it('boolean filterləri 1/0-a çevirir', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { grades: [] } });

      await gradeService.getGrades({ has_room: false, has_teacher: true } as GradeFilters);

      const calledUrl: string = mocks.apiClient.get.mock.calls[0][0];
      expect(calledUrl).toContain('has_room=0');
      expect(calledUrl).toContain('has_teacher=1');
    });

    it('undefined dəyərləri URL-ə əlavə etmir', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { grades: [] } });

      await gradeService.getGrades({ institution_id: undefined, class_level: 5 } as GradeFilters);

      const calledUrl: string = mocks.apiClient.get.mock.calls[0][0];
      expect(calledUrl).not.toContain('institution_id');
      expect(calledUrl).toContain('class_level=5');
    });

    it('is_active=true düzgün param-a çevrilir', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { grades: [] } });

      await gradeService.getGrades({ is_active: true });

      const calledUrl: string = mocks.apiClient.get.mock.calls[0][0];
      expect(calledUrl).toContain('is_active=1');
    });
  });

  // -------------------------------------------------------------------------
  // create() / createGrade()
  // -------------------------------------------------------------------------
  describe('create() / createGrade()', () => {
    const createData: GradeCreateData = {
      name: 'A',
      class_level: 5,
      academic_year_id: 10,
      institution_id: 20,
      student_count: 25,
    };

    it('POST /grades çağırır və yaradılmış Grade-i qaytarır', async () => {
      mocks.apiClient.post.mockResolvedValue({ data: mockGrade });

      const result = await gradeService.create(createData);

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/grades', createData);
      expect(result).toEqual(mockGrade);
    });

    it('createGrade() ApiResponse qaytarır', async () => {
      mocks.apiClient.post.mockResolvedValue({ data: mockGrade, success: true });

      const result = await gradeService.createGrade(createData);

      expect(result.data).toEqual(mockGrade);
    });
  });

  // -------------------------------------------------------------------------
  // update() / updateGrade()
  // -------------------------------------------------------------------------
  describe('update() / updateGrade()', () => {
    it('PUT /grades/{id} çağırır', async () => {
      mocks.apiClient.put.mockResolvedValue({ data: { ...mockGrade, student_count: 30 } });

      const result = await gradeService.update(1, { student_count: 30 });

      expect(mocks.apiClient.put).toHaveBeenCalledWith('/grades/1', { student_count: 30 });
      expect(result.student_count).toBe(30);
    });

    it('is_active:true ilə activate əməliyyatı uğurla keçir', async () => {
      mocks.apiClient.put.mockResolvedValue({ data: { ...mockGrade, is_active: true } });

      await gradeService.update(2, { is_active: true });

      expect(mocks.apiClient.put).toHaveBeenCalledWith('/grades/2', { is_active: true });
    });
  });

  // -------------------------------------------------------------------------
  // deactivate()
  // -------------------------------------------------------------------------
  describe('deactivate()', () => {
    it('POST /grades/{id}/deactivate çağırır', async () => {
      mocks.apiClient.post.mockResolvedValue({ data: null });

      await gradeService.deactivate(1);

      expect(mocks.apiClient.post).toHaveBeenCalledWith('/grades/1/deactivate', { reason: undefined });
    });

    it('reason ilə çağırıldıqda reason ötürür', async () => {
      mocks.apiClient.post.mockResolvedValue({ data: null });

      await gradeService.deactivate(1, 'Tədris ili bitdi');

      expect(mocks.apiClient.post).toHaveBeenCalledWith(
        '/grades/1/deactivate',
        { reason: 'Tədris ili bitdi' },
      );
    });
  });

  // -------------------------------------------------------------------------
  // delete() / deleteGrade()
  // -------------------------------------------------------------------------
  describe('delete()', () => {
    it('DELETE /grades/{id} çağırır', async () => {
      mocks.apiClient.delete.mockResolvedValue({ data: undefined });

      await gradeService.delete(1);

      expect(mocks.apiClient.delete).toHaveBeenCalledWith('/grades/1');
    });
  });

  // -------------------------------------------------------------------------
  // getGradeStudents()
  // -------------------------------------------------------------------------
  describe('getGradeStudents()', () => {
    it('filter olmadan düzgün URL yaradır', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { students: [], pagination: null } });

      await gradeService.getGradeStudents(5);

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/grades/5/students');
    });

    it('filterlərlə sorğu parametrləri əlavə edir', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { students: [], pagination: null } });

      await gradeService.getGradeStudents(5, { status: 'active', page: 2 });

      const calledUrl: string = mocks.apiClient.get.mock.calls[0][0];
      expect(calledUrl).toContain('status=active');
      expect(calledUrl).toContain('page=2');
    });
  });

  // -------------------------------------------------------------------------
  // getStatistics()
  // -------------------------------------------------------------------------
  describe('getStatistics()', () => {
    it('GET /grades/statistics/overview çağırır', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: {} });

      await gradeService.getStatistics();

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/grades/statistics/overview');
    });

    it('institution_id filtri ilə URL-ə param əlavə edir', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: {} });

      await gradeService.getStatistics({ institution_id: 20 });

      const calledUrl: string = mocks.apiClient.get.mock.calls[0][0];
      expect(calledUrl).toContain('institution_id=20');
    });
  });
});
