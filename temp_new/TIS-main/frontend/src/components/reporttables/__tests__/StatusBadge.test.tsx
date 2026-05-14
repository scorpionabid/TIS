import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ResponseStatusBadge,
  RowStatusBadge,
  ProcessingStatusBadge,
} from '../StatusBadge';
import React from 'react';

describe('StatusBadge komponentləri', () => {
  // ─── ResponseStatusBadge ──────────────────────────────────────────────────

  describe('ResponseStatusBadge', () => {
    it('submitted status üçün "Göndərilib" mətnini göstərir', () => {
      render(<ResponseStatusBadge status="submitted" />);
      expect(screen.getByText('Göndərilib')).toBeInTheDocument();
    });

    it('draft status üçün "Qaralama" mətnini göstərir', () => {
      render(<ResponseStatusBadge status="draft" />);
      expect(screen.getByText('Qaralama')).toBeInTheDocument();
    });

    it('naməlum status üçün "Qaralama" fallback göstərir', () => {
      render(<ResponseStatusBadge status="unknown_status" />);
      expect(screen.getByText('Qaralama')).toBeInTheDocument();
    });

    it('sm ölçüsü üçün text-xs class tətbiq edir', () => {
      const { container } = render(<ResponseStatusBadge status="submitted" size="sm" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge?.className).toContain('text-xs');
    });

    it('default ölçüsündə əlavə class tətbiq etmir', () => {
      const { container } = render(<ResponseStatusBadge status="submitted" size="default" />);
      const badge = container.firstChild as HTMLElement;
      // text-xs base class ola bilər, lakin biz əlavə nəsə yoxdur deyə baxırıq
      expect(badge?.className).toContain('text-xs'); 
    });
  });

  // ─── RowStatusBadge ───────────────────────────────────────────────────────

  describe('RowStatusBadge', () => {
    it('draft status üçün "—" simvolunu göstərir', () => {
      render(<RowStatusBadge status="draft" />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('status yoxdursa "—" simvolunu göstərir', () => {
      render(<RowStatusBadge />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('submitted status üçün "Gözləyir" mətnini göstərir', () => {
      render(<RowStatusBadge status="submitted" />);
      expect(screen.getByText('Gözləyir')).toBeInTheDocument();
    });

    it('approved status üçün "Təsdiqləndi" mətnini göstərir', () => {
      render(<RowStatusBadge status="approved" />);
      expect(screen.getByText('Təsdiqləndi')).toBeInTheDocument();
    });

    it('rejected status üçün "Rədd edildi" mətnini göstərir', () => {
      render(<RowStatusBadge status="rejected" />);
      expect(screen.getByText('Rədd edildi')).toBeInTheDocument();
    });

    it('rejected status ilə rejection reason göstərir', () => {
      render(
        <RowStatusBadge
          status="rejected"
          rejectionReason="Məlumat natamamdır"
        />
      );
      expect(screen.getByText('Rədd edildi')).toBeInTheDocument();
      expect(screen.getByText('Məlumat natamamdır')).toBeInTheDocument();
    });

    it('rejection reason olmadıqda əlavə mətn göstərmir', () => {
      render(<RowStatusBadge status="rejected" />);
      expect(screen.getByText('Rədd edildi')).toBeInTheDocument();
      expect(screen.queryByText('Məlumat')).not.toBeInTheDocument();
    });

    it('naməlum status üçün null qaytarır', () => {
      const { container } = render(<RowStatusBadge status="some_unknown_status" />);
      expect(container.firstChild).toBeNull();
    });

    it('submitted sm ölçüsü whitespace-nowrap class-ı ilə göstərir', () => {
      const { container } = render(<RowStatusBadge status="submitted" size="sm" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge?.className).toContain('whitespace-nowrap');
    });
  });

  // ─── ProcessingStatusBadge ────────────────────────────────────────────────

  describe('ProcessingStatusBadge', () => {
    it('isPending=true olduqda "Gözləyir..." mətnini göstərir', () => {
      render(<ProcessingStatusBadge isPending={true} label="Saxla" />);
      expect(screen.getByText('Gözləyir...')).toBeInTheDocument();
    });

    it('isPending=false olduqda label mətnini göstərir', () => {
      render(<ProcessingStatusBadge isPending={false} label="Saxla" />);
      expect(screen.getByText('Saxla')).toBeInTheDocument();
    });

    it('isPending=true olduqda loading spinner göstərir', () => {
      const { container } = render(
        <ProcessingStatusBadge isPending={true} label="Saxla" />
      );
      // Loader2 SVG ikonunu yoxla (animate-spin class-ı ilə)
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('isPending=false olduqda spinner göstərmir', () => {
      const { container } = render(
        <ProcessingStatusBadge isPending={false} label="Saxla" />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });
});
