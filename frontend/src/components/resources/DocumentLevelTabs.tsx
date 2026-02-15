import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Building2, MapPin, GraduationCap, FileText } from 'lucide-react';
import DocumentTable from './DocumentTable';
import { GroupedResources } from '@/hooks/useResourceGrouping';
import { DocumentLevelTab } from '@/hooks/resources/useDocumentsByLevel';
import { Resource } from '@/types/resources';

interface DocumentLevelTabsProps {
  groups: {
    region: GroupedResources[];
    sektor: GroupedResources[];
    school: GroupedResources[];
  };
  tabCounts: { region: number; sektor: number; school: number };
  visibleTabs: DocumentLevelTab[];
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  userDirectory: Record<number, string>;
}

const TAB_CONFIG: Record<DocumentLevelTab, { label: string; icon: React.ReactNode }> = {
  region: { label: 'Region', icon: <Building2 className="h-4 w-4" /> },
  sektor: { label: 'Sektor', icon: <MapPin className="h-4 w-4" /> },
  school: { label: 'Mekteb', icon: <GraduationCap className="h-4 w-4" /> },
};

function DocumentLevelTabs({
  groups,
  tabCounts,
  visibleTabs,
  onResourceAction,
  userDirectory,
}: DocumentLevelTabsProps) {
  const defaultTab = visibleTabs[0] ?? 'region';

  if (visibleTabs.length === 0) return null;

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className={`grid w-full grid-cols-${visibleTabs.length} gap-1`}>
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="flex items-center gap-2">
            {TAB_CONFIG[tab].icon}
            <span>{TAB_CONFIG[tab].label}</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {tabCounts[tab]}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {visibleTabs.map((tab) => (
        <TabsContent key={tab} value={tab} className="mt-4">
          <DocumentGroupList
            groups={groups[tab]}
            onResourceAction={onResourceAction}
            userDirectory={userDirectory}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface DocumentGroupListProps {
  groups: GroupedResources[];
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  userDirectory: Record<number, string>;
}

function DocumentGroupList({ groups, onResourceAction, userDirectory }: DocumentGroupListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    new Set(groups.map((g) => g.groupKey))
  );

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const expandAll = () => setExpandedGroups(new Set(groups.map((g) => g.groupKey)));
  const collapseAll = () => setExpandedGroups(new Set());

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">Bu seviyyede sened tapilmadi</p>
        <p className="text-sm mt-1">Filterleri deyisdirin ve ya yeni sened elave edin</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{groups.length} qrup</span>
          <span className="text-muted-foreground">|</span>
          <button onClick={expandAll} className="text-primary hover:underline">
            Hamisini ac
          </button>
          <span className="text-muted-foreground">|</span>
          <button onClick={collapseAll} className="text-primary hover:underline">
            Hamisini bagla
          </button>
        </div>
      )}

      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.groupKey);

        return (
          <div
            key={group.groupKey}
            className="border rounded-lg overflow-hidden bg-white shadow-sm"
          >
            <button
              onClick={() => toggleGroup(group.groupKey)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                )}
                <h3 className="text-sm font-semibold text-gray-900">
                  {group.groupLabel}
                </h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
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

export default DocumentLevelTabs;
