import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown, Building2, GraduationCap, School, MapPin, BookOpen, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGradeBookRole } from '@/contexts/GradeBookRoleContext';

export interface HierarchyNode {
  id: number;
  name: string;
  type: 'region' | 'sector' | 'institution' | 'grade' | 'gradebook';
  stats?: {
    total?: number;
    institutions?: number;
    grade_books?: number;
    students?: number;
    average?: number;
  };
  children?: HierarchyNode[];
  has_children?: boolean;
}

interface HierarchyNavigatorProps {
  nodes: HierarchyNode[];
  loading?: boolean;
  selectedId?: number | null;
  selectedType?: string | null;
  onSelect?: (node: HierarchyNode) => void;
  expandedIds?: Set<number>;
  onToggleExpand?: (id: number) => void;
  onLoadChildren?: (node: HierarchyNode) => Promise<HierarchyNode[]>;
}

const typeIcons = {
  region: MapPin,
  sector: Building2,
  institution: School,
  grade: GraduationCap,
  gradebook: BookOpen,
};

const typeColors = {
  region: 'text-blue-600 bg-blue-50 border-blue-200',
  sector: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  institution: 'text-purple-600 bg-purple-50 border-purple-200',
  grade: 'text-orange-600 bg-orange-50 border-orange-200',
  gradebook: 'text-slate-600 bg-slate-50 border-slate-200',
};

const typeLabels = {
  region: 'Region',
  sector: 'Sektor',
  institution: 'Məktəb',
  grade: 'Sinif',
  gradebook: 'Jurnal',
};

export function HierarchyNavigator({
  nodes,
  loading = false,
  selectedId,
  selectedType,
  onSelect,
  expandedIds = new Set(),
  onToggleExpand,
  onLoadChildren,
}: HierarchyNavigatorProps) {
  const { viewMode, isRegionAdmin, isSectorAdmin } = useGradeBookRole();

  if (loading) {
    return <HierarchySkeleton />;
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Hiyerarşiya
          {viewMode === 'region' && <Badge className="bg-blue-100 text-blue-800">Region</Badge>}
          {viewMode === 'sector' && <Badge className="bg-emerald-100 text-emerald-800">Sektor</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1 p-4 max-h-[500px] overflow-y-auto">
          {nodes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Məlumat yoxdur
            </p>
          ) : (
            nodes.map((node) => (
              <HierarchyNodeItem
                key={`${node.type}-${node.id}`}
                node={node}
                level={0}
                selectedId={selectedId}
                selectedType={selectedType}
                onSelect={onSelect}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onLoadChildren={onLoadChildren}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface HierarchyNodeItemProps {
  node: HierarchyNode;
  level: number;
  selectedId?: number | null;
  selectedType?: string | null;
  onSelect?: (node: HierarchyNode) => void;
  expandedIds: Set<number>;
  onToggleExpand?: (id: number) => void;
  onLoadChildren?: (node: HierarchyNode) => Promise<HierarchyNode[]>;
}

function HierarchyNodeItem({
  node,
  level,
  selectedId,
  selectedType,
  onSelect,
  expandedIds,
  onToggleExpand,
  onLoadChildren,
}: HierarchyNodeItemProps) {
  const Icon = typeIcons[node.type] || Building2;
  const isExpanded = expandedIds.has(node.id);
  // Check both has_children flag and actual children array
  const hasChildren = node.has_children || (node.children && node.children.length > 0);
  const isSelected = selectedId === node.id && selectedType === node.type;
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    onSelect?.(node);
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If expanding and has children flag but no children loaded yet, we need to load them
    if (!isExpanded && node.has_children && (!node.children || node.children.length === 0)) {
      setIsLoading(true);
      try {
        if (onLoadChildren) {
          // Use custom loader (institution hierarchy context)
          node.children = await onLoadChildren(node);
        } else {
          // Default: gradeBookService hierarchy (AdminDashboard context)
          const { gradeBookService } = await import('@/services/gradeBook');
          const response = await gradeBookService.getHierarchy({
            parent_id: node.id,
            parent_type: node.type,
            depth: 1,
          });

          if (response.success && response.data?.items) {
            node.children = response.data.items.map((child: { stats?: { institutions?: number; grade_books?: number }; [key: string]: unknown }) => ({
              ...child,
              has_children: !!(child.stats?.institutions || child.stats?.grade_books),
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load children:', error);
      } finally {
        setIsLoading(false);
      }
    }

    onToggleExpand?.(node.id);
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
          isSelected ? 'bg-blue-100 border border-blue-200' : 'hover:bg-slate-50',
          level > 0 && 'ml-4'
        )}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            onClick={handleToggle}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div className={cn('p-1.5 rounded-lg', typeColors[node.type])}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{node.name}</p>
          <p className="text-xs text-slate-500">
            {node.type === 'region' && `${node.stats?.institutions ?? 0} məktəb`}
            {node.type === 'sector' && (
              node.stats?.grade_books !== undefined
                ? `${node.stats?.institutions ?? 0} məktəb, ${node.stats.grade_books} jurnal`
                : `${node.stats?.institutions ?? 0} məktəb`
            )}
            {node.type === 'institution' && (node.stats?.grade_books !== undefined ? `${node.stats.grade_books} jurnal` : '')}
            {node.type === 'grade' && (node.stats?.grade_books !== undefined ? `${node.stats.grade_books} jurnal` : '')}
            {node.type === 'gradebook' && 'Jurnal'}
          </p>
        </div>

        {node.stats?.average !== undefined && (
          <Badge className="text-xs bg-slate-100 text-slate-700">
            {node.stats.average.toFixed(1)}
          </Badge>
        )}
      </div>

      {hasChildren && isExpanded && node.children && (
        <div className="mt-1">
          {node.children.map((child, index) => (
            <HierarchyNodeItem
              key={`${child.type}-${child.id}-${index}`}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              selectedType={selectedType}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchySkeleton() {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

// Hook for managing hierarchy state
export const useHierarchyState = () => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedNode, setSelectedNode] = useState<{ id: number; type: string } | null>(null);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const expandAll = useCallback((nodeIds: number[]) => {
    setExpandedIds(new Set(nodeIds));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const selectNode = useCallback((node: HierarchyNode) => {
    setSelectedNode({ id: node.id, type: node.type });
  }, []);

  return {
    expandedIds,
    setExpandedIds,
    selectedNode,
    toggleExpand,
    expandAll,
    collapseAll,
    selectNode,
  };
};

export default HierarchyNavigator;
