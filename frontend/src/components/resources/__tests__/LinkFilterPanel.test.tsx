import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LinkFilterPanel } from '../LinkFilterPanel';
import type { LinkFilters } from '../LinkFilterPanel';

const defaultProps = {
  onFiltersChange: vi.fn(),
  availableInstitutions: [],
  availableCreators: [],
  onToggle: vi.fn(),
  mode: 'all' as const,
};

describe('LinkFilterPanel', () => {
  it('shows active filter badge when collapsed', () => {
    const filters: LinkFilters = {
      link_type: 'video',
      share_scope: 'regional',
    };

    render(
      <LinkFilterPanel
        {...defaultProps}
        filters={filters}
        isOpen={false}
      />
    );

    expect(screen.getByText('Filtr seçimləri')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('clears all filters via the temizlə button', async () => {
    const user = userEvent.setup();
    const handleFiltersChange = vi.fn();

    render(
      <LinkFilterPanel
        {...defaultProps}
        filters={{ link_type: 'video', share_scope: 'regional' }}
        onFiltersChange={handleFiltersChange}
        isOpen
      />
    );

    await user.click(screen.getByRole('button', { name: /Təmizlə/i }));
    expect(handleFiltersChange).toHaveBeenCalledWith({});
  });

  it('renders institution badge with resolved name when active', () => {
    render(
      <LinkFilterPanel
        {...defaultProps}
        filters={{ institution_id: 42 }}
        availableInstitutions={[{ id: 42, name: 'Test Məktəb' }]}
        isOpen
      />
    );

    expect(screen.getAllByText('Test Məktəb').length).toBeGreaterThan(0);
  });
});
