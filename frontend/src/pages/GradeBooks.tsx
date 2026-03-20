import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Calculator, School, BarChart3, Building2, MapPin } from 'lucide-react';
import { GradeBookList } from '@/components/gradebook';
import { GradeBookAnalysis } from '@/components/gradebook/analysis/GradeBookAnalysis';
import { AdminDashboard } from '@/components/gradebook/admin';
import { GradeBookRoleProvider, useGradeBookRole } from '@/contexts/GradeBookRoleContext';
import { HierarchyNavigator, useHierarchyState, HierarchyNode } from '@/components/gradebook/HierarchyNavigator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { hierarchyService, HierarchyNode as InstitutionHierarchyNode } from '@/services/hierarchy';
import { gradeService } from '@/services/grades';
import { Button } from '@/components/ui/button';

type GradeBookTab = 'list' | 'analysis' | 'admin' | 'create';

const GradeBooksPage: React.FC = () => {
  const { hasPermission, currentUser } = useAuth();
  const { viewMode, canViewHierarchy, isRegionAdmin, isSectorAdmin, canCreate: roleCanCreate } = useGradeBookRole();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-select institution for school admin
  useEffect(() => {
    if (!canViewHierarchy && currentUser?.institution?.id) {
      setSelectedInstitutionId(currentUser.institution.id);
    }
  }, [canViewHierarchy, currentUser?.institution?.id]);

  // Institution hierarchy (Region->Sector->School) for Region/Sektor admins
  const [institutionTree, setInstitutionTree] = useState<HierarchyNode[]>([]);
  const [institutionTreeLoading, setInstitutionTreeLoading] = useState(true);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);

  const [gradesForInstitution, setGradesForInstitution] = useState<Array<{ id: number; label: string; studentCount: number }>>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [gradesSearch, setGradesSearch] = useState('');
  
  const {
    expandedIds,
    setExpandedIds,
    selectedNode,
    toggleExpand,
    selectNode,
  } = useHierarchyState();

  const mapInstitutionNodeType = (type: string): HierarchyNode['type'] | null => {
    if (type === 'region' || type === 'regional_education_department') return 'region';
    if (type === 'sektor' || type === 'sector_education_office') return 'sector';

    // Schools are level 4 in this system but types vary (secondary_school/lyceum/...)
    // We treat all non-region/non-sector institutions as schools for this view.
    return 'institution';
  };

  const isSchoolTypeAllowed = (node: InstitutionHierarchyNode): boolean => {
    return node.level === 4;
  };

  const countSchoolsInSubtree = (node: InstitutionHierarchyNode): number => {
    if (node.level === 4) return 1;
    const children = Array.isArray(node.children) ? node.children : [];
    return children.reduce((sum, child) => sum + countSchoolsInSubtree(child), 0);
  };

  const toNavigatorNodes = (nodes: InstitutionHierarchyNode[]): HierarchyNode[] => {
    const transform = (n: InstitutionHierarchyNode): HierarchyNode | null => {
      const mappedType = mapInstitutionNodeType(n.type);
      if (!mappedType) return null;

      // Limit to Region(2) -> Sector(3) -> School(4)
      if (mappedType === 'institution' && !isSchoolTypeAllowed(n)) {
        return null;
      }

      const children = Array.isArray(n.children) ? n.children : [];
      const nextChildren = children
        .map(transform)
        .filter(Boolean) as HierarchyNode[];

      // Do not keep deeper levels under school
      const trimmedChildren = mappedType === 'institution' ? undefined : nextChildren;

      const schoolCount = mappedType === 'institution'
        ? undefined
        : countSchoolsInSubtree(n);

      return {
        id: Number(n.id),
        name: n.name,
        type: mappedType,
        stats: schoolCount !== undefined ? { institutions: schoolCount } : undefined,
        has_children: mappedType !== 'institution' ? (n.has_children || nextChildren.length > 0) : false,
        children: trimmedChildren,
      };
    };

    return nodes.map(transform).filter(Boolean) as HierarchyNode[];
  };

  // Load institution hierarchy tree from /api/hierarchy (role-scoped)
  useEffect(() => {
    const loadInstitutionTree = async () => {
      try {
        setInstitutionTreeLoading(true);

        if (!canViewHierarchy) {
          setInstitutionTree([]);
          return;
        }

        const response = await hierarchyService.getHierarchy({ max_depth: 4, include_inactive: false, expand_all: true });
        const rootNodes = response?.data ?? [];
        const mapped = toNavigatorNodes(rootNodes);
        setInstitutionTree(mapped);

        const allIds = new Set<number>();
        const collectIds = (items: HierarchyNode[]) => {
          items.forEach(item => {
            allIds.add(item.id);
            if (item.children) collectIds(item.children);
          });
        };
        collectIds(mapped);
        setExpandedIds(allIds);
      } catch (error) {
        console.error('[InstitutionHierarchy] Error:', error);
        setInstitutionTree([]);
      } finally {
        setInstitutionTreeLoading(false);
      }
    };

    loadInstitutionTree();
  }, [canViewHierarchy, setExpandedIds]);

  const canViewList = hasPermission('assessments.read');
  const canCreate = hasPermission('assessments.create') && roleCanCreate;
  const canAccessAdmin = isRegionAdmin || isSectorAdmin;

  // Selection handler: we select school nodes here
  const handleSelectNode = (node: HierarchyNode) => {
    selectNode(node);

    if (node.type === 'institution') {
      setSelectedInstitutionId(node.id);
      setSelectedGradeId(null);
      return;
    }
  };

  const selectedInstitution = useMemo(() => {
    if (!selectedInstitutionId) return null;
    const findNode = (nodes: HierarchyNode[]): HierarchyNode | null => {
      for (const n of nodes) {
        if (n.type === 'institution' && n.id === selectedInstitutionId) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode(institutionTree);
  }, [institutionTree, selectedInstitutionId]);

  const selectedInstitutionName = selectedInstitution?.name ?? '';

  useEffect(() => {
    const loadGradesForInstitution = async () => {
      try {
        setGradesLoading(true);
        setGradesForInstitution([]);

        if (!selectedInstitutionId) {
          setSelectedGradeId(null);
          return;
        }

        const result = await gradeService.get({ institution_id: selectedInstitutionId, is_active: true, per_page: 200 });
        const items = result.items;

        const list = items
          .map((grade) => ({
            id: grade.id,
            label: grade.full_name || grade.display_name || grade.name || `Sinif ${grade.id}`,
            studentCount: grade.student_count ?? 0,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'az'));
        setGradesForInstitution(list);
      } catch (error) {
        console.error('[GradesForInstitution] Error:', error);
        setGradesForInstitution([]);
      } finally {
        setGradesLoading(false);
      }
    };

    loadGradesForInstitution();
  }, [selectedInstitutionId]);

  const filteredInstitutionTree = useMemo(() => {
    if (!hierarchySearch.trim()) return institutionTree;
    const query = hierarchySearch.toLowerCase();
    const filterNodes = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.reduce<HierarchyNode[]>((acc, node) => {
        const matches = node.name.toLowerCase().includes(query);
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : (matches ? node.children : undefined),
            has_children: filteredChildren.length > 0 || (node.children?.length || 0) > 0,
          });
        }
        return acc;
      }, []);
    };
    return filterNodes(institutionTree);
  }, [institutionTree, hierarchySearch]);

  const filteredGrades = useMemo(() => {
    if (!gradesSearch.trim()) return gradesForInstitution;
    const query = gradesSearch.toLowerCase();
    return gradesForInstitution.filter((g) => g.label.toLowerCase().includes(query));
  }, [gradesForInstitution, gradesSearch]);

  const allowedTabs = useMemo(() => {
    const tabs: GradeBookTab[] = [];
    if (canViewList) tabs.push('list', 'analysis');
    if (canAccessAdmin) tabs.push('admin');
    return tabs;
  }, [canViewList, canCreate, canAccessAdmin]);

  const requestedTab = (searchParams.get('tab') as GradeBookTab | null) ?? null;

  const defaultTab: GradeBookTab = useMemo(() => {
    if (allowedTabs.includes('list')) return 'list';
    if (allowedTabs.includes('create')) return 'create';
    return 'list';
  }, [allowedTabs]);

  const activeTab: GradeBookTab = useMemo(() => {
    if (requestedTab && allowedTabs.includes(requestedTab)) return requestedTab;
    return defaultTab;
  }, [requestedTab, allowedTabs, defaultTab]);

  useEffect(() => {
    if (!allowedTabs.length) return;

    if (!requestedTab || requestedTab !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [allowedTabs.length, requestedTab, activeTab, searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    const tab = value as GradeBookTab;
    if (!allowedTabs.includes(tab)) return;

    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const institutionChipText = useMemo(() => {
    const regionOrDept = currentUser?.region?.name || currentUser?.department?.name || '';
    const institution = currentUser?.institution?.name || '';

    if (regionOrDept && institution) return `${regionOrDept} · ${institution}`;
    return regionOrDept || institution;
  }, [currentUser?.department?.name, currentUser?.institution?.name, currentUser?.region?.name]);

  // Render hierarchy breadcrumb for Region/Sector Admins
  const renderHierarchyInfo = () => {
    if (!canViewHierarchy) return null;
    
    return (
      <Card className="border-slate-200 mb-4 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            {isRegionAdmin && (
              <>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  <MapPin className="w-3 h-3 mr-1" />
                  Region Admin
                </Badge>
                <span className="text-slate-500">→</span>
              </>
            )}
            {isSectorAdmin && (
              <>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  <Building2 className="w-3 h-3 mr-1" />
                  Sektor Admin
                </Badge>
                <span className="text-slate-500">→</span>
              </>
            )}
            <span className="text-sm text-slate-600">
              {viewMode === 'region' && 'Bütün sektor və məktəbləri görürsünüz (Yalnız baxış)'}
              {viewMode === 'sector' && 'Bütün məktəbləri görürsünüz (Yalnız baxış)'}
              {viewMode === 'school' && 'Yalnız öz məktəbinizi görürsünüz'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Hierarchy Info Banner for Region/Sector Admins */}
      {renderHierarchyInfo()}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="inline-flex w-full sm:w-auto rounded-2xl bg-slate-100 p-1 gap-1 h-auto">
            {allowedTabs.includes('list') && (
              <TabsTrigger
                value="list"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Sinif Jurnalları
              </TabsTrigger>
            )}
            {allowedTabs.includes('list') && (
              <TabsTrigger
                value="analysis"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Nəticə Analizi
              </TabsTrigger>
            )}
            {allowedTabs.includes('admin') && (
              <TabsTrigger
                value="admin"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Admin İcmalı
              </TabsTrigger>
            )}
          </TabsList>

          {institutionChipText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-xl border border-blue-100">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5c6bc0] to-[#7c83ec] flex items-center justify-center shadow-sm">
                <School className="h-4 w-4 text-white" />
              </div>
              <span className="font-medium text-gray-700">{institutionChipText}</span>
            </div>
          )}
        </div>

        {allowedTabs.includes('list') && (
          <TabsContent value="list" className="mt-4">
            {/* Show hierarchy navigator for region/sector admins */}
            {canViewHierarchy ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-3">
                  <Card className="border-slate-200 h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Hiyerarşiya
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Məktəb və ya sektor axtar..."
                          value={hierarchySearch}
                          onChange={(e) => setHierarchySearch(e.target.value)}
                          className="pl-8 h-9 text-sm"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-4 max-h-[460px] overflow-y-auto">
                        <HierarchyNavigator
                          nodes={filteredInstitutionTree}
                          loading={institutionTreeLoading}
                          selectedId={selectedNode?.id}
                          selectedType={selectedNode?.type}
                          onSelect={handleSelectNode}
                          expandedIds={expandedIds}
                          onToggleExpand={toggleExpand}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-3">
                  <Card className="border-slate-200 h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Siniflər
                      </CardTitle>
                      {selectedInstitutionName && (
                        <span className="text-xs text-slate-500 truncate block" title={selectedInstitutionName}>
                          {selectedInstitutionName}
                        </span>
                      )}
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Sinif axtar..."
                          value={gradesSearch}
                          onChange={(e) => setGradesSearch(e.target.value)}
                          className="pl-8 h-9 text-sm"
                          disabled={!selectedInstitutionId}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {!selectedInstitutionId ? (
                        <div className="text-sm text-slate-500 text-center py-10">
                          Məktəb seçin
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Button
                              variant={selectedGradeId === null ? 'default' : 'outline'}
                              className="w-full justify-between"
                              onClick={() => setSelectedGradeId(null)}
                            >
                              Bütün siniflər
                              <Badge variant="secondary" className="ml-1 text-xs">{filteredGrades.length}</Badge>
                            </Button>
                          </div>

                          {gradesLoading ? (
                            <div className="text-sm text-slate-500 text-center py-10">Yüklənir...</div>
                          ) : filteredGrades.length === 0 ? (
                            <div className="text-sm text-slate-500 text-center py-10">
                              {gradesSearch.trim() ? 'Axtarışa uyğun sinif tapılmadı' : 'Sinif tapılmadı'}
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                              {filteredGrades.map((g) => (
                                <Button
                                  key={g.id}
                                  variant={selectedGradeId === g.id ? 'default' : 'outline'}
                                  className="w-full justify-between"
                                  onClick={() => setSelectedGradeId(g.id)}
                                >
                                  <span className="truncate">{g.label}</span>
                                  <span className="text-xs opacity-70">{g.studentCount}</span>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-6">
                  {!selectedInstitutionId ? (
                    <Card className="border-slate-200 h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <School className="w-4 h-4" />
                          Jurnallar
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="text-sm text-slate-500 text-center py-10">
                          Jurnalları görmək üçün məktəb seçin
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <GradeBookList
                      institutionId={selectedInstitutionId}
                      institutionName={selectedInstitutionName}
                      selectedGradeId={selectedGradeId}
                      selectedGradeLabel={filteredGrades.find(g => g.id === selectedGradeId)?.label}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* Two column layout for school admin and teacher */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-3">
                  <Card className="border-slate-200 h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Siniflər
                      </CardTitle>
                      <span className="text-xs text-slate-500 truncate block" title={institutionChipText || undefined}>
                        {institutionChipText || currentUser?.institution?.name}
                      </span>
                      <div className="relative mt-2">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Sinif axtar..."
                          value={gradesSearch}
                          onChange={(e) => setGradesSearch(e.target.value)}
                          className="pl-8 h-9 text-sm"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {gradesLoading ? (
                        <div className="text-sm text-slate-500 text-center py-10">Yüklənir...</div>
                      ) : filteredGrades.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-10">
                          {gradesSearch.trim() ? 'Axtarışa uyğun sinif tapılmadı' : 'Sinif tapılmadı'}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                          <Button
                            variant={selectedGradeId === null ? 'default' : 'outline'}
                            className="w-full justify-between"
                            onClick={() => setSelectedGradeId(null)}
                          >
                            Bütün siniflər
                            <Badge variant="secondary" className="ml-1 text-xs">{filteredGrades.length}</Badge>
                          </Button>
                          {filteredGrades.map((g) => (
                            <Button
                              key={g.id}
                              variant={selectedGradeId === g.id ? 'default' : 'outline'}
                              className="w-full justify-between"
                              onClick={() => setSelectedGradeId(g.id)}
                            >
                              <span className="truncate">{g.label}</span>
                              <span className="text-xs opacity-70">{g.studentCount}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-9">
                  <GradeBookList
                    institutionId={selectedInstitutionId}
                    institutionName={currentUser?.institution?.name}
                    selectedGradeId={selectedGradeId}
                    selectedGradeLabel={filteredGrades.find(g => g.id === selectedGradeId)?.label}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {allowedTabs.includes('list') && (
          <TabsContent value="analysis" className="mt-4">
            <GradeBookAnalysis />
          </TabsContent>
        )}

        {allowedTabs.includes('admin') && (
          <TabsContent value="admin" className="mt-4">
            <AdminDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// Wrap with Role Provider
const WrappedGradeBooksPage: React.FC = () => {
  return (
    <GradeBookRoleProvider>
      <GradeBooksPage />
    </GradeBookRoleProvider>
  );
};

export default WrappedGradeBooksPage;
