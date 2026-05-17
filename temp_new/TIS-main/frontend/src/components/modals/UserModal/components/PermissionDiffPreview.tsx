import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  added: string[];
  removed: string[];
  missing_dependencies: Record<string, string[]>;
  missing_required: string[];
  not_allowed: string[];
  admin_missing_permissions: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PermissionDiffPreview({
  added,
  removed,
  missing_dependencies,
  missing_required,
  not_allowed,
  admin_missing_permissions,
  onConfirm,
  onCancel,
}: Props) {
  const hasIssues =
    (missing_required && missing_required.length > 0) ||
    Object.keys(missing_dependencies || {}).length > 0 ||
    (not_allowed && not_allowed.length > 0) ||
    (admin_missing_permissions && admin_missing_permissions.length > 0);

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-semibold">Dəyişiklik önizləməsi</h3>

      <div className="flex gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Əlavə olunacaq</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {added.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Heç bir əlavə yoxdur
              </span>
            ) : (
              added.map((p) => (
                <Badge key={p} variant="outline" className="text-xs">
                  {p}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Silinəcək</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {removed.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Heç bir silinmə yoxdur
              </span>
            ) : (
              removed.map((p) => (
                <Badge key={p} variant="destructive" className="text-xs">
                  {p}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>

      {hasIssues && (
        <div className="p-3 border rounded-md bg-muted/50">
          <h4 className="text-xs font-semibold">Xəbərdarlıqlar / Tələbələr</h4>
          <div className="mt-2 text-xs space-y-2">
            {missing_required.length > 0 && (
              <div>
                <p className="font-medium text-sm">
                  Məcburi icazələr çatışmır:
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {missing_required.map((p) => (
                    <Badge key={p} variant="destructive" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(missing_dependencies || {}).length > 0 && (
              <div>
                <p className="font-medium text-sm">Asılılıqlar çatışmır:</p>
                <div className="flex flex-col gap-1 mt-1 text-xs">
                  {Object.entries(missing_dependencies).map(([perm, deps]) => (
                    <div key={perm}>
                      <strong>{perm}</strong>: {deps.join(", ")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {not_allowed.length > 0 && (
              <div>
                <p className="font-medium text-sm">
                  Bu rol üçün icazə verilmir:
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {not_allowed.map((p) => (
                    <Badge key={p} variant="destructive" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {admin_missing_permissions.length > 0 && (
              <div>
                <p className="font-medium text-sm">Sizdə olmayan icazələr:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {admin_missing_permissions.map((p) => (
                    <Badge key={p} variant="destructive" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Geri
        </Button>
        <Button
          variant={hasIssues ? "destructive" : "default"}
          onClick={onConfirm}
        >
          {hasIssues ? "Təsdiq et (riskli)" : "Təsdiq et"}
        </Button>
      </div>
    </div>
  );
}
