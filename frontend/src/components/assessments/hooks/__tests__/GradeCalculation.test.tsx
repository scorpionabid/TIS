import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAssessmentGradebook } from '../useAssessmentGradebook';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Wrapper for React Query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

export const QueryClientWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Grade Calculations in useAssessmentGradebook', () => {
    it('getGradeColor düzgün CSS klaslarını qaytarır', () => {
        const { result } = renderHook(() => useAssessmentGradebook(), { wrapper: QueryClientWrapper });
        
        expect(result.current.getGradeColor(95, 100)).toBe('text-green-600');
        expect(result.current.getGradeColor(85, 100)).toBe('text-blue-600');
        expect(result.current.getGradeColor(75, 100)).toBe('text-yellow-600');
        expect(result.current.getGradeColor(65, 100)).toBe('text-orange-600');
        expect(result.current.getGradeColor(50, 100)).toBe('text-red-600');
    });

    it('getGradeLetter düzgün məktub qiymətlərini qaytarır', () => {
        const { result } = renderHook(() => useAssessmentGradebook(), { wrapper: QueryClientWrapper });
        
        expect(result.current.getGradeLetter(95, 100)).toBe('A');
        expect(result.current.getGradeLetter(85, 100)).toBe('B');
        expect(result.current.getGradeLetter(75, 100)).toBe('C');
        expect(result.current.getGradeLetter(65, 100)).toBe('D');
        expect(result.current.getGradeLetter(40, 100)).toBe('F');
    });

    it('calculateClassAverage boş qiymətləndirmə üçün 0 qaytarır', () => {
        const { result } = renderHook(() => useAssessmentGradebook(), { wrapper: QueryClientWrapper });
        
        const assessment = { grades: [] } as any;
        expect(result.current.calculateClassAverage(assessment)).toBe(0);
    });

    it('calculateClassAverage düzgün ortalama hesablayır', () => {
        const { result } = renderHook(() => useAssessmentGradebook(), { wrapper: QueryClientWrapper });
        
        const assessment = { 
            grades: [
                { points: 80 },
                { points: 90 },
                { points: 100 }
            ] 
        } as any;
        
        expect(result.current.calculateClassAverage(assessment)).toBe(90);
    });
});
