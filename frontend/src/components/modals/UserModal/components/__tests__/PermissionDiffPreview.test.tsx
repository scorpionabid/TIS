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
    expect(screen.getAllByText("users.create").length).toBeGreaterThan(0);
    expect(screen.getByText("reports.view")).toBeTruthy();

    fireEvent.click(screen.getByText(/Təsdiq et/i));
    expect(onConfirm).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Geri/i));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows warnings and destructive CTA when issues exist", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <PermissionDiffPreview
        onConfirm={onConfirm}
        onCancel={onCancel}
        added={[]}
        removed={[]}
        missing_dependencies={{ "users.update": ["users.read"] }}
        missing_required={["users.read"]}
        not_allowed={["approvals.approve"]}
        admin_missing_permissions={["documents.share"]}
      />
    );

    expect(screen.getByText(/Məcburi icazələr çatışmır/i)).toBeTruthy();
    expect(screen.getByText("users.read")).toBeTruthy();
    expect(screen.getByText(/Asılılıqlar çatışmır/i)).toBeTruthy();
    expect(screen.getByText("users.update")).toBeTruthy();
    expect(screen.getByText(/Bu rol üçün icazə verilmir/i)).toBeTruthy();
    expect(screen.getByText("approvals.approve")).toBeTruthy();
    expect(screen.getByText(/Sizdə olmayan icazələr/i)).toBeTruthy();
    expect(screen.getByText("documents.share")).toBeTruthy();

    const confirmButton = screen.getByText(/Təsdiq et \(riskli\)/i);
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Geri/i));
    expect(onCancel).toHaveBeenCalled();
  });
});
