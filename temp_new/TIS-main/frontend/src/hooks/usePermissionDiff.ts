import { useState } from "react";
import { apiClient } from "@/services/api";

interface PermissionDiff {
  added: string[];
  removed: string[];
  missing_dependencies: Record<string, string[]>;
  missing_required: string[];
  not_allowed: string[];
  admin_missing_permissions: string[];
}

export function usePermissionDiff() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dryRunValidate(params: {
    userId?: number | null;
    roleName?: string | null;
    proposed: string[];
  }): Promise<PermissionDiff | null> {
    setLoading(true);
    setError(null);
    try {
      // Use apiClient instead of fetch to ensure proper URL, auth token, and CORS
      const response = await apiClient.post<
        PermissionDiff | { success: boolean; data: PermissionDiff }
      >("/regionadmin/users/permissions/validate", {
        user_id: params.userId,
        role_name: params.roleName,
        assignable_permissions: params.proposed,
      });

      // Debug logging
      console.log("🔍 Permission validate response:", {
        fullResponse: response,
        data: response.data,
        success: (response as any)?.success ?? response?.data?.success,
      });

      const topLevelSuccess = (response as any)?.success;
      const nestedSuccess =
        response.data && typeof response.data === "object" && "success" in response.data
          ? (response.data as any).success
          : undefined;

      if (typeof topLevelSuccess === "boolean") {
        if (topLevelSuccess) {
          const payload =
            (response as any)?.data && "data" in (response as any).data
              ? ((response as any).data as any).data
              : (response as any).data;
          console.log("✅ Validation successful (top level), returning:", payload);
          return payload as PermissionDiff;
        }
        console.error("❌ Server reported failure (top level):", response);
        setError("Server did not return success");
        return null;
      }

      if (typeof nestedSuccess === "boolean") {
        if (nestedSuccess) {
          console.log("✅ Validation successful (nested), returning data:", (response.data as any).data);
          return (response.data as any).data as PermissionDiff;
        }
        console.error("❌ Server reported failure (nested):", response);
        setError("Server did not return success");
        return null;
      }

      console.log("ℹ️ No explicit success flag; assuming response.data is diff object");
      return response.data as PermissionDiff;
    } catch (err: any) {
      setError(err?.message || "Validation request failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function clientDiff(current: string[], proposed: string[]) {
    const added = proposed.filter((p) => !current.includes(p));
    const removed = current.filter((p) => !proposed.includes(p));
    return { added, removed };
  }

  return { dryRunValidate, clientDiff, loading, error };
}
