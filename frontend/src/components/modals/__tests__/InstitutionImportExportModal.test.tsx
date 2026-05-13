import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstitutionImportExportModal } from '../InstitutionImportExportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitutionTypes } from '@/hooks/useInstitutionTypes';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useInstitutionTypes', () => ({
  useInstitutionTypes: vi.fn(),
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: vi.fn(() => ({ isMobile: false })),
}));

vi.mock('@/services/institutions', () => ({
  institutionService: {
    downloadImportTemplateByType: vi.fn(),
    downloadCsvTemplateByType: vi.fn(),
    importFromTemplateByType: vi.fn(),
    exportInstitutionsByType: vi.fn(),
  },
}));

// Mock ResizeObserver for Dialog component
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Also mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: any) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}
window.PointerEvent = MockPointerEvent as any;

describe('InstitutionImportExportModal', () => {
  const mockOnClose = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ currentUser: { role: 'superadmin' } });
    (useInstitutionTypes as any).mockReturnValue({
      data: {
        institution_types: [
          { key: 'secondary_school', label: 'Orta Məktəb', default_level: 4 },
          { key: 'kindergarten', label: 'Bağça', default_level: 5 }
        ]
      },
      isLoading: false
    });
  });

  const renderModal = () => {
    return render(
      <InstitutionImportExportModal open={true} onClose={mockOnClose} />
    );
  };

  it('renders the modal when open is true', () => {
    renderModal();
    
    expect(screen.getByText('Müəssisə İdxal/İxrac')).toBeInTheDocument();
    expect(screen.getByText('Müəssisə Növü Seçimi')).toBeInTheDocument();
  });

  it('renders tabs correctly', () => {
    renderModal();
    
    expect(screen.getByRole('tab', { name: /Müəssisə Növü Seçimi/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Template İdarəsi/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Fayl Yükləmə/i })).toBeInTheDocument();
  });

  it('shows institution types in select', async () => {
    renderModal();
    
    // Radix Select trigger
    const trigger = screen.getByRole('combobox');
    fireEvent.pointerDown(trigger);
    
    await waitFor(() => {
      expect(screen.getByText(/Orta Məktəb/i)).toBeInTheDocument();
      expect(screen.getByText(/Bağça/i)).toBeInTheDocument();
    });
  });

  it('disables upload button when no file is selected', async () => {
    const user = userEvent.setup();
    renderModal();
    
    // Go to upload tab
    const uploadTab = screen.getByRole('tab', { name: /Fayl Yükləmə/i });
    await user.click(uploadTab);
    
    await waitFor(() => {
      const importBtn = screen.getByRole('button', { name: /İdxal Et/i });
      expect(importBtn).toBeDisabled();
    });
  });
});
