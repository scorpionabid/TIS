import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import type { LinkSharingOverviewWithAccess } from "./types";

interface UsersTabProps {
  overview: LinkSharingOverviewWithAccess;
  hasUserTargets: boolean;
}

export const UsersTab = ({ overview, hasUserTargets }: UsersTabProps) => {
  if (!hasUserTargets) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Users className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm">Heç bir istifadəçi ilə paylaşılmayıb.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Users className="h-4 w-4" />
        <span>Birbaşa paylaşılan istifadəçilər</span>
        <Badge variant="secondary">
          {overview.target_users?.length || 0}
        </Badge>
      </div>
      {overview.target_users?.map((user) => (
        <div
          key={user.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg px-3 py-2"
        >
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.username || user.email || `İstifadəçi #${user.id}`}
            </p>
          </div>
          {user.roles && user.roles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <Badge
                  key={`${user.id}-${role}`}
                  variant="outline"
                  className="text-xs"
                >
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
