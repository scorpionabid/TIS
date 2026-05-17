import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ExamSeatingPlan, { autoDetectMapping } from '../components/ExamSeatingPlan';
import { LayoutProvider } from '@/contexts/LayoutContext';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="icon-upload" />,
  Download: () => <div data-testid="icon-download" />,
  Users: () => <div data-testid="icon-users" />,
  Trash2: () => <div data-testid="icon-trash" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  Building2: () => <div data-testid="icon-building" />,
  FileSpreadsheet: () => <div data-testid="icon-spreadsheet" />,
  Settings2: () => <div data-testid="icon-settings" />,
  ArrowRight: () => <div data-testid="icon-right" />,
  ArrowLeft: () => <div data-testid="icon-left" />,
  LayoutGrid: () => <div data-testid="icon-grid" />,
  List: () => <div data-testid="icon-list" />,
  Printer: () => <div data-testid="icon-printer" />,
  Edit3: () => <div data-testid="icon-edit" />,
  X: () => <div data-testid="icon-x" />,
  Plus: () => <div data-testid="icon-plus" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  Search: () => <div data-testid="icon-search" />,
  Shuffle: () => <div data-testid="icon-shuffle" />,
  Undo2: () => <div data-testid="icon-undo" />,
  ChevronUp: () => <div data-testid="icon-up" />,
  ChevronDown: () => <div data-testid="icon-down" />,
  Filter: () => <div data-testid="icon-filter" />,
  RotateCcw: () => <div data-testid="icon-rotate" />,
}));

// Mock XLSX and other external libs
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

vi.mock('exceljs', () => ({
  default: vi.fn(),
}));

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ExamSeatingPlan Component', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <LayoutProvider>
        {ui}
      </LayoutProvider>
    );
  };

  it('renders upload step initially', () => {
    renderWithProviders(<ExamSeatingPlan />);
    
    expect(screen.getByText(/Faylı bura sürükləyin/i)).toBeDefined();
    expect(screen.getAllByTestId('icon-upload').length).toBeGreaterThan(0);
  });

  describe('autoDetectMapping Helper', () => {
    it('detects Azerbaijani headers correctly', () => {
      const headers = ['Mərkəz', 'Soyad', 'Ad', 'Ata adı', 'UTİS kodu', 'Sinif', 'Məktəb'];
      const mapping = autoDetectMapping(headers);
      
      expect(mapping.center).toBe(0);
      expect(mapping.lastName).toBe(1);
      expect(mapping.firstName).toBe(2);
      expect(mapping.patronymic).toBe(3);
      expect(mapping.utisCode).toBe(4);
      expect(mapping.grade).toBe(5);
      expect(mapping.schoolName).toBe(6);
    });

    it('detects English headers correctly', () => {
      const headers = ['Center', 'Last Name', 'First Name', 'Grade', 'School', 'UTIS'];
      const mapping = autoDetectMapping(headers);
      
      expect(mapping.center).toBe(0);
      expect(mapping.lastName).toBe(1);
      expect(mapping.firstName).toBe(2);
      expect(mapping.grade).toBe(3);
      expect(mapping.schoolName).toBe(4);
      expect(mapping.utisCode).toBe(5);
    });
  });
});

