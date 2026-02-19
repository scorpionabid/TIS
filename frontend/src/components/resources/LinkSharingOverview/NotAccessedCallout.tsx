import { Badge } from "@/components/ui/badge";
import { AlertCircle, School, XCircle } from "lucide-react";
import type { NotAccessedInstitution } from "./types";

interface NotAccessedCalloutProps {
  notAccessedInstitutions: NotAccessedInstitution[];
}

export const NotAccessedCallout = ({
  notAccessedInstitutions,
}: NotAccessedCalloutProps) => {
  if (notAccessedInstitutions.length === 0) return null;

  return (
    <div className="mt-4 border border-red-200 rounded-lg">
      <div className="p-3 border-b border-red-200 bg-red-50/30">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          Açılmamış müəssisələr ({notAccessedInstitutions.length})
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Bu müəssisələr hələ linki açmayıb
        </p>
      </div>
      <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
        {notAccessedInstitutions.map((inst) => (
          <div
            key={inst.id}
            className="flex items-center justify-between p-2 border rounded-lg bg-red-50/50"
          >
            <div className="flex items-center gap-2">
              <School className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{inst.name}</p>
                <p className="text-xs text-muted-foreground">
                  {inst.sector_name}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-red-600 border-red-200 bg-red-50"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Açılmayıb
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
