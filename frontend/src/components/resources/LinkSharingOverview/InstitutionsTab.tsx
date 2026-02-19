import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  School,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  Edit,
} from "lucide-react";
import type { Resource } from "@/types/resources";
import type {
  SectorWithAccess,
  LinkSharingOverviewWithAccess,
  NotAccessedInstitution,
  DerivedTotals,
} from "./types";
import { NotAccessedCallout } from "./NotAccessedCallout";

interface InstitutionsTabProps {
  sectorsForDisplay: SectorWithAccess[];
  derivedTotals: DerivedTotals;
  totalSectors: number;
  totalSchools: number;
  accessedCount: number | undefined;
  notAccessedCount: number | undefined;
  accessRate: number | undefined;
  expandedSectors: Set<number | "ungrouped">;
  toggleSector: (sectorId: number | "ungrouped") => void;
  formatDate: (dateString: string | null) => string;
  overview: LinkSharingOverviewWithAccess;
  selectedLink: Resource;
  onResourceAction?: (resource: Resource, action: "edit" | "delete") => void;
  notAccessedInstitutions: NotAccessedInstitution[];
  hasSectors: boolean;
  hasUserTargets: boolean;
}

export const InstitutionsTab = ({
  sectorsForDisplay,
  totalSectors,
  totalSchools,
  accessedCount,
  notAccessedCount,
  accessRate,
  expandedSectors,
  toggleSector,
  formatDate,
  overview,
  selectedLink,
  onResourceAction,
  notAccessedInstitutions,
  hasSectors,
  hasUserTargets,
}: InstitutionsTabProps) => {
  return (
    <>
      {/* Statistics Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          {totalSectors} sektor
        </Badge>
        <Badge variant="secondary" className="bg-green-50 text-green-700">
          {totalSchools} məktəb
        </Badge>
        {accessedCount !== undefined && (
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {accessedCount} açılıb
          </Badge>
        )}
        {notAccessedCount !== undefined && notAccessedCount > 0 && (
          <Badge variant="secondary" className="bg-red-50 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            {notAccessedCount} açılmayıb
          </Badge>
        )}
      </div>

      {/* Access Progress Bar */}
      {accessRate !== undefined && totalSchools > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Açılma faizi</span>
            <span className="font-medium">{accessRate}%</span>
          </div>
          <Progress value={accessRate} className="h-2" />
        </div>
      )}

      {/* Sectors List */}
      {!hasSectors ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Building2 className="h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm">
            {hasUserTargets
              ? "Bu link müəssisələrlə deyil, xüsusi istifadəçilərlə paylaşılıb."
              : "Heç bir müəssisə ilə paylaşılmayıb."}
          </p>
          {hasUserTargets && (
            <p className="text-xs mt-2 text-violet-600">
              İstifadəçilər tabına keçin
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sectorsForDisplay.map((sector) => {
            const sectorKey = sector.id ?? "ungrouped";
            const isExpanded = expandedSectors.has(sectorKey);
            const sectorAccessedCount = sector.schools.filter(
              (s) => s.has_accessed
            ).length;
            const sectorNotAccessedCount =
              sector.schools.length - sectorAccessedCount;

            return (
              <div
                key={sectorKey}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSector(sectorKey)}
                  className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition"
                >
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">
                        {sector.name || "Sektor müəyyən edilməyib"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                      {sector.region_name && (
                        <span>Region: {sector.region_name}</span>
                      )}
                      <span>
                        Status:{" "}
                        {sector.is_full_coverage
                          ? "Bütün məktəblər"
                          : "Seçilmiş məktəblər"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sectorAccessedCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        {sectorAccessedCount} ✓
                      </Badge>
                    )}
                    {sectorNotAccessedCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-red-50 text-red-700 border-red-200"
                      >
                        {sectorNotAccessedCount} ✗
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {sector.school_count} məktəb
                    </Badge>
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-4">
                    {sector.schools.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Bu sektorda məktəb tapılmadı.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="pb-2 font-medium">Məktəb</th>
                              <th className="pb-2 font-medium">Link</th>
                              <th className="pb-2 font-medium">Linkə keçid</th>
                              {onResourceAction && selectedLink && (
                                <th className="pb-2 font-medium text-right">
                                  Düzəliş
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {sector.schools.map((school) => (
                              <tr
                                key={school.id}
                                className="border-t text-sm"
                              >
                                <td className="py-2 flex items-center gap-2">
                                  <School className="h-3.5 w-3.5 text-muted-foreground" />
                                  {school.name}
                                </td>
                                <td className="py-2">
                                  {overview.link_title}
                                </td>
                                <td className="py-2">
                                  {school.link_url || selectedLink?.url ? (
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={
                                          school.link_url || selectedLink.url
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`inline-flex items-center gap-1 hover:underline ${
                                          school.has_accessed
                                            ? "text-green-600 hover:text-green-700"
                                            : "text-red-600 hover:text-red-700"
                                        }`}
                                      >
                                        {school.has_accessed ? (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        ) : (
                                          <XCircle className="h-3.5 w-3.5" />
                                        )}
                                        {school.has_accessed
                                          ? "Açılıb"
                                          : "Açılmayıb"}
                                        <ExternalLink className="h-3 w-3 ml-0.5" />
                                      </a>
                                      {school.has_accessed &&
                                        school.access_count > 0 && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                type="button"
                                                className="ml-1"
                                              >
                                                <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <div className="text-xs space-y-1">
                                                <p>
                                                  <strong>
                                                    {school.access_count}
                                                  </strong>{" "}
                                                  dəfə açılıb
                                                </p>
                                                {school.first_accessed_at && (
                                                  <p>
                                                    İlk:{" "}
                                                    {formatDate(
                                                      school.first_accessed_at
                                                    )}
                                                  </p>
                                                )}
                                                {school.last_accessed_at && (
                                                  <p>
                                                    Son:{" "}
                                                    {formatDate(
                                                      school.last_accessed_at
                                                    )}
                                                  </p>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      URL mövcud deyil
                                    </span>
                                  )}
                                </td>
                                {onResourceAction && selectedLink && (
                                  <td className="py-2 text-right">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            onResourceAction(
                                              selectedLink,
                                              "edit"
                                            )
                                          }
                                          className="h-7 w-7 text-primary hover:text-primary"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Düzəliş et
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Not Accessed Institutions */}
      <NotAccessedCallout notAccessedInstitutions={notAccessedInstitutions} />
    </>
  );
};
