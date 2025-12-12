import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePermissionDiff } from "../usePermissionDiff";
import { apiClient } from "@/services/api";

describe("usePermissionDiff", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("computes client diff correctly", () => {
    const { result } = renderHook(() => usePermissionDiff());
    const diff = result.current.clientDiff(["a", "b"], ["b", "c"]);
    expect(diff.added).toEqual(["c"]);
    expect(diff.removed).toEqual(["a"]);
  });

  it("dryRunValidate returns data on success", async () => {
    const mockResponse = {
      success: true,
      data: {
        added: ["users.delete"],
        removed: [],
        missing_dependencies: { "users.delete": ["users.read"] },
        missing_required: [],
        not_allowed: [],
        admin_missing_permissions: [],
      },
    };

    vi.spyOn(apiClient, "post").mockResolvedValue({ data: mockResponse } as any);

    const { result } = renderHook(() => usePermissionDiff());

    const res = await act(async () =>
      result.current.dryRunValidate({
        userId: null,
        roleName: "sektoradmin",
        proposed: ["users.delete"],
      })
    );

    expect(res).not.toBeNull();
    expect((res as any).added).toContain("users.delete");
  });

  it("dryRunValidate handles server error", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => usePermissionDiff());
    const res = await act(async () =>
      result.current.dryRunValidate({
        userId: null,
        roleName: "sektoradmin",
        proposed: [],
      })
    );
    expect(res).toBeNull();
    expect(result.current.error).toContain("Server error");
  });
});
