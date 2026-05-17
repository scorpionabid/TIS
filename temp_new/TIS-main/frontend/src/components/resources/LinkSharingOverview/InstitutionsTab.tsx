import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  Search,
  Users as UsersIcon,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
  const { currentUser } = useAuth();
  const [instSearchTerm, setInstSearchTerm] = useState("");

  const filteredSectors = useMemo(() => {
    if (!instSearchTerm) return sectorsForDisplay;
    
    const term = instSearchTerm.toLowerCase();
    return sectorsForDisplay.map(sector => {
      const filteredSchools = sector.schools.filter(school => 
        school.name.toLowerCase().includes(term) || 
        (school.utis_code && school.utis_code.includes(term))
      );
      
      if (filteredSchools.length > 0 || sector.name.toLowerCase().includes(term)) {
        return {
          ...sector,
          schools: filteredSchools.length > 0 ? filteredSchools : sector.schools
        };
      }
      return null;
    }).filter(Boolean) as SectorWithAccess[];
  }, [sectorsForDisplay, instSearchTerm]);

  return (
    <>
      <div className="relative mb-8 group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl blur opacity-25 group-focus-within:opacity-75 transition duration-500"></div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="Müəssisə və ya sektor üzrə sürətli axtarış..."
            className="pl-12 h-14 bg-white border-gray-100 rounded-2xl shadow-sm focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium"
            value={instSearchTerm}
            onChange={(e) => setInstSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Sectors List */}
      {!hasSectors ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-gradient-to-b from-gray-50/50 to-white rounded-[40px] border-2 border-dashed border-gray-100">
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-50 mb-6 transform hover:rotate-6 transition-transform">
            <Building2 className="h-12 w-12 text-gray-200" />
          </div>
          <p className="text-xl font-black text-gray-500 tracking-tight">
            {hasUserTargets
              ? "Müəssisə hədəfi tapılmadı"
              : "Heç bir müəssisə ilə paylaşılmayıb"}
          </p>
          {hasUserTargets && (
            <p className="text-sm mt-3 text-indigo-500 font-bold bg-indigo-50 px-4 py-1.5 rounded-full">
              Zəhmət olmasa "İstifadəçilər" bölməsinə baxın
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSectors.map((sector, idx) => {
            const sectorKey = sector.id ?? "ungrouped";
            const isExpanded = expandedSectors.has(sectorKey);
            const sectorAccessedCount = sector.schools.filter(
              (s) => s.has_accessed
            ).length;
            const sectorNotAccessedCount =
              sector.schools.length - sectorAccessedCount;
            const completionRate = Math.round((sectorAccessedCount / sector.schools.length) * 100) || 0;

            return (
              <div
                key={sectorKey}
                style={{ animationDelay: `${idx * 100}ms` }}
                className={cn(
                  "group/sector border rounded-[32px] overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-4",
                  isExpanded 
                    ? "border-blue-200 shadow-2xl shadow-blue-500/10 ring-1 ring-blue-50 scale-[1.01]" 
                    : "border-gray-100 hover:border-blue-100 bg-white hover:shadow-xl hover:shadow-gray-200/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSector(sectorKey)}
                  className={cn(
                    "w-full flex items-center justify-between p-6 text-left transition-all",
                    isExpanded ? "bg-gradient-to-b from-blue-50/50 to-white" : "bg-white"
                  )}
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <div className={cn(
                      "p-4 rounded-[20px] transition-all duration-500 transform shadow-inner",
                      isExpanded ? "bg-blue-600 text-white shadow-lg shadow-blue-200 rotate-6" : "bg-gray-50 text-gray-400 group-hover/sector:bg-blue-50 group-hover/sector:text-blue-500"
                    )}>
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "font-black text-lg tracking-tight truncate transition-colors duration-300",
                          isExpanded ? "text-blue-900" : "text-gray-800"
                        )}>
                          {sector.name || "Naməlum Sektor"}
                        </span>
                        <div className={cn(
                          "p-1.5 rounded-full transition-all duration-300",
                          isExpanded ? "bg-blue-100 text-blue-600 rotate-180" : "bg-gray-50 text-gray-400"
                        )}>
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.15em] opacity-60">
                        {sector.region_name && (
                          <span className="flex items-center gap-1.5 text-indigo-600">
                            <MapPin className="h-3 w-3" />
                            {sector.region_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-blue-600">
                          <School className="h-3 w-3" />
                          {sector.school_count} Müəssisə
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden lg:flex flex-col items-end gap-2 mr-4 min-w-[140px]">
                      <div className="flex items-center justify-between w-full px-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">İcra Faizi</span>
                        <span className={cn("text-[10px] font-black", completionRate === 100 ? "text-emerald-500" : "text-blue-600")}>{completionRate}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner p-[1px]">
                        <Progress value={completionRate} className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          completionRate === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"
                        )} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {sectorAccessedCount > 0 && (
                        <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full flex items-center gap-2 border border-emerald-100 shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-xs font-black">{sectorAccessedCount}</span>
                        </div>
                      )}
                      {sectorNotAccessedCount > 0 && (
                        <div className="bg-red-50 text-red-700 px-4 py-1.5 rounded-full flex items-center gap-2 border border-red-100 shadow-sm">
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="text-xs font-black">{sectorNotAccessedCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-8 pb-8 pt-2 bg-white animate-in slide-in-from-top-4 duration-500">
                    {sector.schools.length === 0 ? (
                      <div className="py-16 text-center bg-gray-50/50 rounded-[24px] border border-dashed border-gray-100">
                        <p className="text-sm text-gray-400 font-bold italic">
                          Bu sektorda hədəf müəssisə tapılmadı.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[24px] border border-gray-100 shadow-xl shadow-gray-200/20 bg-white">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                              <th className="px-8 py-5 font-black text-gray-500 text-[10px] uppercase tracking-[0.2em] text-left">Müəssisə Adı</th>
                              <th className="px-8 py-5 font-black text-gray-500 text-[10px] uppercase tracking-[0.2em] text-left">Giriş Statusu</th>
                              <th className="px-8 py-5 font-black text-gray-500 text-[10px] uppercase tracking-[0.2em] text-right">İdarəetmə</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {sector.schools.map((school) => (
                              <tr
                                key={school.id}
                                className="hover:bg-blue-50/30 transition-all duration-300 group/row"
                              >
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-gray-50 rounded-xl group-hover/row:bg-blue-100 group-hover/row:scale-110 transition-all duration-300 shadow-inner">
                                      <School className="h-4 w-4 text-gray-400 group-hover/row:text-blue-600" />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-black text-gray-800 group-hover/row:text-blue-900 transition-colors">{school.name}</span>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider h-4 bg-gray-50/50">UTİS: {school.utis_code || '---'}</Badge>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  {school.link_url || selectedLink?.url ? (
                                    <div className="flex items-center gap-3">
                                      <a
                                        href={school.link_url || selectedLink.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          "inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black transition-all shadow-sm border",
                                          school.has_accessed
                                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 hover:shadow-emerald-200"
                                            : "bg-red-50 text-red-700 hover:bg-red-100 border-red-100 hover:shadow-red-200"
                                        )}
                                      >
                                        {school.has_accessed ? (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        ) : (
                                          <XCircle className="h-3.5 w-3.5" />
                                        )}
                                        {school.has_accessed ? "Açılıb" : "Açılmayıb"}
                                        <ExternalLink className="h-3 w-3 ml-1 opacity-50 group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5 transition-transform" />
                                      </a>
                                      {school.has_accessed && school.access_count > 0 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="p-2 bg-gray-50 rounded-full cursor-help hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100 shadow-sm">
                                              <Info className="h-4 w-4 text-gray-400" />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent className="p-4 rounded-2xl shadow-2xl border-none bg-white ring-1 ring-gray-100 animate-in zoom-in-95 duration-200">
                                            <div className="text-xs space-y-3 min-w-[180px]">
                                              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Ümumi Giriş</span>
                                                <span className="font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-base">{school.access_count}</span>
                                              </div>
                                              <div className="space-y-2">
                                                {school.first_accessed_at && (
                                                  <div className="flex flex-col">
                                                    <span className="text-gray-400 text-[9px] font-black uppercase tracking-widest">İlk fəaliyyət</span>
                                                    <span className="font-bold text-gray-700">{formatDate(school.first_accessed_at)}</span>
                                                  </div>
                                                )}
                                                {school.last_accessed_at && (
                                                  <div className="flex flex-col border-t border-gray-50 pt-2">
                                                    <span className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Son fəaliyyət</span>
                                                    <span className="font-bold text-blue-600">{formatDate(school.last_accessed_at)}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-gray-300 italic">URL Mövcud deyil</Badge>
                                  )}
                                </td>
                                <td className="px-8 py-5 text-right">
                                  {(() => {
                                    const isUploader = !!currentUser?.id && selectedLink?.created_by === currentUser.id;
                                    let canModify = false;
                                    const roleStr = typeof currentUser?.role === 'string' ? currentUser.role : currentUser?.role?.name;
                                    const role = roleStr?.toLowerCase();
                                    
                                    if (isUploader) {
                                      canModify = true;
                                    } else if (role) {
                                      canModify = ['superadmin', 'regionadmin'].includes(role);
                                    }

                                    return canModify && onResourceAction && selectedLink && (
                                      <div className="flex items-center justify-end gap-2">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() =>
                                                onResourceAction(
                                                  {
                                                    ...selectedLink,
                                                    id: school.link_id,
                                                    url: school.link_url || selectedLink.url
                                                  } as Resource,
                                                  "edit"
                                                )
                                              }
                                              className="h-10 w-10 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-gray-50"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Məlumatı yenilə</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() =>
                                                onResourceAction(
                                                  {
                                                    ...selectedLink,
                                                    id: school.link_id,
                                                  } as Resource,
                                                  "delete"
                                                )
                                              }
                                              className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-gray-50"
                                            >
                                              <XCircle className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Hədəfdən sil</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    );
                                  })()}
                                </td>
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

      {/* Not Accessed Institutions Callout */}
      <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <NotAccessedCallout notAccessedInstitutions={notAccessedInstitutions} />
      </div>
    </>
  );
};
