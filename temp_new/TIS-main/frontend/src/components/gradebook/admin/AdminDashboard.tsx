import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { gradeBookService } from '@/services/gradeBook';
import { useGradeBookRole } from '@/contexts/GradeBookRoleContext';
import { 
  Building2, 
  MapPin, 
  GraduationCap, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Download,
  ChevronRight,
  ChevronDown,
  School,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HierarchyNode {
  id: number;
  name: string;
  type: 'region' | 'sector' | 'institution' | 'grade' | 'gradebook';
  stats: {
    total?: number;
    institutions?: number;
    grade_books?: number;
    students?: number;
    average?: number;
  };
  children?: HierarchyNode[];
  has_children?: boolean;
  loading?: boolean;
  parent_id?: number;
}

interface DashboardSummary {
  total_institutions: number;
  total_sectors?: number;
  total_grade_books: number;
  total_students: number;
  average_score: number;
}

export function AdminDashboard() {
  const { toast } = useToast();
  const { viewMode, isRegionAdmin, isSectorAdmin, currentScope, canViewHierarchy } = useGradeBookRole();
  
  const [loading, setLoading] = useState(true);
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [expandedClassLevels, setExpandedClassLevels] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<HierarchyNode[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [viewMode, currentScope]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        level: viewMode,
        depth: 1, // Only load first level initially
      };
      
      if (currentScope.regionId) params.region_id = currentScope.regionId;
      if (currentScope.sectorId) params.sector_id = currentScope.sectorId;
      
      const response = await gradeBookService.getHierarchy(params);
      
      if (response.success) {
        setHierarchyData(response.data.items || []);
        setSummary(response.data.summary || null);
        
        // Auto-expand first level nodes
        if (response.data.items?.length > 0) {
          const newExpanded = new Set<number>();
          response.data.items.forEach((item: HierarchyNode) => {
            newExpanded.add(item.id);
            // Mark nodes that have children but they aren't loaded yet
            if (item.stats?.institutions || item.stats?.grade_books) {
              item.has_children = true;
            }
          });
          setExpandedIds(newExpanded);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Dashboard məlumatları yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    toast({
      title: 'Export başladı',
      description: 'Dashboard məlumatları export edilir...',
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleClassLevel = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedClassLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const selectNode = (node: HierarchyNode) => {
    setSelectedNode(node);
    // Build breadcrumb path when node is selected
    const path = buildBreadcrumbPath(node);
    setBreadcrumbPath(path);
  };

  // Build breadcrumb path from root to selected node
  const buildBreadcrumbPath = (targetNode: HierarchyNode): HierarchyNode[] => {
    const path: HierarchyNode[] = [];
    
    const findPath = (nodes: HierarchyNode[], targetId: number, targetType: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId && node.type === targetType) {
          path.unshift(node);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (findPath(node.children, targetId, targetType)) {
            path.unshift(node);
            return true;
          }
        }
      }
      return false;
    };
    
    findPath(hierarchyData, targetNode.id, targetNode.type);
    return path;
  };

  // Lazy load children for a node
  const loadChildren = async (node: HierarchyNode) => {
    if (node.loading) return;
    if (node.children && node.children.length > 0) return; // Already loaded
    
    // Mark node as loading
    updateNodeLoadingState(node.id, node.type, true);
    
    try {
      const params: any = {
        parent_id: node.id,
        parent_type: node.type,
        depth: 1,
      };
      
      if (currentScope.regionId) params.region_id = currentScope.regionId;
      if (currentScope.sectorId) params.sector_id = currentScope.sectorId;
      
      const response = await gradeBookService.getHierarchy(params);
      
      if (response.success) {
        // Update the node with loaded children
        updateNodeChildren(node.id, node.type, response.data.items || []);
      }
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Alt elementlər yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      updateNodeLoadingState(node.id, node.type, false);
    }
  };

  // Update node loading state in hierarchy
  const updateNodeLoadingState = (nodeId: number, nodeType: string, isLoading: boolean) => {
    setHierarchyData(prevData => {
      return updateNodeInTree(prevData, nodeId, nodeType, (node) => ({
        ...node,
        loading: isLoading
      }));
    });
  };

  // Update node children in hierarchy
  const updateNodeChildren = (nodeId: number, nodeType: string, children: HierarchyNode[]) => {
    setHierarchyData(prevData => {
      return updateNodeInTree(prevData, nodeId, nodeType, (node) => ({
        ...node,
        children: children.map(child => ({
          ...child,
          parent_id: nodeId,
          has_children: !!(child.stats?.institutions || child.stats?.grade_books)
        }))
      }));
    });
  };

  // Helper to update a node in the tree structure
  const updateNodeInTree = (
    nodes: HierarchyNode[], 
    targetId: number, 
    targetType: string, 
    updater: (node: HierarchyNode) => HierarchyNode
  ): HierarchyNode[] => {
    return nodes.map(node => {
      if (node.id === targetId && node.type === targetType) {
        return updater(node);
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetId, targetType, updater)
        };
      }
      return node;
    });
  };

  const handleToggleExpand = async (node: HierarchyNode, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isExpanded = expandedIds.has(node.id);
    
    if (!isExpanded && node.has_children && (!node.children || node.children.length === 0)) {
      // Need to load children first
      await loadChildren(node);
    }
    
    toggleExpand(node.id);
  };

  // Stats cards data
  const statsCards = useMemo(() => {
    if (!summary) return [];
    
    return [
      {
        title: 'Məktəb sayı',
        value: summary.total_institutions,
        icon: Building2,
        color: 'blue',
        subValue: isRegionAdmin ? `${summary.total_sectors} sektor` : undefined,
      },
      {
        title: 'Jurnal sayı',
        value: summary.total_grade_books,
        icon: BookOpen,
        color: 'emerald',
      },
      {
        title: 'Şagird sayı',
        value: summary.total_students,
        icon: Users,
        color: 'purple',
      },
      {
        title: 'Ortalama bal',
        value: summary.average_score.toFixed(1),
        icon: TrendingUp,
        color: 'orange',
        subValue: 'Ümumi',
      },
    ];
  }, [summary, isRegionAdmin]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'region': return MapPin;
      case 'sector': return Building2;
      case 'institution': return School;
      case 'grade': return GraduationCap;
      case 'gradebook': return BookOpen;
      default: return Building2;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'region': return 'text-blue-600 bg-blue-50';
      case 'sector': return 'text-emerald-600 bg-emerald-50';
      case 'institution': return 'text-purple-600 bg-purple-50';
      case 'grade': return 'text-orange-600 bg-orange-50';
      case 'gradebook': return 'text-slate-600 bg-slate-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const renderHierarchyNode = (node: HierarchyNode, level: number = 0) => {
    const Icon = getTypeIcon(node.type);
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.has_children || (node.children && node.children.length > 0);
    const isSelected = selectedNode?.id === node.id && selectedNode?.type === node.type;
    const isLoading = node.loading;

    return (
      <div key={`${node.type}-${node.id}`}>
        <div
          className={cn(
            'flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors',
            isSelected ? 'bg-blue-100 border border-blue-200' : 'hover:bg-slate-50',
            level > 0 && 'ml-4'
          )}
          onClick={() => selectNode(node)}
        >
          {hasChildren && (
            <button
              className="p-1 hover:bg-slate-200 rounded transition-colors"
              onClick={(e) => handleToggleExpand(node, e)}
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

          <div className={cn('p-1.5 rounded-lg', getTypeColor(node.type))}>
            <Icon className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{node.name}</p>
            <p className="text-xs text-slate-500">
              {node.type === 'region' && `${node.stats?.institutions || 0} məktəb`}
              {node.type === 'sector' && `${node.stats?.institutions || 0} məktəb, ${node.stats?.grade_books || 0} jurnal`}
              {node.type === 'institution' && `${node.stats?.grade_books || 0} jurnal`}
              {node.type === 'grade' && `${node.stats?.grade_books || 0} jurnal`}
              {node.type === 'gradebook' && 'Jurnal'}
            </p>
          </div>

          {node.stats?.average !== undefined && (
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
              {node.stats.average.toFixed(1)}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && node.children && (
          <div className="mt-1">
            {node.type === 'institution' && node.children.some(c => c.type === 'grade') ? (
              (() => {
                // Group grade children by class_level extracted from name (e.g. "5-A" → 5, "A" → 0)
                const gradeChildren = node.children.filter(c => c.type === 'grade');
                const nonGradeChildren = node.children.filter(c => c.type !== 'grade');
                const grouped = new Map<number, HierarchyNode[]>();
                gradeChildren.forEach(child => {
                  const match = child.name.match(/^(\d+)/);
                  const lvl = match ? parseInt(match[1]) : 0;
                  if (!grouped.has(lvl)) grouped.set(lvl, []);
                  grouped.get(lvl)!.push(child);
                });
                const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);
                return (
                  <>
                    {nonGradeChildren.map(child => renderHierarchyNode(child, level + 1))}
                    {sortedLevels.map(lvl => {
                      const key = `${node.id}-${lvl}`;
                      const isLevelExpanded = expandedClassLevels.has(key);
                      const levelGrades = grouped.get(lvl)!;
                      return (
                        <div key={key} className={cn('ml-4 mt-1')}>
                          <div
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={(e) => toggleClassLevel(key, e)}
                          >
                            <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                              {isLevelExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                            <div className="p-1.5 rounded-lg text-orange-600 bg-orange-50">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">
                                {lvl > 0 ? `${lvl}-ci sinif` : 'Hazırlıq qrupu'}
                              </p>
                              <p className="text-xs text-slate-500">{levelGrades.length} sinif</p>
                            </div>
                          </div>
                          {isLevelExpanded && (
                            <div className="mt-1">
                              {levelGrades.map(child => renderHierarchyNode(child, level + 2))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()
            ) : (
              node.children.map((child) => renderHierarchyNode(child, level + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin İcmalı</h1>
          <p className="text-slate-500 mt-1">
            {isRegionAdmin && 'Region üzrə sektor və məktəblərin icmalı'}
            {isSectorAdmin && 'Sektor üzrə məktəblərin icmalı'}
            {!canViewHierarchy && 'Yalnız öz məktəbinizin icmalı'}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.title}</p>
                  <p className={cn("text-2xl font-bold", `text-${stat.color}-600`)}>
                    {stat.value}
                  </p>
                  {stat.subValue && (
                    <p className="text-xs text-slate-400">{stat.subValue}</p>
                  )}
                </div>
                <div className={cn("p-2 rounded-lg", `bg-${stat.color}-100`)}>
                  <stat.icon className={cn("w-6 h-6", `text-${stat.color}-600`)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hierarchy Navigator */}
        <Card className="border-slate-200 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Hiyerarşiya
              <span className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                isRegionAdmin ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
              )}>
                {isRegionAdmin ? 'Region' : 'Sektor'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 p-4 max-h-[500px] overflow-y-auto">
              {hierarchyData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Məlumat yoxdur
                </p>
              ) : (
                hierarchyData.map((node) => renderHierarchyNode(node))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Node Details */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {selectedNode ? `${selectedNode.name} - Ətraflı məlumat` : 'Seçilmiş element məlumatları'}
            </CardTitle>
            {/* Breadcrumb Path */}
            {breadcrumbPath.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-2 flex-wrap">
                {breadcrumbPath.map((node, index) => (
                  <React.Fragment key={`${node.type}-${node.id}`}>
                    {index > 0 && <ChevronRight className="w-3 h-3" />}
                    <span 
                      className={cn(
                        "hover:text-blue-600 cursor-pointer transition-colors",
                        index === breadcrumbPath.length - 1 && "font-medium text-slate-700"
                      )}
                      onClick={() => selectNode(node)}
                    >
                      {node.name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-3 rounded-lg', getTypeColor(selectedNode.type))}>
                    {React.createElement(getTypeIcon(selectedNode.type), { className: 'w-6 h-6' })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedNode.name}</h3>
                    <p className="text-sm text-slate-500 capitalize">{selectedNode.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(selectedNode.stats || {}).map(([key, value]) => (
                    <div key={key} className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-lg font-semibold">
                        {typeof value === 'number' ? value.toFixed(key === 'average' ? 1 : 0) : value}
                      </p>
                    </div>
                  ))}
                </div>

                {selectedNode.children && selectedNode.children.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      Alt elementlər ({selectedNode.children.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedNode.children.slice(0, 10).map((child) => (
                        <span key={`${child.type}-${child.id}`} className="text-xs border border-slate-200 px-2 py-1 rounded">
                          {child.name}
                        </span>
                      ))}
                      {selectedNode.children.length > 10 && (
                        <span className="text-xs border border-slate-200 px-2 py-1 rounded">
                          +{selectedNode.children.length - 10} daha
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-slate-100 rounded-full mb-4">
                  <Building2 className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">
                  Ətraflı məlumat görmək üçün soldakı hiyerarşiyadan bir element seçin
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
