import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttendanceNumberInput from "../AttendanceNumberInput";

describe("AttendanceNumberInput", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("should allow positive number input", async () => {
    const user = userEvent.setup();
    render(
      <AttendanceNumberInput
        value={5}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const input = screen.getByTestId("test-input");
    await user.clear(input);
    await user.type(input, "10");

    // Check that onChange was called with the correct final value
    expect(mockOnChange).toHaveBeenCalledWith(10);
  });

  it("should not accept negative numbers (min=0)", async () => {
    const user = userEvent.setup();
    render(
      <AttendanceNumberInput
        value={0}
        min={0}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const input = screen.getByTestId("test-input");
    await user.clear(input);
    await user.type(input, "-5");

    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it("should show error when maximum value is exceeded", async () => {
    const user = userEvent.setup();
    render(
      <AttendanceNumberInput
        value={25}
        max={30}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const input = screen.getByTestId("test-input");
    await user.clear(input);
    await user.type(input, "35");

    expect(mockOnChange).toHaveBeenCalledWith(30);
  });

  it("should accept empty value as zero", async () => {
    const user = userEvent.setup();
    render(
      <AttendanceNumberInput
        value={5}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const input = screen.getByTestId("test-input");
    await user.clear(input);

    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it("should call onChange callback correctly", async () => {
    const user = userEvent.setup();
    render(
      <AttendanceNumberInput
        value={10}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const input = screen.getByTestId("test-input");
    await user.clear(input);
    await user.type(input, "15");

    // Check that onChange was called with the correct final value
    expect(mockOnChange).toHaveBeenCalledWith(15);
  });

  it("should increment value with plus button", async () => {
    const user = userEvent.setup();
    render(
      <AttendanceNumberInput
        value={5}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const plusButton = screen.getByRole("button", { name: /1 artır/i });
    await user.click(plusButton);

    expect(mockOnChange).toHaveBeenCalledWith(6);
  });

  it("should decrement value with minus button", async () => {
    const user = userEvent.setup();
    render(
      <AttendanceNumberInput
        value={5}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const minusButton = screen.getByRole("button", { name: /1 azalt/i });
    await user.click(minusButton);

    expect(mockOnChange).toHaveBeenCalledWith(4);
  });

  it("should disable minus button when at minimum value", () => {
    render(
      <AttendanceNumberInput
        value={0}
        min={0}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const minusButton = screen.getByRole("button", { name: /1 azalt/i });
    expect(minusButton).toBeDisabled();
  });

  it("should disable plus button when at maximum value", () => {
    render(
      <AttendanceNumberInput
        value={10}
        max={10}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const plusButton = screen.getByRole("button", { name: /1 artır/i });
    expect(plusButton).toBeDisabled();
  });

  it("should disable all controls when disabled prop is true", () => {
    render(
      <AttendanceNumberInput
        value={5}
        disabled={true}
        onChange={mockOnChange}
        data-testid="test-input"
      />,
    );

    const input = screen.getByTestId("test-input");
    const minusButton = screen.getByRole("button", { name: /1 azalt/i });
    const plusButton = screen.getByRole("button", { name: /1 artır/i });

    expect(input).toBeDisabled();
    expect(minusButton).toBeDisabled();
    expect(plusButton).toBeDisabled();
  });
});
