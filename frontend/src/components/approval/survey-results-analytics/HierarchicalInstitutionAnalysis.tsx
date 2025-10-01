import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ChevronDown, ChevronRight, Building2, School, MapPin } from 'lucide-react';

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

const HierarchicalInstitutionAnalysis: React.FC<HierarchicalInstitutionAnalysisProps> = ({
  data,
  isLoading
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

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

  const getTextColor = (rate: number) => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderNode = (node: InstitutionNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const Icon = getIcon(node.level, node.type);

    return (
      <div key={node.id} className="w-full">
        {/* Node Row */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
            depth > 0 ? 'ml-8 border-dashed' : ''
          }`}
          style={{ marginLeft: depth > 0 ? `${depth * 2}rem` : 0 }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
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
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Cavab</p>
              <p className="font-semibold">{node.total_responses}</p>
            </div>

            <div className="text-center min-w-[60px]">
              <p className="text-xs text-muted-foreground mb-1">Tamamlama</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(node.completion_rate)}`}
                    style={{ width: `${node.completion_rate}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${getTextColor(node.completion_rate)}`}>
                  {node.completion_rate}%
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">Dərəcə</p>
              <p className={`font-semibold ${getTextColor(node.response_rate)}`}>
                {node.response_rate}%
              </p>
            </div>
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

  if (!data || !data.nodes || data.nodes.length === 0) {
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
  }[data.hierarchy_type] || 'Hierarxik Struktur';

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
          <div className="text-xs text-muted-foreground">
            {data.nodes.length} {data.nodes.length === 1 ? 'müəssisə' : 'müəssisə'}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {data.nodes.map((node) => renderNode(node))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HierarchicalInstitutionAnalysis;
