import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttendanceNumberInput from "../AttendanceNumberInput";

describe("AttendanceNumberInput", () => {
  const mockOnChange = vi.fn();

  // Helper component to test controlled input behavior
  const ControlledInput = ({ initialValue, min, max, disabled }: any) => {
    const [val, setVal] = React.useState(initialValue);
    return (
      <AttendanceNumberInput
        value={val}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(v) => {
          setVal(v);
          mockOnChange(v);
        }}
        data-testid="test-input"
      />
    );
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("should allow positive number input", async () => {
    const user = userEvent.setup();
    render(<ControlledInput initialValue={5} />);

    const input = screen.getByTestId("test-input");
    await user.clear(input);
    await user.type(input, "10");

    // Check that onChange was called with the correct final value
    expect(mockOnChange).toHaveBeenCalledWith(10);
  });

  it("should not accept negative numbers (min=0)", async () => {
    const user = userEvent.setup();
    render(<ControlledInput initialValue={0} min={0} />);

    const input = screen.getByTestId("test-input");
    await user.clear(input);
    await user.type(input, "-5");

    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it("should show error when maximum value is exceeded", async () => {
    const user = userEvent.setup();
    render(<ControlledInput initialValue={25} max={30} />);

    const input = screen.getByTestId("test-input");
    await user.clear(input);
    await user.type(input, "35");

    expect(mockOnChange).toHaveBeenCalledWith(30);
  });

  it("should accept empty value as zero", async () => {
    const user = userEvent.setup();
    render(<ControlledInput initialValue={5} />);

    const input = screen.getByTestId("test-input");
    await user.clear(input);

    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it("should call onChange callback correctly", async () => {
    const user = userEvent.setup();
    render(<ControlledInput initialValue={10} />);

    const input = screen.getByTestId("test-input");
    await user.clear(input);
    await user.type(input, "15");

    // Check that onChange was called with the correct final value
    expect(mockOnChange).toHaveBeenCalledWith(15);
  });

  it("should increment value with plus button", async () => {
    const user = userEvent.setup();
    render(<ControlledInput initialValue={5} />);

    const plusButton = screen.getByRole("button", { name: /1 artır/i });
    await user.click(plusButton);

    expect(mockOnChange).toHaveBeenCalledWith(6);
  });

  it("should decrement value with minus button", async () => {
    const user = userEvent.setup();
    render(<ControlledInput initialValue={5} />);

    const minusButton = screen.getByRole("button", { name: /1 azalt/i });
    await user.click(minusButton);

    expect(mockOnChange).toHaveBeenCalledWith(4);
  });

  it("should disable minus button when at minimum value", () => {
    render(<ControlledInput initialValue={0} min={0} />);

    const minusButton = screen.getByRole("button", { name: /1 azalt/i });
    expect(minusButton).toBeDisabled();
  });

  it("should disable plus button when at maximum value", () => {
    render(<ControlledInput initialValue={10} max={10} />);

    const plusButton = screen.getByRole("button", { name: /1 artır/i });
    expect(plusButton).toBeDisabled();
  });

  it("should disable all controls when disabled prop is true", () => {
    render(<ControlledInput initialValue={5} disabled={true} />);

    const input = screen.getByTestId("test-input");
    const minusButton = screen.getByRole("button", { name: /1 azalt/i });
    const plusButton = screen.getByRole("button", { name: /1 artır/i });

    expect(input).toBeDisabled();
    expect(minusButton).toBeDisabled();
    expect(plusButton).toBeDisabled();
  });
});
