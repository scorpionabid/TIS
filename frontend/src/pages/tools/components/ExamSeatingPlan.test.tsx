import { describe, it, expect } from 'vitest';
import { buildPool, placeStudentsInRoom, calcStats } from './ExamSeatingPlan';

// Mock data helpers
const createStudent = (id: string, utisCode: string, section: string = 'Az'): any => ({
  id,
  utisCode,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  section,
  center: 'Test Center',
  grade: '5',
  schoolName: `School ${utisCode}`,
  gender: 'K',
});

const config: any = {
  id: 'room1',
  name: 'Otaq 1',
  columns: 2,
  rowsPerColumn: 2,
  totalDesks: 4
};

describe('ExamSeatingPlan Algorithm', () => {
  
  describe('buildPool', () => {
    it('should distribute students from the same school evenly', () => {
      const students = [
        createStudent('1', 'SCH01'),
        createStudent('2', 'SCH01'),
        createStudent('3', 'SCH02'),
        createStudent('4', 'SCH02'),
      ];
      
      const pool = buildPool(students, 'A');
      
      // buildPool məqsədi eyni məktəbləri bir-birindən uzaq tutmaqdır.
      // 4 şagird üçün ehtimal olunan sıralama: [SCH01, SCH02, SCH01, SCH02] və ya [SCH02, SCH01, SCH02, SCH01]
      expect(pool[0].utisCode).not.toBe(pool[1].utisCode);
      expect(pool[1].utisCode).not.toBe(pool[2].utisCode);
      expect(pool[2].utisCode).not.toBe(pool[3].utisCode);
    });

    it('should handle section priority in Type C', () => {
      const students = [
        createStudent('1', 'S1', 'Rus'),
        createStudent('2', 'S1', 'Az'),
        createStudent('3', 'S2', 'Rus'),
        createStudent('4', 'S2', 'Az'),
      ];
      
      const pool = buildPool(students, 'C');
      
      // Type C-də Az bölməsi əvvəl gəlməlidir
      expect(pool[0].section).toBe('Az');
      expect(pool[1].section).toBe('Az');
      expect(pool[2].section).toBe('Rus');
      expect(pool[3].section).toBe('Rus');
    });
  });

  describe('placeStudentsInRoom', () => {
    it('should prevent horizontal neighbors from the same school', () => {
      // 2 parta (4 yer), 2 şagird SCH01-dən, 2 şagird SCH02-dən
      const students = [
        createStudent('1', 'SCH01'),
        createStudent('2', 'SCH01'),
        createStudent('3', 'SCH02'),
        createStudent('4', 'SCH02'),
      ];
      
      const seats = placeStudentsInRoom(students, config, 'A', false);
      
      // Hər partada (deskNumber) 2 yer var: Sol və Sağ.
      // Onlar eyni məktəbdən olmamalıdır.
      const desk1 = seats.filter(s => s.deskNumber === 1);
      expect(desk1[0].student?.utisCode).not.toBe(desk1[1].student?.utisCode);

      const desk2 = seats.filter(s => s.deskNumber === 2);
      expect(desk2[0].student?.utisCode).not.toBe(desk2[1].student?.utisCode);
    });

    it('should handle cases where some seats are empty', () => {
      const students = [
        createStudent('1', 'SCH01'),
        createStudent('2', 'SCH01'),
      ];
      
      const seats = placeStudentsInRoom(students, config, 'A', false);
      
      const usedSeats = seats.filter(s => s.student);
      expect(usedSeats.length).toBe(2);
      expect(seats.length).toBe(8); // 4 desks * 2 seats = 8
    });
  });

  describe('calcStats', () => {
    it('should calculate statistics and risk correctly', () => {
      // 1 partada eyni məktəbdən 2 şagird (violation)
      const s1 = createStudent('1', 'SCH01');
      const s2 = createStudent('2', 'SCH01');
      
      const seats: any[] = [
        { seatNumber: 1, deskNumber: 1, position: 'Sol', type: 'CÜT', student: s1 },
        { seatNumber: 2, deskNumber: 1, position: 'Sağ', type: 'CÜT', student: s2 },
        { seatNumber: 3, deskNumber: 2, position: 'Sol', type: 'BOŞ' },
        { seatNumber: 4, deskNumber: 2, position: 'Sağ', type: 'BOŞ' },
      ];
      
      const stats = calcStats(seats, config);
      
      expect(stats.totalStudents).toBe(2);
      expect(stats.utisViolations).toBe(1); // Eyni partada eyni UTIS
      expect(stats.riskScore).toBeGreaterThan(0);
      expect(stats.riskStatus).toBe('Yüksək Risk'); // 1/2 = 50% risk weight, > 40%
    });

    it('should show safe status when no violations exist', () => {
      const s1 = createStudent('1', 'SCH01');
      const s2 = createStudent('2', 'SCH02');
      
      const seats: any[] = [
        { seatNumber: 1, deskNumber: 1, position: 'Sol', type: 'CÜT', student: s1 },
        { seatNumber: 2, deskNumber: 1, position: 'Sağ', type: 'CÜT', student: s2 },
      ];
      
      const stats = calcStats(seats, config);
      expect(stats.utisViolations).toBe(0);
      expect(stats.riskStatus).toBe('Təhlükəsiz');
    });
  });
});
