import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BulkAttendanceTableView from "../components/BulkAttendanceTableView";
import { ClassWithAttendance } from "@/services/bulkAttendance";
import { AttendanceFormData, AttendanceSession } from "../types";

// Mock the AttendanceNumberInput component
vi.mock("../components/AttendanceNumberInput", () => ({
  default: ({ value, onChange, "data-testid": dataTestId, disabled }: any) => (
    <input
      data-testid={dataTestId}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      type="number"
    />
  ),
}));

const mockClasses: ClassWithAttendance[] = [
  {
    id: 1,
    name: "1A",
    level: "1",
    total_students: 25,
    homeroom_teacher: { id: 1, name: "Teacher 1" },
    attendance: {
      id: 1,
      morning_present: 22,
      morning_excused: 2,
      morning_unexcused: 1,
      evening_present: 0,
      evening_excused: 0,
      evening_unexcused: 0,
      uniform_violation: 1,
      morning_attendance_rate: 88,
      evening_attendance_rate: 0,
      daily_attendance_rate: 44,
      morning_notes: "",
      evening_notes: "",
      is_complete: false,
      morning_recorded_at: "2024-01-01T10:00:00Z",
      evening_recorded_at: null,
    },
  },
  {
    id: 2,
    name: "2B",
    level: "2",
    total_students: 30,
    homeroom_teacher: { id: 2, name: "Teacher 2" },
    attendance: {
      id: 2,
      morning_present: 30,
      morning_excused: 0,
      morning_unexcused: 0,
      evening_present: 0,
      evening_excused: 0,
      evening_unexcused: 0,
      uniform_violation: 0,
      morning_attendance_rate: 100,
      evening_attendance_rate: 0,
      daily_attendance_rate: 50,
      morning_notes: "",
      evening_notes: "",
      is_complete: false,
      morning_recorded_at: null,
      evening_recorded_at: null,
    },
  },
];

const mockAttendanceData: AttendanceFormData = {
  "1": {
    morning_present: 22,
    morning_excused: 2,
    morning_unexcused: 1,
    evening_present: 0,
    evening_excused: 0,
    evening_unexcused: 0,
    uniform_violation: 1,
    morning_notes: "",
    evening_notes: "",
  },
  "2": {
    morning_present: 30,
    morning_excused: 0,
    morning_unexcused: 0,
    evening_present: 0,
    evening_excused: 0,
    evening_unexcused: 0,
    uniform_violation: 0,
    morning_notes: "",
    evening_notes: "",
  },
};

describe("BulkAttendanceTableView", () => {
  const mockUpdateAttendance = vi.fn();
  const mockGetAttendanceRate = vi.fn((present: number, total: number) => {
    return total > 0 ? Math.round((present / total) * 100) : 0;
  });

  beforeEach(() => {
    mockUpdateAttendance.mockClear();
    mockGetAttendanceRate.mockClear();
  });

  it("should render class rows correctly", () => {
    render(
      <BulkAttendanceTableView
        session="morning"
        classes={mockClasses}
        attendanceData={mockAttendanceData}
        updateAttendance={mockUpdateAttendance}
        errors={{}}
        getAttendanceRate={mockGetAttendanceRate}
      />,
    );

    expect(screen.getByTestId("bulk-table")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-row-2")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-total-1")).toHaveTextContent("25");
    expect(screen.getByTestId("bulk-total-2")).toHaveTextContent("30");
  });

  it("should calculate footer summary correctly (present + absent = total)", () => {
    render(
      <BulkAttendanceTableView
        session="morning"
        classes={mockClasses}
        attendanceData={mockAttendanceData}
        updateAttendance={mockUpdateAttendance}
        errors={{}}
        getAttendanceRate={mockGetAttendanceRate}
      />,
    );

    const footer = screen.getByTestId("bulk-table-footer");
    expect(footer).toBeInTheDocument();

    // Check that summary calculations are present
    expect(screen.getByText("55")).toBeInTheDocument(); // Total students (25 + 30)
    expect(screen.getByText("22")).toBeInTheDocument(); // Present students (25-2-1 + 30-0-0)
  });

  it("should show empty state when no classes data", () => {
    render(
      <BulkAttendanceTableView
        session="morning"
        classes={[]}
        attendanceData={{}}
        updateAttendance={mockUpdateAttendance}
        errors={{}}
        getAttendanceRate={mockGetAttendanceRate}
      />,
    );

    expect(screen.getByTestId("bulk-table")).toBeInTheDocument();
    expect(screen.queryByTestId("bulk-row-1")).not.toBeInTheDocument();
  });

  it("should calculate attendance rate correctly", () => {
    render(
      <BulkAttendanceTableView
        session="morning"
        classes={mockClasses}
        attendanceData={mockAttendanceData}
        updateAttendance={mockUpdateAttendance}
        errors={{}}
        getAttendanceRate={mockGetAttendanceRate}
      />,
    );

    // For class 1: 25 total - 2 excused - 1 unexcused = 22 present = 88%
    expect(mockGetAttendanceRate).toHaveBeenCalledWith(22, 25);

    // For class 2: 30 total - 0 excused - 0 unexcused = 30 present = 100%
    expect(mockGetAttendanceRate).toHaveBeenCalledWith(30, 30);
  });

  it("should render attendance inputs with correct test IDs", () => {
    render(
      <BulkAttendanceTableView
        session="morning"
        classes={mockClasses}
        attendanceData={mockAttendanceData}
        updateAttendance={mockUpdateAttendance}
        errors={{}}
        getAttendanceRate={mockGetAttendanceRate}
      />,
    );

    // Check that inputs have correct data-testid attributes
    expect(
      screen.getByTestId("attendance-input-1-morning-excused"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("attendance-input-1-morning-unexcused"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("attendance-input-1-uniform-violation"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("attendance-input-2-morning-excused"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("attendance-input-2-morning-unexcused"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("attendance-input-2-uniform-violation"),
    ).toBeInTheDocument();
  });

  it("should display error styling when errors are present", () => {
    const errorsWithClass = { "1_morning": "Test error message" };

    render(
      <BulkAttendanceTableView
        session="morning"
        classes={mockClasses}
        attendanceData={mockAttendanceData}
        updateAttendance={mockUpdateAttendance}
        errors={errorsWithClass}
        getAttendanceRate={mockGetAttendanceRate}
      />,
    );

    const rowWithError = screen.getByTestId("bulk-row-1");
    expect(rowWithError).toHaveClass("bg-red-50");
  });

  it("should display mismatch styling when totals do not match", () => {
    const mismatchedData: AttendanceFormData = {
      "1": {
        morning_present: 0,
        morning_excused: 15,
        morning_unexcused: 15,
        evening_present: 0,
        evening_excused: 0,
        evening_unexcused: 0,
        uniform_violation: 0,
        morning_notes: "",
        evening_notes: "",
      },
    };

    render(
      <BulkAttendanceTableView
        session="morning"
        classes={mockClasses}
        attendanceData={mismatchedData}
        updateAttendance={mockUpdateAttendance}
        errors={{}}
        getAttendanceRate={mockGetAttendanceRate}
      />,
    );

    // Class 1: 15 excused + 15 unexcused = 30, which is > 25 (total), so mismatch
    const rowWithMismatch = screen.getByTestId("bulk-row-1");
    expect(rowWithMismatch).toHaveClass("bg-orange-50");
  });
});
