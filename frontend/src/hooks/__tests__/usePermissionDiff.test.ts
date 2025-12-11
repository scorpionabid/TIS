import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePermissionDiff } from "../usePermissionDiff";

describe("usePermissionDiff", () => {
  beforeEach(() => {
    // reset fetch mock
    (global as any).fetch = undefined;
  });

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

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      )
    );

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
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("err"),
        })
      )
    );

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
