
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentTable } from '../DocumentTable';
import { Resource } from '@/types/resources';

// Mock dependecies
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/services/resources', () => ({
    resourceService: {
        formatResourceSize: (doc: any) => `${doc.file_size} bytes`,
        accessResource: vi.fn(),
    },
}));

// Mock component imports that might cause issues
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

import { useAuth } from '@/contexts/AuthContext';

describe('DocumentTable', () => {
    const mockOnResourceAction = vi.fn();
    const mockUser = { id: 1, role: 'teacher', hasPermission: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            currentUser: mockUser,
            hasPermission: (perm: string) => perm === 'documents.update' || perm === 'documents.delete',
        });
    });

    const mockDocuments: Resource[] = [
        {
            id: 1,
            title: 'Test Doc 1',
            original_filename: 'test1.pdf',
            file_extension: 'pdf',
            file_size: 1024,
            status: 'active',
            access_level: 'public',
            created_by: 1, // Created by current user
            updated_at: '2023-01-01T00:00:00Z',
            created_at: '2023-01-01T00:00:00Z',
            type: 'document',
        },
        {
            id: 2,
            title: 'Test Doc 2',
            original_filename: 'test2.docx',
            file_extension: 'docx',
            file_size: 2048,
            status: 'draft',
            access_level: 'institution',
            created_by: 2, // Created by other
            updated_at: '2023-01-02T00:00:00Z',
            created_at: '2023-01-02T00:00:00Z',
            type: 'document',
        },
    ];

    it('renders empty state when no documents provided', () => {
        render(
            <DocumentTable
                documents={[]}
                onResourceAction={mockOnResourceAction}
            />
        );

        expect(screen.getByText('Seçilmiş filtrə uyğun sənəd tapılmadı')).toBeInTheDocument();
    });

    it('renders table with documents', () => {
        render(
            <DocumentTable
                documents={mockDocuments}
                onResourceAction={mockOnResourceAction}
            />
        );

        expect(screen.getByText('Test Doc 1')).toBeInTheDocument();
        expect(screen.getByText('Test Doc 2')).toBeInTheDocument();
        expect(screen.getByText(/test1.pdf/)).toBeInTheDocument();
    });

    it('shows edit/delete buttons for own documents', () => {
        render(
            <DocumentTable
                documents={[mockDocuments[0]]}
                onResourceAction={mockOnResourceAction}
            />
        );

        // Should have edit and delete buttons (mocked icons or simple check)
        // The component uses Lucide icons which are rendered as SVGs.
        // We can check button existence implicitly or by some label if available?
        // The buttons have no aria-label in the component code (step 226), just icon.
        // However, we can check by implementation details or class?
        // Or we can assume they are the 2nd and 3rd buttons in the row actions?
        // "Download" is first.

        // Let's rely on firing events on buttons.
        // There are 3 buttons in the actions cell.
        const buttons = screen.getAllByRole('button');
        // First is document title button.
        // Last 3 are actions.
        const actionButtons = buttons.slice(1);
        expect(actionButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('hides delete button for others documents if no permission', () => {
        (useAuth as any).mockReturnValue({
            currentUser: { id: 1, role: 'teacher' },
            hasPermission: () => false, // No delete permission
        });

        render(
            <DocumentTable
                documents={[mockDocuments[1]]} // Created by user 2
                onResourceAction={mockOnResourceAction}
            />
        );

        // Only download button should be visible (edit and delete hidden)
        // Title is also a button.
        // So 1 title + 1 download = 2 buttons.
        const buttons = screen.getAllByRole('button');
        // Filter out title button (which contains text 'Test Doc 2')
        const actionButtons = buttons.filter(b => !b.textContent?.includes('Test Doc 2'));

        // Should be 1 (Download)
        expect(actionButtons.length).toBe(1);
    });

    it('calls onResourceAction when delete confirmed', async () => {
        const user = userEvent.setup();
        render(
            <DocumentTable
                documents={[mockDocuments[0]]}
                onResourceAction={mockOnResourceAction}
            />
        );

        // Click delete button (last button)
        const buttons = screen.getAllByRole('button');
        const deleteBtn = buttons[buttons.length - 1];
        await user.click(deleteBtn);

        // Alert dialog should appear
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.getByText(/sistemdən silinəcək/i)).toBeInTheDocument();

        // Click confirm (Sil)
        const confirmBtn = screen.getByText('Sil');
        await user.click(confirmBtn);

        expect(mockOnResourceAction).toHaveBeenCalledWith(mockDocuments[0], 'delete');
    });
});
