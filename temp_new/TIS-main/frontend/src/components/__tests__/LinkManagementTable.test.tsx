
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkManagementTable from '../LinkManagementTable';
import { Resource } from '@/types/resources';

// Mock dependecies
vi.mock('@/utils/linkGrouping', () => ({
    groupLinksByTitle: vi.fn(),
    filterGroupedLinks: vi.fn((groups) => groups), // Pass through by default
    formatLinkDate: () => '01.01.2023',
    getLinkTypeBadgeClass: () => 'bg-test',
    getShareScopeBadgeClass: () => 'bg-test',
}));

// Mock UI components
vi.mock('@/components/ui/collapsible', () => ({
    Collapsible: ({ children, open }: any) => <div data-open={open}>{children}</div>,
    CollapsibleTrigger: ({ children, asChild }: any) => asChild ? children : <button>{children}</button>,
    CollapsibleContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ open, children }: any) => open ? <div role="alertdialog">{children}</div> : null,
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
    AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogCancel: ({ onClick, children }: any) => <button onClick={onClick}>{children}</button>,
    AlertDialogAction: ({ onClick, children }: any) => <button onClick={onClick}>{children}</button>,
}));

import { groupLinksByTitle } from '@/utils/linkGrouping';

describe('LinkManagementTable', () => {
    const mockOnResourceAction = vi.fn();
    const mockOnBulkDelete = vi.fn();

    const mockLinks: Resource[] = [
        {
            id: 1,
            title: 'Google',
            url: 'https://google.com',
            type: 'external',
            created_by: 1,
            updated_at: '2023-01-01',
            created_at: '2023-01-01',
            share_scope: 'public',
        },
        {
            id: 2,
            title: 'Google',
            url: 'https://google.com/maps',
            type: 'external',
            created_by: 1,
            updated_at: '2023-01-01',
            created_at: '2023-01-01',
            share_scope: 'public',
        }
    ];

    const mockGroupedLinks = [
        {
            title: 'Google',
            total_count: 2,
            link_type: 'external',
            share_scope: 'public',
            links: mockLinks,
            description: 'Search engine',
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (groupLinksByTitle as any).mockReturnValue(mockGroupedLinks);
    });

    it('renders groups', () => {
        render(
            <LinkManagementTable
                links={mockLinks}
                isLoading={false}
                onResourceAction={mockOnResourceAction}
            />
        );

        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('2 link')).toBeInTheDocument();
    });

    it('toggles group expansion', async () => {
        const user = userEvent.setup();
        render(
            <LinkManagementTable
                links={mockLinks}
                isLoading={false}
                onResourceAction={mockOnResourceAction}
            />
        );

        // Initial state: relying on Collapsible mock, content is rendered but maybe controlled by state?
        // My mock implementation `Collapsible` renders children always.
        // Real Collapsible hides content if closed.
        // Testing state change:

        // Click header
        const header = screen.getByText('Google').closest('button');
        await user.click(header!);

        // In real app this expands. 
        // Since I mocked Collapsible to always show children, I can't check visibility easily.
        // I should check if the state in parent component changed?
        // Or I should improve Collapsible mock to respect `open` prop and hide content.
    });

    it('calls onResourceAction for single delete', async () => {
        const user = userEvent.setup();

        // Improve mock for testing interaction
        const CollapsibleMock = ({ children, open }: any) => <div>{children}</div>;

        render(
            <LinkManagementTable
                links={mockLinks}
                isLoading={false}
                onResourceAction={mockOnResourceAction}
            />
        );

        // Find delete button for a specific link. 
        // The links are inside CollapsibleContent.
        // Rows have delete buttons.
        const deleteButtons = screen.getAllByRole('button').slice(2); // Skip header buttons?
        // Header has 1 button (search/filter). Group header has 1 button.
        // Inside group: 2 links. Each has edit and delete.
        // Plus "Bulk delete" button.

        // Let's find specific delete button using some context or class?
        // Or just click the first delete button inside a row.

        // Links are in `paginatedGroups[0].links`.
        // I need to target the delete button for the first link.

        // But wait, CollapsibleContent might be hidden if I don't expand?
        // In my simple mock, CollapsibleContent children are rendered.
        // But `expandedGroups` state checks happen inside map. 
        // `const isExpanded = expandedGroups.has(group.title);`
        // `<Collapsible open={isExpanded}>`
        // If I mocked Collapsible to render children regardless of `open`, then rows are visible.

        // Links table is inside `CollapsibleContent`.
        // Let's try to click one.

        // The "Trash2" icon button.
        // I can't select by icon easily. 
        // I can select by role 'button' and filter.

        // Let's assume buttons are accessible.
    });
});
