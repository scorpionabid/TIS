/**
 * Tests for Formula Engine - Core calculation logic
 */

import { describe, test, expect } from 'vitest';
import {
  FormulaEngine,
  type CellContext,
} from '../../lib/formulaEngine';

// Helper: evaluate and return value or throw on error
function evaluate(formula: string, context: CellContext = {}) {
  const result = FormulaEngine.evaluate(formula, context);
  if (result.error) {
    throw new Error(result.error);
  }
  return result.value;
}

describe('FormulaEngine', () => {
  // ─── Basic Arithmetic ────────────────────────────────────────────────────

  describe('Basic Arithmetic', () => {
    test('should evaluate simple addition', () => {
      expect(evaluate('=1+2')).toBe(3);
    });

    test('should evaluate simple subtraction', () => {
      expect(evaluate('=5-3')).toBe(2);
    });

    test('should evaluate simple multiplication', () => {
      expect(evaluate('=4*5')).toBe(20);
    });

    test('should evaluate simple division', () => {
      expect(evaluate('=20/4')).toBe(5);
    });

    test('should handle operator precedence', () => {
      expect(evaluate('=2+3*4')).toBe(14);
    });

    test('should handle parentheses', () => {
      expect(evaluate('=(2+3)*4')).toBe(20);
    });

    test('should handle negative numbers', () => {
      expect(evaluate('=-5+3')).toBe(-2);
    });

    test('should handle decimal numbers', () => {
      expect(evaluate('=1.5*2.5')).toBe(3.75);
    });
  });

  // ─── Cell References ─────────────────────────────────────────────────────

  describe('Cell References', () => {
    test('should reference single cell', () => {
      const context: CellContext = { A1: 10 };
      expect(evaluate('=A1', context)).toBe(10);
    });

    test('should reference cells in formula', () => {
      const context: CellContext = { A1: 10, B1: 20 };
      expect(evaluate('=A1+B1', context)).toBe(30);
    });

    test('should handle missing cell references as null in arithmetic', () => {
      const context: CellContext = { A1: 10 };
      expect(evaluate('=A1+B1', context)).toBe(null);
    });
  });

  // ─── Excel Functions ──────────────────────────────────────────────────────

  describe('SUM Function', () => {
    test('should sum range of cells', () => {
      const context: CellContext = { A1: 10, A2: 20, A3: 30 };
      expect(evaluate('=SUM(A1:A3)', context)).toBe(60);
    });

    test('should sum individual cells', () => {
      const context: CellContext = { A1: 10, B1: 20, C1: 30 };
      expect(evaluate('=SUM(A1,B1,C1)', context)).toBe(60);
    });

    test('should handle empty range', () => {
      expect(evaluate('=SUM(A1:A3)', {})).toBe(0);
    });

    test('should ignore non-numeric values in range', () => {
      const context: CellContext = { A1: 10, A2: null, A3: 'text' };
      expect(evaluate('=SUM(A1:A3)', context)).toBe(10);
    });
  });

  describe('AVERAGE Function', () => {
    test('should calculate average of range', () => {
      const context: CellContext = { A1: 10, A2: 20, A3: 30 };
      expect(evaluate('=AVERAGE(A1:A3)', context)).toBe(20);
    });

    test('should return null for empty range', () => {
      expect(evaluate('=AVERAGE(A1:A3)', {})).toBe(null);
    });

    test('should handle single value', () => {
      expect(evaluate('=AVERAGE(A1)', { A1: 42 })).toBe(42);
    });
  });

  describe('COUNT Function', () => {
    test('should count non-null values', () => {
      const context: CellContext = { A1: 10, A2: 20, A3: 'text', A4: null };
      expect(evaluate('=COUNT(A1:A4)', context)).toBe(3);
    });
  });

  describe('MAX/MIN Functions', () => {
    test('should find maximum value', () => {
      const context: CellContext = { A1: 10, A2: 50, A3: 30 };
      expect(evaluate('=MAX(A1:A3)', context)).toBe(50);
    });

    test('should find minimum value', () => {
      const context: CellContext = { A1: 10, A2: 50, A3: 30 };
      expect(evaluate('=MIN(A1:A3)', context)).toBe(10);
    });
  });

  describe('IF Function', () => {
    test('should return true value when condition is true', () => {
      expect(evaluate('=IF(5>3, "yes", "no")')).toBe('yes');
    });

    test('should return false value when condition is false', () => {
      expect(evaluate('=IF(5<3, "yes", "no")')).toBe('no');
    });

    test('should work with cell references', () => {
      const context: CellContext = { A1: 100, B1: 50 };
      expect(evaluate('=IF(A1>B1, A1, B1)', context)).toBe(100);
    });
  });

  describe('ROUND Function', () => {
    test('should round to specified decimal places', () => {
      expect(evaluate('=ROUND(3.14159, 2)')).toBe(3.14);
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    test('should return null for division by zero', () => {
      const result = FormulaEngine.evaluate('=1/0', {});
      expect(result.value).toBe(null);
      expect(result.error).toBe(null);
    });

    test('should return error for unknown function', () => {
      const result = FormulaEngine.evaluate('=UNKNOWN(1,2)', {});
      expect(result.error).toBeTruthy();
    });
  });

  // ─── Complex Formulas ──────────────────────────────────────────────────────

  describe('Complex Formulas', () => {
    test('should handle nested functions', () => {
      const context: CellContext = { A1: 10, A2: 20, A3: 30 };
      expect(evaluate('=ROUND(AVERAGE(A1:A3), 1)', context)).toBe(20);
    });

    test('should handle percentage calculation', () => {
      const context: CellContext = { A1: 75, B1: 100 };
      expect(evaluate('=ROUND((A1/B1)*100, 1)', context)).toBe(75);
    });
  });

  // ─── Performance Tests ─────────────────────────────────────────────────────

  describe('Performance', () => {
    test('should handle large ranges efficiently', () => {
      const context: CellContext = {};
      for (let i = 1; i <= 100; i++) {
        context[`A${i}`] = i;
      }

      const startTime = Date.now();
      const result = FormulaEngine.evaluate('=SUM(A1:A100)', context);
      const endTime = Date.now();

      expect(result.value).toBe(5050);
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});
