import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.hoisted() ensures these run before any imports
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const apiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    clearCache: vi.fn(),
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

import { gradeBookService } from '@/services/gradeBook';
import type { GradeBookSession, GradeBookColumn } from '@/services/gradeBook';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockSession: GradeBookSession = {
  id: 1,
  institution_id: 10,
  grade_id: 5,
  subject_id: 20,
  academic_year_id: 1,
  created_by: 1,
  title: null,
  status: 'active',
  created_at: '2025-09-01T00:00:00Z',
  updated_at: '2025-09-01T00:00:00Z',
  grade: { id: 5, name: 'A', class_level: 5 },
  subject: { id: 20, name: 'Riyaziyyat' },
  academic_year: { id: 1, name: '2024-2025' },
  teachers: [],
};

const mockColumn: GradeBookColumn = {
  id: 1,
  grade_book_session_id: 1,
  assessment_type_id: 2,
  assessment_stage_id: null,
  semester: 'I',
  column_label: 'Yarımillik 1',
  assessment_date: '2025-01-15',
  max_score: 100,
  display_order: 1,
  column_type: 'input',
  is_archived: false,
};

// ---------------------------------------------------------------------------
// Helper: reset all mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  mocks.apiClient.get.mockReset();
  mocks.apiClient.post.mockReset();
  mocks.apiClient.put.mockReset();
  mocks.apiClient.patch.mockReset();
  mocks.apiClient.delete.mockReset();
  mocks.apiClient.clearCache.mockReset();
});

