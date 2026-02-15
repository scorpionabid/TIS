import React, { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronRight,
  Building2,
  MapPin,
  GraduationCap,
  FileText,
  Search,
  FolderOpen,
} from 'lucide-react';
import DocumentTable from './DocumentTable';
import { GroupedResources } from '@/hooks/useResourceGrouping';
import { DocumentLevelTab, SectorWithSchools } from '@/hooks/resources/useDocumentsByLevel';
import { Resource } from '@/types/resources';

interface DocumentLevelTabsProps {
  groups: {
    region: GroupedResources[];
    sektor: GroupedResources[];
    school: GroupedResources[];
  };
  schoolsBySector: SectorWithSchools[];
  tabCounts: { region: number; sektor: number; school: number };
  visibleTabs: DocumentLevelTab[];
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  userDirectory: Record<number, string>;
}

const TAB_CONFIG: Record<DocumentLevelTab, { label: string; icon: React.ReactNode; color: string }> = {
  region: {
    label: 'Region',
    icon: <Building2 className="h-4 w-4" />,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  sektor: {
    label: 'Sektor',
    icon: <MapPin className="h-4 w-4" />,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  school: {
    label: 'Mekteb',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
  },
};

function DocumentLevelTabs({
  groups,
  schoolsBySector,
  tabCounts,
  visibleTabs,
  onResourceAction,
  userDirectory,
}: DocumentLevelTabsProps) {
  const defaultTab = visibleTabs[0] ?? 'region';

  if (visibleTabs.length === 0) return null;

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full flex gap-1 h-auto p-1 bg-muted/50">
        {visibleTabs.map((tab) => {
          const config = TAB_CONFIG[tab];
          return (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 data-[state=active]:shadow-sm"
            >
              {config.icon}
              <span className="font-medium">{config.label}</span>
              <Badge
                variant="secondary"
                className={`ml-1 text-xs ${tabCounts[tab] > 0 ? 'bg-primary/10 text-primary' : ''}`}
              >
                {tabCounts[tab]}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {visibleTabs.map((tab) => (
        <TabsContent key={tab} value={tab} className="mt-4">
          {tab === 'school' ? (
            <SchoolTabContent
              schoolsBySector={schoolsBySector}
              flatGroups={groups.school}
              onResourceAction={onResourceAction}
              userDirectory={userDirectory}
            />
          ) : (
            <DocumentGroupList
              groups={groups[tab]}
              tabType={tab}
              onResourceAction={onResourceAction}
              userDirectory={userDirectory}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// ─── School Tab with Search + Sector Grouping ────────────────────────

interface SchoolTabContentProps {
  schoolsBySector: SectorWithSchools[];
  flatGroups: GroupedResources[];
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  userDirectory: Record<number, string>;
}

function SchoolTabContent({
  schoolsBySector,
  flatGroups,
  onResourceAction,
  userDirectory,
}: SchoolTabContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSectors, setExpandedSectors] = useState<Set<number>>(() =>
    new Set(schoolsBySector.map((s) => s.sectorId))
  );
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(() =>
    new Set(flatGroups.map((g) => g.groupKey))
  );

  // Filter schools by search term
  const filteredSectors = useMemo(() => {
    if (!searchTerm.trim()) return schoolsBySector;

    const term = searchTerm.toLowerCase().trim();
    return schoolsBySector
      .map((sector) => {
        const matchingSchools = sector.schools.filter(
          (school) =>
            school.groupLabel.toLowerCase().includes(term) ||
            sector.sectorName.toLowerCase().includes(term)
        );
        if (matchingSchools.length === 0) return null;
        return {
          ...sector,
          schools: matchingSchools,
          totalCount: matchingSchools.reduce((sum, s) => sum + s.count, 0),
        };
      })
      .filter(Boolean) as SectorWithSchools[];
  }, [schoolsBySector, searchTerm]);

  const totalSchoolCount = filteredSectors.reduce((sum, s) => sum + s.schools.length, 0);
  const totalDocCount = filteredSectors.reduce((sum, s) => sum + s.totalCount, 0);

  const toggleSector = (sectorId: number) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sectorId)) next.delete(sectorId);
      else next.add(sectorId);
      return next;
    });
  };

  const toggleSchool = (groupKey: string) => {
    setExpandedSchools((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSectors(new Set(filteredSectors.map((s) => s.sectorId)));
    setExpandedSchools(
      new Set(filteredSectors.flatMap((s) => s.schools.map((sch) => sch.groupKey)))
    );
  };

  const collapseAll = () => {
    setExpandedSectors(new Set());
    setExpandedSchools(new Set());
  };

  if (schoolsBySector.length === 0 && flatGroups.length === 0) {
    return <EmptyState message="Mekteb seviyyesinde sened tapilmadi" />;
  }

  return (
    <div className="space-y-3">
      {/* Search + Stats Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mekteb axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {totalSchoolCount} mekteb, {totalDocCount} sened
          </span>
          {filteredSectors.length > 1 && (
            <>
              <span>|</span>
              <button onClick={expandAll} className="text-primary hover:underline">
                Hamisini ac
              </button>
              <span>|</span>
              <button onClick={collapseAll} className="text-primary hover:underline">
                Hamisini bagla
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search no-result */}
      {searchTerm && filteredSectors.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            &ldquo;{searchTerm}&rdquo; ucun neticesi tapilmadi
          </p>
        </div>
      )}

      {/* Sector -> Schools hierarchy */}
      {filteredSectors.map((sector) => {
        const isSectorExpanded = expandedSectors.has(sector.sectorId);

        return (
          <div
            key={`sector-${sector.sectorId}`}
            className="border rounded-lg overflow-hidden bg-white shadow-sm"
          >
            {/* Sector Header */}
            <button
              onClick={() => toggleSector(sector.sectorId)}
              className="w-full flex items-center justify-between p-3 bg-emerald-50/50 hover:bg-emerald-50 transition-colors border-b border-emerald-100"
            >
              <div className="flex items-center gap-3">
                {isSectorExpanded ? (
                  <ChevronDown className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-emerald-600" />
                )}
                <MapPin className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {sector.sectorName}
                </h3>
                <Badge variant="outline" className="border-emerald-200 text-emerald-700 text-xs">
                  {sector.schools.length} mekteb
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {sector.totalCount} sened
                </Badge>
              </div>
            </button>

            {/* Schools under this sector */}
            {isSectorExpanded && (
              <div className="divide-y divide-gray-100">
                {sector.schools.map((school) => {
                  const isSchoolExpanded = expandedSchools.has(school.groupKey);

                  return (
                    <div key={school.groupKey}>
                      {/* School Header */}
                      <button
                        onClick={() => toggleSchool(school.groupKey)}
                        className="w-full flex items-center justify-between p-3 pl-8 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isSchoolExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                          <GraduationCap className="h-3.5 w-3.5 text-orange-500" />
                          <span className="text-sm font-medium text-gray-800">
                            {school.groupLabel}
                          </span>
                          <Badge variant="secondary" className="bg-orange-50 text-orange-700 text-xs">
                            {school.count} sened
                          </Badge>
                        </div>
                      </button>

                      {/* School Documents */}
                      {isSchoolExpanded && (
                        <div className="px-4 pb-3 pl-10">
                          <DocumentTable
                            documents={school.resources}
                            onResourceAction={onResourceAction}
                            userDirectory={userDirectory}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Generic Group List (Region / Sektor tabs) ──────────────────────

interface DocumentGroupListProps {
  groups: GroupedResources[];
  tabType: DocumentLevelTab;
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  userDirectory: Record<number, string>;
}

function DocumentGroupList({
  groups,
  tabType,
  onResourceAction,
  userDirectory,
}: DocumentGroupListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    new Set(groups.map((g) => g.groupKey))
  );

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const expandAll = () => setExpandedGroups(new Set(groups.map((g) => g.groupKey)));
  const collapseAll = () => setExpandedGroups(new Set());

  const config = TAB_CONFIG[tabType];

  if (groups.length === 0) {
    return <EmptyState message={`${config.label} seviyyesinde sened tapilmadi`} />;
  }

  const totalDocs = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="space-y-3">
      {/* Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          <span>{groups.length} muessise, {totalDocs} sened</span>
        </div>
        {groups.length > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <button onClick={expandAll} className="text-primary hover:underline">
              Hamisini ac
            </button>
            <span className="text-muted-foreground">|</span>
            <button onClick={collapseAll} className="text-primary hover:underline">
              Hamisini bagla
            </button>
          </div>
        )}
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.groupKey);
        const headerBg = tabType === 'region'
          ? 'bg-blue-50/50 hover:bg-blue-50 border-b border-blue-100'
          : 'bg-emerald-50/50 hover:bg-emerald-50 border-b border-emerald-100';
        const iconColor = tabType === 'region' ? 'text-blue-600' : 'text-emerald-600';
        const badgeClass = tabType === 'region'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

        return (
          <div
            key={group.groupKey}
            className="border rounded-lg overflow-hidden bg-white shadow-sm"
          >
            <button
              onClick={() => toggleGroup(group.groupKey)}
              className={`w-full flex items-center justify-between p-3 transition-colors ${headerBg}`}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className={`h-4 w-4 ${iconColor}`} />
                ) : (
                  <ChevronRight className={`h-4 w-4 ${iconColor}`} />
                )}
                {config.icon}
                <h3 className="text-sm font-semibold text-gray-900">
                  {group.groupLabel}
                </h3>
                <Badge variant="secondary" className={`text-xs ${badgeClass}`}>
                  {group.count} sened
                </Badge>
              </div>
            </button>

            {isExpanded && (
              <div className="p-3">
                <DocumentTable
                  documents={group.resources}
                  onResourceAction={onResourceAction}
                  userDirectory={userDirectory}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm mt-1">Filterleri deyisdirin ve ya yeni sened elave edin</p>
    </div>
  );
}

export default DocumentLevelTabs;
