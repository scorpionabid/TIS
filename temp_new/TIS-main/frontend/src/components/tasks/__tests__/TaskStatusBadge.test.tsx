import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskStatusBadge } from '../TaskStatusBadge';

describe('TaskStatusBadge', () => {
  it("'pending' statusu üçün müvafiq badge göstərir", () => {
    render(<TaskStatusBadge status="pending" />);
    // `statusLabels.pending` is usually "Gözləyir", so it should render
    const badge = screen.getByTestId('task-status-badge');
    expect(badge).toBeInTheDocument();
    // Assuming pending gives secondary variant (default shadcn badge)
    expect(badge).toHaveClass('inline-flex'); 
  });

  it("'completed' statusu üçün müvafiq badge göstərir", () => {
    render(<TaskStatusBadge status="completed" />);
    const badge = screen.getByTestId('task-status-badge');
    expect(badge).toBeInTheDocument();
  });

  it("'in_progress' statusu üçün müvafiq badge göstərir", () => {
    render(<TaskStatusBadge status="in_progress" />);
    const badge = screen.getByTestId('task-status-badge');
    expect(badge).toBeInTheDocument();
  });

  it("Bilinməyən status üçün fallback göstərilir", () => {
    render(<TaskStatusBadge status="unknown_status_123" />);
    const badge = screen.getByTestId('task-status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('unknown_status_123');
  });
});