// ===========================================================================
// GradeBookService
// ===========================================================================
describe('GradeBookService', () => {

  // -------------------------------------------------------------------------
  // getGradeBooks() — response format normalization
  // -------------------------------------------------------------------------
  describe('getGradeBooks() — response format normalization', () => {
    it('Laravel paginator formatı: { success:true, data: { data:[...], total, ... } }', async () => {
      mocks.apiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            data: [mockSession],
            current_page: 1,
            last_page: 2,
            per_page: 20,
            total: 35,
            from: 1,
            to: 20,
          },
        },
      });

      const result = await gradeBookService.getGradeBooks();

      expect(result.data).toEqual([mockSession]);
      expect(result.meta.total).toBe(35);
      expect(result.meta.current_page).toBe(1);
      expect(result.meta.last_page).toBe(2);
    });

    it('Sadə array formatı: { success:true, data:[...], meta:{} }', async () => {
      mocks.apiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: [mockSession],
          meta: { total: 1 },
        },
      });

      const result = await gradeBookService.getGradeBooks();

      expect(result.data).toEqual([mockSession]);
      expect(result.meta).toEqual({ total: 1 });
    });

    it('Birbaşa paginator formatı: { data:[...], total, current_page }', async () => {
      mocks.apiClient.get.mockResolvedValue({
        data: {
          data: [mockSession],
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: 1,
          from: 1,
          to: 1,
        },
      });

      const result = await gradeBookService.getGradeBooks();

      expect(result.data).toEqual([mockSession]);
      expect(result.meta.total).toBe(1);
    });

    it('Nested paginator formatı: { data: { data: [...] } }', async () => {
      mocks.apiClient.get.mockResolvedValue({
        data: {
          data: {
            data: [mockSession],
            current_page: 1,
            total: 1,
          },
        },
      });

      const result = await gradeBookService.getGradeBooks();

      expect(result.data).toEqual([mockSession]);
    });

    it('Birbaşa array cavabı: [...]', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: [mockSession] });

      const result = await gradeBookService.getGradeBooks();

      expect(result.data).toEqual([mockSession]);
      expect(result.meta).toEqual({});
    });

    it('Gözlənilməz cavabda boş array qaytarır', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: null });

      const result = await gradeBookService.getGradeBooks();

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // getGradeBooks() — parameter passing
  // -------------------------------------------------------------------------
  describe('getGradeBooks() — parametr ötürmə', () => {
    it('GET /grade-books URL-inə müraciət edir', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { success: true, data: [] } });

      await gradeBookService.getGradeBooks();

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/grade-books', {});
    });

    it('institution_id filtri düzgün ötürülür', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { success: true, data: [] } });

      await gradeBookService.getGradeBooks({ institution_id: 10 });

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/grade-books', { institution_id: 10 });
    });

    it('status filtri düzgün ötürülür', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { success: true, data: [] } });

      await gradeBookService.getGradeBooks({ status: 'archived' });

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/grade-books', { status: 'archived' });
    });

    it('birdən çox filtr birlikdə ötürülür', async () => {
      mocks.apiClient.get.mockResolvedValue({ data: { success: true, data: [] } });

      await gradeBookService.getGradeBooks({
        institution_id: 10,
        grade_id: 5,
        status: 'active',
        per_page: 50,
      });

      expect(mocks.apiClient.get).toHaveBeenCalledWith('/grade-books', { institution_id: 10, grade_id: 5, status: 'active', per_page: 50 });
    });
  });

  // -------------------------------------------------------------------------
  // getGradeBook() — response normalization
  // -------------------------------------------------------------------------
  describe('getGradeBook() — cavab normallaşdırma', () => {
    const rawStudentWithStringScore = {
      id: '42',
      student_number: 'S001',
      first_name: 'Əli',
      last_name: 'Əliyev',
      father_name: 'Əli',
      full_name: 'Əliyev Əli Əli',
      teacher_id: null,
      scores: {
        1: { id: 10, score: '85', percentage: '85.0', grade_mark: '5', is_present: true },
      },
    };

    it('{ success:true, data:{...} } formatını parse edir', async () => {
      mocks.apiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            grade_book: mockSession,
            students: [],
            input_columns: [mockColumn],
            calculated_columns: [],
          },
        },
      });

      const result = await gradeBookService.getGradeBook(1);

      expect(result.data.grade_book).toEqual(mockSession);
      expect(result.data.input_columns).toEqual([mockColumn]);
      expect(result.data.students).toEqual([]);
    });

    it('Tələbə score-larını string-dən number-ə çevirir', async () => {
      mocks.apiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            grade_book: mockSession,
            students: [rawStudentWithStringScore],
            input_columns: [],
            calculated_columns: [],
          },
        },
      });

      const result = await gradeBookService.getGradeBook(1);

      const student = result.data.students[0];
      expect(student.id).toBe(42);
      expect(student.scores[1].score).toBe(85);
      expect(student.scores[1].percentage).toBe(85.0);
    });

    it('teacher_id null-dan number-ə normalize edilir', async () => {
      const studentWithTeacher = { ...rawStudentWithStringScore, teacher_id: '50', scores: {} };
      mocks.apiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            grade_book: mockSession,
            students: [studentWithTeacher],
            input_columns: [],
            calculated_columns: [],
          },
        },
      });

      const result = await gradeBookService.getGradeBook(1);

      expect(result.data.students[0].teacher_id).toBe(50);
    });

    it('input_columns boş olduqda columns_by_semester-dən çıxarılır', async () => {
      const inputCol = { ...mockColumn, column_type: 'input' as const };
      const calcCol = { ...mockColumn, id: 2, column_type: 'calculated' as const };
      mocks.apiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            grade_book: mockSession,
            students: [],
            input_columns: [],
            calculated_columns: [],
            columns_by_semester: {
              I: [inputCol, calcCol],
            },
          },
        },
      });

      const result = await gradeBookService.getGradeBook(1);

      expect(result.data.input_columns).toEqual([inputCol]);
      expect(result.data.calculated_columns).toEqual([calcCol]);
    });
  });

  // -------------------------------------------------------------------------
  // Cache invalidation
  // -------------------------------------------------------------------------
  describe('Cache invalidation', () => {
    it('addColumn() sonra gradeBook cache-i təmizlənir', async () => {
      mocks.apiClient.post.mockResolvedValue({ data: { data: mockColumn } });

      await gradeBookService.addColumn(1, {
        assessment_type_id: 2,
        semester: 'I',
        column_label: 'Yarımillik 1',
        assessment_date: '2025-01-15',
      });

      expect(mocks.apiClient.clearCache).toHaveBeenCalledWith('/grade-books/1');
    });

    it('updateColumn() sonra bütün gradeBooks cache-i təmizlənir', async () => {
      mocks.apiClient.patch.mockResolvedValue({ data: { data: mockColumn } });

      await gradeBookService.updateColumn(5, { column_label: 'Yenilənmiş' });

      expect(mocks.apiClient.clearCache).toHaveBeenCalledWith('/grade-books/');
    });

    it('updateCell() sonra bütün gradeBooks cache-i təmizlənir', async () => {
      mocks.apiClient.patch.mockResolvedValue({ data: { data: {} } });

      await gradeBookService.updateCell(10, { score: 85 });

      expect(mocks.apiClient.clearCache).toHaveBeenCalledWith('/grade-books/');
    });

    it('bulkUpdateCells() sonra gradeBook cache-i təmizlənir', async () => {
      mocks.apiClient.post.mockResolvedValue({ data: { message: 'ok', updated_count: 3 } });

      await gradeBookService.bulkUpdateCells(1, { cells: [{ cell_id: 10, score: 90 }] });

      expect(mocks.apiClient.clearCache).toHaveBeenCalledWith('/grade-books/1');
    });

    it('archiveColumn() sonra bütün gradeBooks cache-i təmizlənir', async () => {
      mocks.apiClient.delete.mockResolvedValue({ data: undefined });

      await gradeBookService.archiveColumn(3);

      expect(mocks.apiClient.clearCache).toHaveBeenCalledWith('/grade-books/');
    });
  });

  // -------------------------------------------------------------------------
  // Export methods
  // -------------------------------------------------------------------------
  describe('exportGradeBook()', () => {
    it('GET /grade-books/{id}/export çağırır və blob qaytarır', async () => {
      const mockBlob = new Blob(['excel data'], { type: 'application/vnd.ms-excel' });
      mocks.apiClient.get.mockResolvedValue({ data: mockBlob });

      const result = await gradeBookService.exportGradeBook(1);

      expect(mocks.apiClient.get).toHaveBeenCalledWith(
        '/grade-books/1/export',
        undefined,
        { responseType: 'blob', cache: false },
      );
      expect(result).toBe(mockBlob);
    });

    it('exportTemplate() GET /grade-books/{id}/export-template çağırır', async () => {
      const mockBlob = new Blob(['template'], { type: 'application/vnd.ms-excel' });
      mocks.apiClient.get.mockResolvedValue({ data: mockBlob });

      const result = await gradeBookService.exportTemplate(1);

      expect(mocks.apiClient.get).toHaveBeenCalledWith(
        '/grade-books/1/export-template',
        undefined,
        { responseType: 'blob', cache: false },
        );
      expect(result).toBe(mockBlob);
    });
  });

  // -------------------------------------------------------------------------
  // Helper methods
  // -------------------------------------------------------------------------
  describe('Helper metodlar', () => {
    describe('getScoreColor()', () => {
      it('null üçün gray qaytarır', () => {
        expect(gradeBookService.getScoreColor(null)).toBe('gray');
      });

      it('>=80 üçün green qaytarır', () => {
        expect(gradeBookService.getScoreColor(80)).toBe('green');
        expect(gradeBookService.getScoreColor(100)).toBe('green');
      });

      it('>=60 <80 üçün yellow qaytarır', () => {
        expect(gradeBookService.getScoreColor(60)).toBe('yellow');
        expect(gradeBookService.getScoreColor(79)).toBe('yellow');
      });

      it('<30 üçün red qaytarır', () => {
        expect(gradeBookService.getScoreColor(0)).toBe('red');
        expect(gradeBookService.getScoreColor(29)).toBe('red');
      });
    });

    describe('convertScoreToGrade()', () => {
      it('null üçün null qaytarır', () => {
        expect(gradeBookService.convertScoreToGrade(null)).toBeNull();
      });

      it('>=80 üçün 5 qaytarır', () => {
        expect(gradeBookService.convertScoreToGrade(80)).toBe(5);
        expect(gradeBookService.convertScoreToGrade(100)).toBe(5);
      });

      it('>=60 <80 üçün 4 qaytarır', () => {
        expect(gradeBookService.convertScoreToGrade(60)).toBe(4);
      });

      it('>=30 <60 üçün 3 qaytarır', () => {
        expect(gradeBookService.convertScoreToGrade(30)).toBe(3);
      });

      it('<30 üçün 2 qaytarır', () => {
        expect(gradeBookService.convertScoreToGrade(29)).toBe(2);
        expect(gradeBookService.convertScoreToGrade(0)).toBe(2);
      });
    });
  });
});
