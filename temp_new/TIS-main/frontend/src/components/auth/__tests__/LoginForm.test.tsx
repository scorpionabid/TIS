import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "../LoginForm";

describe("LoginForm", () => {
  it("trims login input and calls onLogin", async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);

    render(<LoginForm onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText(/superadmin/i), {
      target: { value: "  user@demo.az  " },
    });
    fireEvent.input(screen.getByLabelText(/Şifrə/i), {
      target: { value: "secret123" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /giriş/i }));
    });

    await waitFor(() =>
      expect(onLogin).toHaveBeenCalledWith("user@demo.az", "secret123", true)
    );
  });

  it("shows error, hints, and dismiss button when error provided", () => {
    const onErrorDismiss = vi.fn();

    render(
      <LoginForm
        onLogin={vi.fn()}
        error="RATE_LIMITED: 30s"
        retryCount={3}
        onErrorDismiss={onErrorDismiss}
      />
    );

    expect(screen.getByText(/rate_limited/i)).toBeTruthy();

    // Hints block rendered (list items)
    const hints = screen.getAllByRole("listitem");
    expect(hints.length).toBeGreaterThanOrEqual(3);

    // Dismiss error
    fireEvent.click(screen.getByLabelText(/ba.*la/i));
    expect(onErrorDismiss).toHaveBeenCalled();
  });
});
