import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ChevronDown, ChevronRight, Building2, School, MapPin, ArrowUpDown, Info, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import { Button } from '../../ui/button';

interface InstitutionNode {
  id: number;
  name: string;
  type: string;
  level: number;
  total_responses: number;
  completed_responses: number;
  completion_rate: number;
  targeted_users: number;
  response_rate: number;
  total_schools?: number;
  responded_schools?: number;
  children?: InstitutionNode[];
}

interface HierarchicalInstitutionAnalysisProps {
  data: {
    hierarchy_type: string;
    nodes: InstitutionNode[];
  } | undefined;
  isLoading: boolean;
}

type SortField = 'name' | 'completion_rate' | 'response_rate' | 'total_responses';
type SortDirection = 'asc' | 'desc';

const HierarchicalInstitutionAnalysis: React.FC<HierarchicalInstitutionAnalysisProps> = ({
  data,
  isLoading
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedNode, setSelectedNode] = useState<InstitutionNode | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortNodes = (nodes: InstitutionNode[]): InstitutionNode[] => {
    return [...nodes].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'az');
          break;
        case 'completion_rate':
          comparison = a.completion_rate - b.completion_rate;
          break;
        case 'response_rate':
          comparison = a.response_rate - b.response_rate;
          break;
        case 'total_responses':
          comparison = a.total_responses - b.total_responses;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    }).map(node => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined
    }));
  };

  const sortedData = useMemo(() => {
    if (!data || !data.nodes) return null;
    return {
      ...data,
      nodes: sortNodes(data.nodes)
    };
  }, [data, sortField, sortDirection]);

  const getIcon = (level: number, type: string) => {
    if (level === 2 || type === 'region') return MapPin;
    if (level === 3 || type === 'sector') return Building2;
    return School;
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 75) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressBgColor = (rate: number) => {
    if (rate >= 75) return 'bg-green-50';
    if (rate >= 50) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getTextColor = (rate: number) => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBorderColor = (rate: number) => {
    if (rate >= 75) return 'border-green-200';
    if (rate >= 50) return 'border-yellow-200';
    return 'border-red-200';
  };

  const getPerformanceLabel = (rate: number) => {
    if (rate >= 75) return 'Yüksək';
    if (rate >= 50) return 'Orta';
    return 'Aşağı';
  };

  const renderNode = (node: InstitutionNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const Icon = getIcon(node.level, node.type);

    return (
      <div key={node.id} className="w-full">
        {/* Node Row */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
            ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}
            ${depth > 0 ? 'border-dashed' : ''}
            ${getBorderColor(node.completion_rate)}
          `}
          style={{ marginLeft: depth > 0 ? `${depth * 2}rem` : 0 }}
          onClick={() => setSelectedNode(node)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Icon */}
          <div className="flex-shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Institution Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{node.name}</p>
            {node.total_schools !== undefined && (
              <p className="text-xs text-muted-foreground">
                {node.responded_schools}/{node.total_schools} məktəb cavab verib
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 flex-shrink-0 text-sm">
            {/* Total Responses */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <p className="text-xs text-muted-foreground">Cavab</p>
                    <p className="font-semibold">{node.total_responses}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold mb-1">Cavab Statistikası</p>
                    <p>Tamamlanmış: {node.completed_responses}</p>
                    <p>Hədəflənən: {node.targeted_users}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Completion Rate */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center min-w-[100px] cursor-help">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 justify-center">
                      Tamamlama
                      <Info className="h-3 w-3" />
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-2.5 bg-muted rounded-full overflow-hidden ${getProgressBgColor(node.completion_rate)}`}>
                        <div
                          className={`h-full ${getProgressColor(node.completion_rate)} transition-all duration-300`}
                          style={{ width: `${node.completion_rate}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${getTextColor(node.completion_rate)} min-w-[35px] text-right`}>
                        {node.completion_rate.toFixed(1)}%
                      </span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${getTextColor(node.completion_rate)}`}>
                      {getPerformanceLabel(node.completion_rate)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold mb-1">Tamamlama Dərəcəsi</p>
                    <p>Tamamlanmış cavabların ümumi cavablara nisbəti</p>
                    <p className="mt-1">
                      {node.completed_responses} / {node.total_responses} = {node.completion_rate.toFixed(1)}%
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Response Rate */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center min-w-[60px] cursor-help">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                      Dərəcə
                      <Info className="h-3 w-3" />
                    </p>
                    <div className="flex items-center gap-1 justify-center">
                      <p className={`font-bold text-base ${getTextColor(node.response_rate)}`}>
                        {node.response_rate.toFixed(1)}%
                      </p>
                      {node.response_rate >= 75 ? (
                        <TrendingUp className={`h-3 w-3 ${getTextColor(node.response_rate)}`} />
                      ) : node.response_rate < 50 ? (
                        <TrendingDown className={`h-3 w-3 ${getTextColor(node.response_rate)}`} />
                      ) : null}
                    </div>
                    <p className={`text-[10px] ${getTextColor(node.response_rate)}`}>
                      {getPerformanceLabel(node.response_rate)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold mb-1">Cavab Verənlərin Dərəcəsi</p>
                    <p>Cavab verənlərin hədəflənənlərə nisbəti</p>
                    <p className="mt-1">
                      {node.total_responses} / {node.targeted_users} = {node.response_rate.toFixed(1)}%
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Children Nodes */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Hierarxik Analiz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sortedData || !sortedData.nodes || sortedData.nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Hierarxik Analiz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Müəssisə məlumatı yoxdur</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hierarchyTitle = {
    regions_sectors_schools: 'Region → Sektor → Məktəb',
    sectors_schools: 'Sektor → Məktəb',
    schools: 'Məktəblər',
    single_institution: 'Müəssisə',
  }[sortedData.hierarchy_type] || 'Hierarxik Struktur';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base mb-1">
              <Building2 className="h-5 w-5 text-primary" />
              Hierarxik Analiz
            </CardTitle>
            <p className="text-xs text-muted-foreground">{hierarchyTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {sortedData.nodes.length} {sortedData.nodes.length === 1 ? 'müəssisə' : 'müəssisə'}
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">Sıralama:</span>
          <Button
            variant={sortField === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('name')}
            className="h-7 text-xs"
          >
            Ad
            {sortField === 'name' && (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortField === 'completion_rate' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('completion_rate')}
            className="h-7 text-xs"
          >
            Tamamlama
            {sortField === 'completion_rate' && (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortField === 'response_rate' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('response_rate')}
            className="h-7 text-xs"
          >
            Dərəcə
            {sortField === 'response_rate' && (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortField === 'total_responses' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('total_responses')}
            className="h-7 text-xs"
          >
            Cavab
            {sortField === 'total_responses' && (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {sortedData.nodes.map((node) => renderNode(node))}
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {selectedNode.name}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ümumi Cavab:</span>
                  <span className="font-semibold">{selectedNode.total_responses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamamlanmış:</span>
                  <span className="font-semibold text-green-600">{selectedNode.completed_responses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hədəflənən:</span>
                  <span className="font-semibold">{selectedNode.targeted_users}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamamlama:</span>
                  <span className={`font-bold ${getTextColor(selectedNode.completion_rate)}`}>
                    {selectedNode.completion_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dərəcə:</span>
                  <span className={`font-bold ${getTextColor(selectedNode.response_rate)}`}>
                    {selectedNode.response_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Qiymətləndirmə:</span>
                  <span className={`font-semibold ${getTextColor(selectedNode.completion_rate)}`}>
                    {getPerformanceLabel(selectedNode.completion_rate)}
                  </span>
                </div>
              </div>
            </div>
            {selectedNode.total_schools !== undefined && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Məktəb Cavab Dərəcəsi:</span>
                  <span className="font-semibold">
                    {selectedNode.responded_schools} / {selectedNode.total_schools} məktəb
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HierarchicalInstitutionAnalysis;
