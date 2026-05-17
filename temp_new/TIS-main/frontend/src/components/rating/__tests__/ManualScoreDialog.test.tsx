import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualScoreDialog } from '../ManualScoreDialog';

// LayoutContext mock — Dialog komponenti useLayout() istifadə edir
vi.mock('@/contexts/LayoutContext', () => ({
    useLayout: () => ({
        isMobile: false,
        sidebarCollapsed: false,
        sidebarHovered: false,
        setSidebarCollapsed: vi.fn(),
        setSidebarHovered: vi.fn(),
        toggleSidebar: vi.fn(),
    }),
    LayoutProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    currentScore: 0,
    currentCategory: '',
    currentReason: '',
    directorName: 'Test Direktor',
};

describe('ManualScoreDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('dialog açıq olduqda görünür', () => {
        render(<ManualScoreDialog {...defaultProps} />);
        expect(screen.getByTestId('manual-score-dialog')).toBeInTheDocument();
        expect(screen.getByText('Test Direktor')).toBeInTheDocument();
    });

    it('kateqoriya seçilmədikdə "Yadda saxla" disabled olur', () => {
        render(<ManualScoreDialog {...defaultProps} currentCategory="" />);
        const saveBtn = screen.getByTestId('manual-score-save');
        expect(saveBtn).toBeDisabled();
    });

    it('kateqoriya seçildikdə "Yadda saxla" aktiv olur', () => {
        render(<ManualScoreDialog {...defaultProps} currentCategory="documents_ok" />);
        const saveBtn = screen.getByTestId('manual-score-save');
        expect(saveBtn).not.toBeDisabled();
    });

    it('müsbət kateqoriya üçün "+" işarəsi göstərilir', () => {
        render(<ManualScoreDialog {...defaultProps} currentCategory="documents_ok" currentScore={5} />);
        const sign = screen.getByTestId('manual-score-sign');
        expect(sign).toHaveTextContent('+');
    });

    it('mənfi kateqoriya üçün "−" işarəsi göstərilir', () => {
        render(<ManualScoreDialog {...defaultProps} currentCategory="documents_fail" currentScore={-3} />);
        const sign = screen.getByTestId('manual-score-sign');
        expect(sign).toHaveTextContent('−');
    });

    it('kateqoriya seçilmədikdə "±" işarəsi göstərilir', () => {
        render(<ManualScoreDialog {...defaultProps} currentCategory="" />);
        const sign = screen.getByTestId('manual-score-sign');
        expect(sign).toHaveTextContent('±');
    });

    it('"Yadda saxla" düyməsi onSave(score, category, reason) ilə çağırılır', () => {
        const onSave = vi.fn();
        render(
            <ManualScoreDialog
                {...defaultProps}
                onSave={onSave}
                currentCategory="documents_ok"
                currentScore={5}
                currentReason="Test qeyd"
            />
        );
        fireEvent.click(screen.getByTestId('manual-score-save'));
        expect(onSave).toHaveBeenCalledOnce();
        expect(onSave).toHaveBeenCalledWith(5, 'documents_ok', 'Test qeyd');
    });

    it('"Ləğv et" onClose() çağırır', () => {
        const onClose = vi.fn();
        render(<ManualScoreDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByTestId('manual-score-cancel'));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('qeyd sahəsindəki simvol sayacı düzgün göstərilir', () => {
        render(<ManualScoreDialog {...defaultProps} currentReason="Salam" />);
        expect(screen.getByText('5/500')).toBeInTheDocument();
    });

    it('kateqoriya seçildikdə preview bloku görünür', () => {
        render(<ManualScoreDialog {...defaultProps} currentCategory="documents_ok" currentScore={3} />);
        const preview = screen.getByTestId('manual-score-preview');
        expect(preview).toBeInTheDocument();
        // Preview içindəki kateqoriya labeli yoxlanır (Select option ilə qarışmaması üçün within)
        expect(within(preview).getByText('Məktəb sənədlərinin qaydasında olması')).toBeInTheDocument();
    });

    it('kateqoriya seçilmədikdə preview bloku görünmür', () => {
        render(<ManualScoreDialog {...defaultProps} currentCategory="" />);
        expect(screen.queryByTestId('manual-score-preview')).not.toBeInTheDocument();
    });

    it('dialog yenidən açılanda state cari dəyərlərlə sıfırlanır', async () => {
        const { rerender } = render(
            <ManualScoreDialog {...defaultProps} isOpen={false} currentScore={0} currentCategory="" />
        );
        rerender(
            <ManualScoreDialog
                {...defaultProps}
                isOpen={true}
                currentScore={7}
                currentCategory="documents_ok"
                currentReason="Köhnə qeyd"
            />
        );
        await waitFor(() => {
            const input = screen.getByTestId('manual-score-input') as HTMLInputElement;
            expect(input.value).toBe('7');
        });
        // "Köhnə qeyd" = 10 simvol
        expect(screen.getByText('10/500')).toBeInTheDocument();
    });
});
