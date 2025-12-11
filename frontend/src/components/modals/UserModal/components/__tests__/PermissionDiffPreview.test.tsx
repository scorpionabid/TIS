import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PermissionDiffPreview } from "../PermissionDiffPreview";

describe("PermissionDiffPreview", () => {
  it("renders added and removed lists and calls callbacks", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <PermissionDiffPreview
        onConfirm={onConfirm}
        onCancel={onCancel}
        added={["users.create"]}
        removed={["reports.view"]}
        missing_dependencies={{ "users.create": ["users.read"] }}
        missing_required={[]}
        not_allowed={[]}
        admin_missing_permissions={[]}
      />
    );

    expect(screen.getByText(/Əlavə olunacaq/i)).toBeTruthy();
    expect(screen.getByText("users.create")).toBeTruthy();
    expect(screen.getByText("reports.view")).toBeTruthy();

    fireEvent.click(screen.getByText(/Təsdiq et/i));
    expect(onConfirm).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Geri/i));
    expect(onCancel).toHaveBeenCalled();
  });
});
