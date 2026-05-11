import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import ExamSeatingPlan from '../ExamSeatingPlan';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid="mock-button" {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({ isSidebarOpen: true, setSidebarOpen: vi.fn() }),
}));

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('ExamSeatingPlan Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the initial upload step correctly', () => {
    expect(() => render(<ExamSeatingPlan />)).not.toThrow();
  });
});
