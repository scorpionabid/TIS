import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskApprovalBadge } from '../TaskApprovalBadge';

describe('TaskApprovalBadge', () => {
  it("'approved' statusu göstərilir", () => {
    render(<TaskApprovalBadge approvalStatus="approved" requiresApproval={true} />);
    const badge = screen.getByTestId('approval-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Təsdiqləndi');
    expect(badge).toHaveClass('bg-green-100');
  });

  it("'pending' statusu göstərilir", () => {
    render(<TaskApprovalBadge approvalStatus="pending" requiresApproval={true} />);
    const badge = screen.getByTestId('approval-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Təsdiqi Gözləyir');
    expect(badge).toHaveClass('bg-yellow-100');
  });

  it("null approval_status üçün 'Təsdiq tələb edir' göstərilir", () => {
    render(<TaskApprovalBadge approvalStatus={null} requiresApproval={true} />);
    const badge = screen.getByTestId('approval-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Təsdiq tələb edir');
  });

  it("requiresApproval false olduqda gizlənir", () => {
    const { container } = render(<TaskApprovalBadge approvalStatus="approved" requiresApproval={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
