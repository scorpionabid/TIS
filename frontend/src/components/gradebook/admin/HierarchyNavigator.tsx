import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown, Building2, GraduationCap, School, MapPin, BookOpen } from 'lucide-react';
import { HierarchyNode } from '@/services/gradeBookAdmin';
import { cn } from '@/lib/utils';

interface HierarchyNavigatorProps {
  nodes: HierarchyNode[];
  loading?: boolean;
  selectedId?: number | null;
  onSelect?: (node: HierarchyNode) => void;
  expandedIds?: Set<number>;
  onToggleExpand?: (id: number) => void;
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

export function HierarchyNavigator({
  nodes,
  loading = false,
  selectedId,
  onSelect,
  expandedIds = new Set(),
  onToggleExpand,
}: HierarchyNavigatorProps) {
  if (loading) {
    return <HierarchySkeleton />;
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Hiyerarşik Navigasiya</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1 p-4">
          {nodes.map((node) => (
            <HierarchyNodeItem
              key={`${node.type}-${node.id}`}
              node={node}
              level={0}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface HierarchyNodeItemProps {
  node: HierarchyNode;
  level: number;
  selectedId?: number | null;
  onSelect?: (node: HierarchyNode) => void;
  expandedIds: Set<number>;
  onToggleExpand?: (id: number) => void;
}

function HierarchyNodeItem({
  node,
  level,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
}: HierarchyNodeItemProps) {
  const Icon = typeIcons[node.type] || Building2;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
          isSelected ? 'bg-blue-100 border border-blue-200' : 'hover:bg-slate-50',
          level > 0 && 'ml-4'
        )}
        onClick={() => onSelect?.(node)}
      >
        {hasChildren && (
          <button
            className="p-1 hover:bg-slate-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div className={cn('p-2 rounded-lg', typeColors[node.type])}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{node.name}</p>
          <p className="text-xs text-slate-500">
            {node.type === 'region' && `${node.stats?.institutions || 0} məktəb`}
            {node.type === 'sector' && `${node.stats?.institutions || 0} məktəb, ${node.stats?.grade_books || 0} jurnal`}
            {node.type === 'institution' && `${node.stats?.grade_books || 0} jurnal`}
            {node.type === 'grade' && `${node.stats?.grade_books || 0} jurnal`}
          </p>
        </div>

        {node.stats?.average !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {node.stats.average.toFixed(1)}
          </Badge>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <HierarchyNodeItem
              key={`${child.type}-${child.id}`}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
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
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
