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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GradeBookCreatePage from './GradeBookCreate';

type GradeBookTab = 'list' | 'analysis' | 'admin' | 'create';

// Mock hierarchy data for demo
const generateMockHierarchy = (viewMode: string): HierarchyNode[] => {
  if (viewMode === 'region') {
    return [
      {
        id: 1,
        name: 'Bakı Region',
        type: 'region',
        stats: { institutions: 12, grade_books: 45, average: 4.2 },
        children: [
          {
            id: 1,
            name: 'Sektor 1',
            type: 'sector',
            stats: { institutions: 6, grade_books: 24 },
            children: [
              {
                id: 1,
                name: 'Məktəb 1',
                type: 'institution',
                stats: { grade_books: 8 },
              },
              {
                id: 2,
                name: 'Məktəb 2',
                type: 'institution',
                stats: { grade_books: 6 },
              },
            ],
          },
          {
            id: 2,
            name: 'Sektor 2',
            type: 'sector',
            stats: { institutions: 6, grade_books: 21 },
          },
        ],
      },
    ];
  } else if (viewMode === 'sector') {
    return [
      {
        id: 1,
        name: 'Sektor 1',
        type: 'sector',
        stats: { institutions: 6, grade_books: 24, average: 4.1 },
        children: [
          {
            id: 1,
            name: 'Məktəb 1',
            type: 'institution',
            stats: { grade_books: 8 },
          },
          {
            id: 2,
            name: 'Məktəb 2',
            type: 'institution',
            stats: { grade_books: 6 },
          },
          {
            id: 3,
            name: 'Məktəb 3',
            type: 'institution',
            stats: { grade_books: 10 },
          },
        ],
      },
    ];
  }
  return [];
};

const GradeBooksPage: React.FC = () => {
  const { hasPermission, currentUser } = useAuth();
  const { viewMode, canViewHierarchy, isRegionAdmin, isSectorAdmin, canCreate: roleCanCreate } = useGradeBookRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hierarchyData] = useState<HierarchyNode[]>(() => generateMockHierarchy(viewMode));
  
  const {
    expandedIds,
    selectedNode,
    toggleExpand,
    selectNode,
  } = useHierarchyState();

  const canViewList = hasPermission('assessments.read');
  const canCreate = hasPermission('assessments.write') && roleCanCreate;
  const canAccessAdmin = isRegionAdmin || isSectorAdmin;

  const allowedTabs = useMemo(() => {
    const tabs: GradeBookTab[] = [];
    if (canViewList) tabs.push('list', 'analysis');
    if (canAccessAdmin) tabs.push('admin');
    if (canCreate) tabs.push('create');
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
            {allowedTabs.includes('create') && (
              <TabsTrigger
                value="create"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                + Yeni Jurnal
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
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1">
                  <HierarchyNavigator
                    nodes={hierarchyData}
                    loading={false}
                    selectedId={selectedNode?.id}
                    selectedType={selectedNode?.type}
                    onSelect={selectNode}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                  />
                </div>
                <div className="lg:col-span-3">
                  <GradeBookList />
                </div>
              </div>
            ) : (
              /* Show only grade book list for school admin and teacher */
              <GradeBookList />
            )}
          </TabsContent>
        )}

        {allowedTabs.includes('list') && (
          <TabsContent value="analysis" className="mt-4">
            <GradeBookAnalysis />
          </TabsContent>
        )}

        {allowedTabs.includes('create') && (
          <TabsContent value="create" className="mt-4">
            <GradeBookCreatePage />
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
