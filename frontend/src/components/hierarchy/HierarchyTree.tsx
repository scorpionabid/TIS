import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, Users, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { HierarchyNode, hierarchyService } from '@/services/hierarchy';
import { cn } from '@/lib/utils';

interface HierarchyTreeProps {
  nodes: HierarchyNode[];
  onNodeSelect?: (node: HierarchyNode) => void;
  onNodeExpand?: (node: HierarchyNode) => void;
  canModify?: boolean;
  onNodeMove?: (node: HierarchyNode) => void;
  onNodeEdit?: (node: HierarchyNode) => void;
  selectedNodeId?: number | string;
  className?: string;
}

interface TreeNodeProps {
  node: HierarchyNode;
  level: number;
  onNodeSelect?: (node: HierarchyNode) => void;
  onNodeExpand?: (node: HierarchyNode) => void;
  canModify?: boolean;
  onNodeMove?: (node: HierarchyNode) => void;
  onNodeEdit?: (node: HierarchyNode) => void;
  selectedNodeId?: number | string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  onNodeSelect,
  onNodeExpand,
  canModify,
  onNodeMove,
  onNodeEdit,
  selectedNodeId,
}) => {
  const [isExpanded, setIsExpanded] = useState(level <= 3); // Auto-expand first 3 levels
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (node.has_children && node.children.length === 0) {
      // Load children if not loaded
      setIsLoading(true);
      try {
        if (onNodeExpand) {
          await onNodeExpand(node);
        }
      } catch (error) {
        console.error('Failed to load children:', error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  };

  const indentLevel = level * 20;
  const isSelected = selectedNodeId === node.id;

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center p-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-muted/50",
          isSelected && "bg-primary/10 border border-primary/20"
        )}
        style={{ paddingLeft: `${indentLevel + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        <div className="w-6 h-6 flex items-center justify-center mr-2">
          {node.has_children ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Institution Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted mr-3">
          <span className="text-sm">
            {hierarchyService.getTypeIcon(node.type?.key || 'unknown')}
          </span>
        </div>

        {/* Institution Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">
              {node.name}
            </h4>
            <Badge variant={node.is_active ? 'default' : 'secondary'} className="text-xs">
              {hierarchyService.getTypeDisplayName(node.type?.key || 'unknown')}
            </Badge>
            {node.is_active ? (
              <CheckCircle className="w-3 h-3 text-green-600" />
            ) : (
              <XCircle className="w-3 h-3 text-gray-400" />
            )}
          </div>
          
          {/* Metadata */}
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            {node.children_count > 0 && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{node.children_count} alt müəssisə</span>
              </div>
            )}
            {node.metadata.staff_count && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{node.metadata.staff_count} işçi</span>
              </div>
            )}
            {node.metadata.student_capacity && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{node.metadata.student_capacity} tutum</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        {canModify && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onNodeEdit && (
                <DropdownMenuItem onClick={() => onNodeEdit(node)}>
                  Redaktə et
                </DropdownMenuItem>
              )}
              {onNodeMove && level > 1 && (
                <DropdownMenuItem onClick={() => onNodeMove(node)}>
                  Köçür
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => window.open(`/institutions/${node.id}`, '_blank')}>
                Ətraflı bax
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Children */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="ml-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onNodeSelect={onNodeSelect}
              onNodeExpand={onNodeExpand}
              canModify={canModify}
              onNodeMove={onNodeMove}
              onNodeEdit={onNodeEdit}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  nodes,
  onNodeSelect,
  onNodeExpand,
  canModify = false,
  onNodeMove,
  onNodeEdit,
  selectedNodeId,
  className,
}) => {
  if (!nodes || nodes.length === 0) {
    return (
      <Card className={cn("p-8", className)}>
        <CardContent className="text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Hierarchy məlumatı yoxdur</h3>
          <p className="text-muted-foreground">
            Hierarchy struktur məlumatları yüklənmədi və ya mövcud deyil.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          {nodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              onNodeSelect={onNodeSelect}
              onNodeExpand={onNodeExpand}
              canModify={canModify}
              onNodeMove={onNodeMove}
              onNodeEdit={onNodeEdit}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HierarchyTree;