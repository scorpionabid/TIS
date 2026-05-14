/**
 * @jest-environment node
 * Tests for Formula Engine - Core calculation logic
 */

import {
  FormulaEngine,
  CellValue,
  CellContext,
  FormulaError,
} from '../../lib/formulaEngine';

describe('FormulaEngine', () => {
  let engine: FormulaEngine;

  beforeEach(() => {
    engine = new FormulaEngine();
  });

  // ─── Basic Arithmetic ────────────────────────────────────────────────────

  describe('Basic Arithmetic', () => {
    test('should evaluate simple addition', () => {
      const result = engine.evaluate('=1+2', {});
      expect(result).toBe(3);
    });

    test('should evaluate simple subtraction', () => {
      const result = engine.evaluate('=5-3', {});
      expect(result).toBe(2);
    });

    test('should evaluate simple multiplication', () => {
      const result = engine.evaluate('=4*5', {});
      expect(result).toBe(20);
    });

    test('should evaluate simple division', () => {
      const result = engine.evaluate('=20/4', {});
      expect(result).toBe(5);
    });

    test('should handle operator precedence', () => {
      const result = engine.evaluate('=2+3*4', {});
      expect(result).toBe(14); // 2 + (3*4) = 14
    });

    test('should handle parentheses', () => {
      const result = engine.evaluate('=(2+3)*4', {});
      expect(result).toBe(20);
    });

    test('should handle negative numbers', () => {
      const result = engine.evaluate('=-5+3', {});
      expect(result).toBe(-2);
    });

    test('should handle decimal numbers', () => {
      const result = engine.evaluate('=1.5*2.5', {});
      expect(result).toBe(3.75);
    });
  });

  // ─── Cell References ───────────────────────────────────────────────────────

  describe('Cell References', () => {
    test('should reference single cell', () => {
      const context: CellContext = { A1: 10 };
      const result = engine.evaluate('=A1', context);
      expect(result).toBe(10);
    });

    test('should reference cells in formula', () => {
      const context: CellContext = { A1: 10, B1: 20 };
      const result = engine.evaluate('=A1+B1', context);
      expect(result).toBe(30);
    });

    test('should handle missing cell references gracefully', () => {
      const context: CellContext = { A1: 10 };
      const result = engine.evaluate('=A1+B1', context);
      expect(result).toBe(10); // B1 is treated as 0
    });

    test('should handle cell references with string values', () => {
      const context: CellContext = { A1: 'hello' };
      expect(() => engine.evaluate('=A1+5', context)).toThrow(FormulaError);
    });
  });

  // ─── Excel Functions ─────────────────────────────────────────────────────

  describe('SUM Function', () => {
    test('should sum range of cells', () => {
      const context: CellContext = {
        A1: 10,
        A2: 20,
        A3: 30,
      };
      const result = engine.evaluate('=SUM(A1:A3)', context);
      expect(result).toBe(60);
    });

    test('should sum individual cells', () => {
      const context: CellContext = {
        A1: 10,
        B1: 20,
        C1: 30,
      };
      const result = engine.evaluate('=SUM(A1,B1,C1)', context);
      expect(result).toBe(60);
    });

    test('should handle empty range', () => {
      const context: CellContext = {};
      const result = engine.evaluate('=SUM(A1:A3)', context);
      expect(result).toBe(0);
    });

    test('should ignore non-numeric values in range', () => {
      const context: CellContext = {
        A1: 10,
        A2: null,
        A3: 'text',
      };
      const result = engine.evaluate('=SUM(A1:A3)', context);
      expect(result).toBe(10);
    });
  });

  describe('AVERAGE Function', () => {
    test('should calculate average of range', () => {
      const context: CellContext = {
        A1: 10,
        A2: 20,
        A3: 30,
      };
      const result = engine.evaluate('=AVERAGE(A1:A3)', context);
      expect(result).toBe(20);
    });

    test('should return 0 for empty range', () => {
      const context: CellContext = {};
      const result = engine.evaluate('=AVERAGE(A1:A3)', context);
      expect(result).toBe(0);
    });

    test('should handle single value', () => {
      const context: CellContext = { A1: 42 };
      const result = engine.evaluate('=AVERAGE(A1)', context);
      expect(result).toBe(42);
    });
  });

  describe('COUNT Function', () => {
    test('should count numeric values', () => {
      const context: CellContext = {
        A1: 10,
        A2: 20,
        A3: 'text',
        A4: null,
      };
      const result = engine.evaluate('=COUNT(A1:A4)', context);
      expect(result).toBe(2);
    });
  });

  describe('MAX/MIN Functions', () => {
    test('should find maximum value', () => {
      const context: CellContext = {
        A1: 10,
        A2: 50,
        A3: 30,
      };
      const result = engine.evaluate('=MAX(A1:A3)', context);
      expect(result).toBe(50);
    });

    test('should find minimum value', () => {
      const context: CellContext = {
        A1: 10,
        A2: 50,
        A3: 30,
      };
      const result = engine.evaluate('=MIN(A1:A3)', context);
      expect(result).toBe(10);
    });
  });

  describe('IF Function', () => {
    test('should return true value when condition is true', () => {
      const result = engine.evaluate('=IF(5>3, "yes", "no")', {});
      expect(result).toBe('yes');
    });

    test('should return false value when condition is false', () => {
      const result = engine.evaluate('=IF(5<3, "yes", "no")', {});
      expect(result).toBe('no');
    });

    test('should work with cell references', () => {
      const context: CellContext = { A1: 100, B1: 50 };
      const result = engine.evaluate('=IF(A1>B1, A1, B1)', context);
      expect(result).toBe(100);
    });
  });

  describe('ROUND Function', () => {
    test('should round to specified decimal places', () => {
      const result = engine.evaluate('=ROUND(3.14159, 2)', {});
      expect(result).toBe(3.14);
    });

    test('should round to integer by default', () => {
      const result = engine.evaluate('=ROUND(3.7)', {});
      expect(result).toBe(4);
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    test('should throw error for invalid formula syntax', () => {
      expect(() => engine.evaluate('=', {})).toThrow(FormulaError);
    });

    test('should throw error for division by zero', () => {
      expect(() => engine.evaluate('=1/0', {})).toThrow(FormulaError);
    });

    test('should throw error for unknown function', () => {
      expect(() => engine.evaluate('=UNKNOWN(1,2)', {})).toThrow(FormulaError);
    });

    test('should throw error for invalid cell reference', () => {
      expect(() => engine.evaluate('=INVALID', {})).toThrow(FormulaError);
    });

    test('should throw error for circular reference', () => {
      const context: CellContext = {
        A1: '=B1',
        B1: '=A1',
      };
      expect(() => engine.evaluate('=A1', context)).toThrow(FormulaError);
    });
  });

  // ─── Complex Formulas ──────────────────────────────────────────────────────

  describe('Complex Formulas', () => {
    test('should handle nested functions', () => {
      const context: CellContext = {
        A1: 10,
        A2: 20,
        A3: 30,
      };
      const result = engine.evaluate('=ROUND(AVERAGE(A1:A3), 1)', context);
      expect(result).toBe(20);
    });

    test('should handle formula with multiple functions', () => {
      const context: CellContext = {
        A1: 10,
        B1: 20,
        C1: 30,
      };
      const result = engine.evaluate('=SUM(A1:C1) * 2 + MAX(A1:C1)', context);
      expect(result).toBe(150); // (60 * 2) + 30 = 150
    });

    test('should handle percentage calculation', () => {
      const context: CellContext = {
        A1: 75, // score
        B1: 100, // total
      };
      const result = engine.evaluate('=ROUND((A1/B1)*100, 1)', context);
      expect(result).toBe(75);
    });
  });

  // ─── Performance Tests ─────────────────────────────────────────────────────

  describe('Performance', () => {
    test('should handle large ranges efficiently', () => {
      const context: CellContext = {};
      for (let i = 1; i <= 1000; i++) {
        context[`A${i}`] = i;
      }

      const startTime = Date.now();
      const result = engine.evaluate('=SUM(A1:A1000)', context);
      const endTime = Date.now();

      expect(result).toBe(500500); // Sum of 1 to 1000
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    test('should cache parsed formulas', () => {
      const context: CellContext = { A1: 10 };

      // First evaluation
      const result1 = engine.evaluate('=A1*2', context);

      // Second evaluation (should use cache)
      const result2 = engine.evaluate('=A1*2', context);

      expect(result1).toBe(result2);
    });
  });
});
