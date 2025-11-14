import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Resource } from '@/types/resources';
import { ResourceGrid } from './ResourceGrid';
import { Badge } from '@/components/ui/badge';
import { GroupedResources } from '@/hooks/useResourceGrouping';

interface GroupedResourceDisplayProps {
  groups: GroupedResources[];
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  institutionDirectory?: Record<number, string>;
  userDirectory?: Record<number, string>;
  defaultExpanded?: boolean;
}

export function GroupedResourceDisplay({
  groups,
  onResourceAction,
  institutionDirectory = {},
  userDirectory = {},
  defaultExpanded = true,
}: GroupedResourceDisplayProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      return new Set(groups.map(g => g.groupKey));
    }
    return new Set();
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groups.map(g => g.groupKey)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">Heç bir link tapılmadı</p>
        <p className="text-sm mt-2">Filterləri dəyişdirin və ya yeni link əlavə edin</p>
      </div>
    );
  }

  // Single group with 'all' key - no grouping UI, just show flat list
  if (groups.length === 1 && groups[0].groupKey === 'all') {
    return (
      <ResourceGrid
        resources={groups[0].resources}
        onResourceAction={onResourceAction}
        institutionDirectory={institutionDirectory}
        userDirectory={userDirectory}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Expand/Collapse All Controls */}
      <div className="flex justify-end gap-2">
        <button
          onClick={expandAll}
          className="text-sm text-primary hover:underline"
        >
          Hamısını aç
        </button>
        <span className="text-gray-400">|</span>
        <button
          onClick={collapseAll}
          className="text-sm text-primary hover:underline"
        >
          Hamısını bağla
        </button>
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.groupKey);

        return (
          <div
            key={group.groupKey}
            className="border rounded-lg overflow-hidden bg-white shadow-sm"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.groupKey)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {group.groupLabel}
                </h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {group.count} {group.count === 1 ? 'link' : 'link'}
                </Badge>
              </div>
            </button>

            {/* Group Content */}
            {isExpanded && (
              <div className="p-4">
                {group.resources.length > 0 ? (
                  <ResourceGrid
                    resources={group.resources}
                    onResourceAction={onResourceAction}
                    institutionDirectory={institutionDirectory}
                    userDirectory={userDirectory}
                  />
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    Bu qrupda link yoxdur
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
