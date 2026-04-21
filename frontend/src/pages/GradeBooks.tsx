import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Calculator, School, BarChart3, Building2, MapPin, GraduationCap, BookOpen, FileDown, ChevronRight, ChevronDown, LayoutDashboard, LayoutGrid } from 'lucide-react';
import { GradeBookList } from '@/components/gradebook';
import { GradeBookAnalysis } from '@/components/gradebook/analysis/GradeBookAnalysis';
import { AdminDashboard } from '@/components/gradebook/admin/AdminDashboard';
import { GradeBookRoleProvider, useGradeBookRole } from '@/contexts/GradeBookRoleContext';
import { HierarchyNavigator, useHierarchyState, HierarchyNode } from '@/components/gradebook/HierarchyNavigator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { hierarchyService, HierarchyNode as InstitutionHierarchyNode } from '@/services/hierarchy';
import { gradeService } from '@/services/grades';
import { gradeBookService } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GradeBookTab = 'list' | 'analysis' | 'admin_overview';

const GradeBooksPage: React.FC = () => {
  const { hasPermission, currentUser } = useAuth();
  const { viewMode, canViewHierarchy, isRegionAdmin, isSectorAdmin, canCreate: roleCanCreate } = useGradeBookRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [bulkExporting, setBulkExporting] = useState(false);

  // Institution hierarchy (Region->Sector->School) for Region/Sektor admins
  const [institutionTree, setInstitutionTree] = useState<HierarchyNode[]>([]);
  const [institutionTreeLoading, setInstitutionTreeLoading] = useState(true);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
  const [selectedClassLevel, setSelectedClassLevel] = useState<number | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [expandedClassLevelIds, setExpandedClassLevelIds] = useState<Set<number>>(new Set());

  const [gradesForInstitution, setGradesForInstitution] = useState<Array<{ id: number; name: string; classLevel: number; label: string; studentCount: number; journalCount: number }>>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [levelSearch, setLevelSearch] = useState('');
  const [letterSearch, setLetterSearch] = useState('');
  // Tam ağac — axtarış aktivləşdikdə bir dəfə yüklənir
  const [fullInstitutionTree, setFullInstitutionTree] = useState<HierarchyNode[] | null>(null);
  const [fullTreeLoading, setFullTreeLoading] = useState(false);
  const fullTreeLoadStartedRef = React.useRef(false);
  
  const {
    expandedIds,
    setExpandedIds,
    selectedNode,
    toggleExpand,
    selectNode,
  } = useHierarchyState();

  // Auto-select institution for school admin
  useEffect(() => {
    if (!canViewHierarchy && currentUser?.institution?.id) {
      setSelectedInstitutionId(currentUser.institution.id);
    }
  }, [canViewHierarchy, currentUser?.institution?.id]);

  // Fallback: if we still don't have an institution ID, try currentUser again
  useEffect(() => {
    if (!selectedInstitutionId && currentUser?.institution?.id) {
      console.log('[GradeBooks] Fallback: Setting institution ID from currentUser:', currentUser.institution.id);
      setSelectedInstitutionId(currentUser.institution.id);
    }
  }, [selectedInstitutionId, currentUser?.institution?.id]);

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
    if (children.length > 0) {
      return children.reduce((sum, child) => sum + countSchoolsInSubtree(child), 0);
    }
    // Uşaqlar hələ yüklənməyib — sektor üçün children_count məktəb sayıdır
    if (node.level === 3) return node.children_count ?? 0;
    return 0;
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

        const response = await hierarchyService.getHierarchy({ max_depth: 2, include_inactive: false });
        const rootNodes = response?.data ?? [];
        const mapped = toNavigatorNodes(rootNodes);
        setInstitutionTree(mapped);

        // Yalnız region səviyyəsini açıq göstər; sektorlar bağlı başlasın (kliklə lazy load)
        const regionIds = new Set<number>();
        const collectRegions = (items: HierarchyNode[]) => {
          items.forEach(item => {
            if (item.type === 'region') {
              regionIds.add(item.id);
            } else if (item.type === 'sector') {
              // Sektorlar bağlı — kliklə məktəblər lazy load ediləcək
            }
          });
        };
        collectRegions(mapped);
        setExpandedIds(regionIds);
      } catch (error) {
        console.error('[InstitutionHierarchy] Error:', error);
        setInstitutionTree([]);
      } finally {
        setInstitutionTreeLoading(false);
      }
    };

    loadInstitutionTree();
  }, [canViewHierarchy, setExpandedIds]);

  // Lazy-load children for institution nodes (schools) when expanded
  const handleLoadChildren = useCallback(async (node: HierarchyNode): Promise<HierarchyNode[]> => {
    try {
      const response = await hierarchyService.getSubTree(node.id, { depth: 2, include_inactive: false });
      if (response.success && response.data) {
        const children = Array.isArray(response.data.children) ? response.data.children : [];
        return toNavigatorNodes(children);
      }
    } catch (error) {
      console.error('[HierarchyLazyLoad] Error:', error);
    }
    return [];
  }, []);

  // Mount olduqda arxa planda tam ağacı yüklə (axtarış gözləmədən)
  useEffect(() => {
    if (!canViewHierarchy || fullTreeLoadStartedRef.current) return;
    fullTreeLoadStartedRef.current = true;
    setFullTreeLoading(true);
    hierarchyService.getHierarchy({ max_depth: 3, include_inactive: false })
      .then(response => {
        setFullInstitutionTree(toNavigatorNodes(response?.data ?? []));
      })
      .catch(e => {
        console.error('[FullTree]', e);
        fullTreeLoadStartedRef.current = false; // Xəta olarsa yenidən cəhd et
      })
      .finally(() => setFullTreeLoading(false));
  }, [canViewHierarchy]);

  const canViewList = hasPermission('assessments.read');
  const canCreate = hasPermission('assessments.create') && roleCanCreate;

  // Selection handler: we select school nodes here
  const handleSelectNode = (node: HierarchyNode) => {
    selectNode(node);

    if (node.type === 'institution') {
      setSelectedInstitutionId(node.id);
      setSelectedClassLevel(null);
      setSelectedLetter(null);
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
          setSelectedClassLevel(null);
          setSelectedLetter(null);
          return;
        }

        const [gradesResult, gradeBooksResult] = await Promise.all([
          gradeService.get({ institution_id: selectedInstitutionId, is_active: true, per_page: 100 }),
          gradeBookService.getGradeBooks({ institution_id: selectedInstitutionId }),
        ]);
        const items = gradesResult.items;
        const gradeBooks = gradeBooksResult.data ?? [];

        // Hər grade_id üçün jurnal sayı
        const journalCountMap = new Map<number, number>();
        gradeBooks.forEach(gb => {
          if (gb.grade?.id) {
            journalCountMap.set(gb.grade.id, (journalCountMap.get(gb.grade.id) ?? 0) + 1);
          }
        });

        const list = items
          .map((grade) => ({
            id: grade.id,
            name: grade.name || '',
            classLevel: grade.class_level || 0,
            label: grade.full_name || grade.display_name || grade.name || `Sinif ${grade.id}`,
            studentCount: grade.real_student_count ?? grade.student_count ?? 0,
            journalCount: journalCountMap.get(grade.id) ?? 0,
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

  const classLevels = useMemo(() => {
    const levelsMap = new Map<number, { level: number; studentCount: number; journalCount: number }>();
    gradesForInstitution.forEach(g => {
      if (g.classLevel === null || g.classLevel === undefined) return;
      if (!levelsMap.has(g.classLevel)) {
        levelsMap.set(g.classLevel, { level: g.classLevel, studentCount: 0, journalCount: 0 });
      }
      const entry = levelsMap.get(g.classLevel)!;
      entry.studentCount += g.studentCount;
      entry.journalCount += g.journalCount;
    });
    return Array.from(levelsMap.values()).sort((a, b) => a.level - b.level);
  }, [gradesForInstitution]);

  const classLetters = useMemo(() => {
    if (selectedClassLevel === null || selectedClassLevel === undefined) return [];
    return gradesForInstitution
      .filter(g => g.classLevel === selectedClassLevel)
      .sort((a, b) => a.name.localeCompare(b.name, 'az'));
  }, [gradesForInstitution, selectedClassLevel]);

  const selectedGradeId = useMemo(() => {
    if ((selectedClassLevel === null || selectedClassLevel === undefined) || !selectedLetter) return null;
    const grade = gradesForInstitution.find(
      g => g.classLevel === selectedClassLevel && g.name === selectedLetter
    );
    return grade ? grade.id : null;
  }, [selectedClassLevel, selectedLetter, gradesForInstitution]);

  // "4A" kimi tam adı da axtarır; uyğun hərfə görə tapılan səviyyəni avtomatik açır
  const filteredLevelsWithLetters = useMemo(() => {
    type LevelItem = { level: number; studentCount: number; journalCount: number };
    type GradeItem = typeof gradesForInstitution[number];
    type Row = { lvl: LevelItem; letters: GradeItem[]; autoExpand: boolean };

    const allLettersFor = (lvl: number) =>
      gradesForInstitution.filter(g => g.classLevel === lvl).sort((a, b) => a.name.localeCompare(b.name, 'az'));

    if (!levelSearch.trim()) {
      return classLevels.map<Row>(lvl => ({ lvl, letters: allLettersFor(lvl.level), autoExpand: false }));
    }

    const q = levelSearch.toLowerCase();
    const rows: Row[] = [];
    for (const lvl of classLevels) {
      const letters = allLettersFor(lvl.level);
      const levelMatches = `${lvl.level}-ci sinif`.toLowerCase().includes(q) || `${lvl.level}`.includes(q);
      const matchingLetters = letters.filter(g => `${lvl.level}${g.name}`.toLowerCase().includes(q));
      if (!levelMatches && matchingLetters.length === 0) continue;
      rows.push({ lvl, letters: levelMatches ? letters : matchingLetters, autoExpand: !levelMatches });
    }
    return rows;
  }, [classLevels, levelSearch, gradesForInstitution]);

  const filteredClassLetters = useMemo(() => {
    if (!letterSearch.trim()) return classLetters;
    const q = letterSearch.toLowerCase();
    return classLetters.filter(g => g.name.toLowerCase().includes(q));
  }, [classLetters, letterSearch]);

  // Reset letter search when level changes
  useEffect(() => {
    setLetterSearch('');
  }, [selectedClassLevel]);

  // Reset level + letter search when institution changes
  useEffect(() => {
    setLevelSearch('');
    setLetterSearch('');
    setExpandedClassLevelIds(new Set());
  }, [selectedInstitutionId]);

  const filteredInstitutionTree = useMemo(() => {
    const baseTree = hierarchySearch.trim() ? (fullInstitutionTree ?? institutionTree) : institutionTree;
    if (!hierarchySearch.trim()) return baseTree;
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
    return filterNodes(baseTree);
  }, [institutionTree, fullInstitutionTree, hierarchySearch]);

  // Axtarış aktiv olduqda filtrlənmiş ağacdakı bütün node-ları açıq göstər
  const activeExpandedIds = useMemo(() => {
    if (!hierarchySearch.trim()) return expandedIds;
    const ids = new Set<number>();
    const collectAll = (nodes: HierarchyNode[]) => {
      nodes.forEach(n => {
        ids.add(n.id);
        if (n.children) collectAll(n.children);
      });
    };
    collectAll(filteredInstitutionTree);
    return ids;
  }, [hierarchySearch, filteredInstitutionTree, expandedIds]);



  const allowedTabs = useMemo(() => {
    const tabs: GradeBookTab[] = [];
    if (canViewList) tabs.push('list', 'analysis');
    if (isRegionAdmin || isSectorAdmin) tabs.push('admin_overview');
    return tabs;
  }, [canViewList, isRegionAdmin, isSectorAdmin]);

  const requestedTab = (searchParams.get('tab') as GradeBookTab | null) ?? null;

  const defaultTab: GradeBookTab = useMemo(() => {
    if (allowedTabs.includes('admin_overview')) return 'admin_overview';
    if (allowedTabs.includes('list')) return 'list';
    return allowedTabs[0] || 'list';
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

  const handleBulkExport = async (gradeId: number, gradeLabel: string) => {
    setBulkExporting(true);
    try {
      const blob = await gradeBookService.bulkExportByGrade(gradeId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jurnal_${gradeLabel}_butun_fennler.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: 'Uğurlu', description: `${gradeLabel} jurnalları export edildi` });
    } catch {
      toast({ title: 'Xəta', description: 'Export zamanı xəta baş verdi', variant: 'destructive' });
    } finally {
      setBulkExporting(false);
    }
  };

  const institutionChipText = useMemo(() => {
    const regionOrDept = currentUser?.region?.name || currentUser?.department?.name || '';
    const institution = currentUser?.institution?.name || '';

    if (regionOrDept && institution) return `${regionOrDept} · ${institution}`;
    return regionOrDept || institution;
  }, [currentUser?.department?.name, currentUser?.institution?.name, currentUser?.region?.name]);

  // Render hierarchy breadcrumb for Region/Sector Admins

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
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
            {allowedTabs.includes('analysis') && (
              <TabsTrigger
                value="analysis"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Nəticə Analizi
              </TabsTrigger>
            )}
            {allowedTabs.includes('admin_overview') && (
              <TabsTrigger
                value="admin_overview"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                <Calculator className="w-4 h-4 mr-2" />
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
              /* 3-block layout: I=Region/Sektor/Məktəblər  II=Siniflər  III=Jurnallar */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Block I: Region / Sektor / Məktəblər */}
                <div className="md:col-span-4 flex flex-col">
                  <Card className="border-slate-200 flex flex-col min-h-[580px]">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Region / Sektor / Məktəblər
                      </CardTitle>
                      <span className="text-xs text-slate-500 block">&nbsp;</span>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Məktəb və ya sektor axtar..."
                          value={hierarchySearch}
                          onChange={(e) => setHierarchySearch(e.target.value)}
                          className="pl-10 h-9 border-slate-200"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                      <div className="p-4">
                        {fullTreeLoading && (
                          <p className="text-xs text-slate-400 text-center pb-2 animate-pulse">
                            Məktəblər axtarış üçün yüklənir...
                          </p>
                        )}
                        <HierarchyNavigator
                          nodes={filteredInstitutionTree}
                          loading={institutionTreeLoading}
                          selectedId={selectedNode?.id}
                          selectedType={selectedNode?.type}
                          onSelect={handleSelectNode}
                          expandedIds={activeExpandedIds}
                          onToggleExpand={toggleExpand}
                          onLoadChildren={handleLoadChildren}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Block II: Siniflər (səviyyə + hərf) */}
                <div className="md:col-span-4 flex flex-col">
                  <Card className="border-slate-200 flex flex-col min-h-[580px]">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Siniflər
                      </CardTitle>
                      <span className="text-xs text-slate-500 truncate block" title={selectedInstitutionName || undefined}>
                        {selectedInstitutionName || '\u00a0'}
                      </span>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Sinif axtar..."
                          value={levelSearch}
                          onChange={(e) => setLevelSearch(e.target.value)}
                          disabled={!selectedInstitutionId}
                          className="pl-10 h-9 border-slate-200 disabled:opacity-50"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
                      {!selectedInstitutionId ? (
                        <div className="text-sm text-slate-500 text-center py-10">Məktəb seçin</div>
                      ) : gradesLoading ? (
                        <div className="text-sm text-slate-500 text-center py-10">Yüklənir...</div>
                      ) : filteredLevelsWithLetters.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-10">
                          {levelSearch ? 'Axtarışa uyğun sinif tapılmadı' : 'Sinif tapılmadı'}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredLevelsWithLetters.map(({ lvl, letters, autoExpand }) => {
                            const isOpen = expandedClassLevelIds.has(lvl.level) || autoExpand;
                            return (
                              <div key={lvl.level} className="border border-slate-200 rounded-lg overflow-hidden">
                                {/* Accordion header */}
                                <button
                                  className={cn(
                                    'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors',
                                    isOpen ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                                  )}
                                  onClick={() => {
                                    setExpandedClassLevelIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(lvl.level)) next.delete(lvl.level);
                                      else next.add(lvl.level);
                                      return next;
                                    });
                                    if (!isOpen) setSelectedClassLevel(lvl.level);
                                  }}
                                >
                                  <span className="flex items-center gap-2">
                                    {isOpen
                                      ? <ChevronDown className="w-4 h-4 shrink-0" />
                                      : <ChevronRight className="w-4 h-4 shrink-0" />
                                    }
                                    {lvl.level}-ci sinif
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Badge variant="secondary" className={cn('text-xs', isOpen ? 'bg-blue-500 text-white' : '')}>
                                      {lvl.studentCount} şagird
                                    </Badge>
                                    <Badge variant="secondary" className={cn('text-xs', isOpen ? 'bg-blue-500 text-white' : '')}>
                                      {lvl.journalCount} jurnal
                                    </Badge>
                                  </span>
                                </button>

                                {/* Accordion body: class letters */}
                                {isOpen && (
                                  <div className="p-2 space-y-1 bg-white">
                                    {letters.length === 0 ? (
                                      <p className="text-xs text-slate-500 text-center py-2">Bölmə tapılmadı</p>
                                    ) : (
                                      letters.map((g) => (
                                        <div key={g.id} className="flex gap-1">
                                          <Button
                                            variant={selectedLetter === g.name && selectedClassLevel === lvl.level ? 'default' : 'outline'}
                                            size="sm"
                                            className="flex-1 justify-between h-8 text-xs"
                                            onClick={() => { setSelectedClassLevel(lvl.level); setSelectedLetter(g.name); }}
                                          >
                                            <span>{lvl.level}{g.name}</span>
                                            <span className="flex items-center gap-1 ml-1">
                                              <Badge variant="secondary" className="text-xs">{g.studentCount} şagird</Badge>
                                              {g.journalCount > 0 && <Badge variant="secondary" className="text-xs">{g.journalCount} jurnal</Badge>}
                                            </span>
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 h-8 w-8 text-slate-400 hover:text-slate-700"
                                            title={`${lvl.level}${g.name} - Bütün fənnləri export et`}
                                            disabled={bulkExporting}
                                            onClick={() => handleBulkExport(g.id, `${lvl.level}-${g.name}`)}
                                          >
                                            <FileDown className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Block III: Jurnallar */}
                <div className="md:col-span-4 flex flex-col min-h-[580px]">
                  {!selectedGradeId ? (
                    <Card className="border-slate-200 flex flex-col flex-1 min-h-[580px]">
                      <CardHeader className="pb-3 flex-shrink-0">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Jurnallar
                        </CardTitle>
                        <span className="text-xs text-slate-500 block">&nbsp;</span>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Jurnal axtar..."
                            disabled
                            className="pl-10 h-9 border-slate-200 opacity-50"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 flex-1 flex items-center justify-center">
                        <div className="text-sm text-slate-500 text-center">
                          {!selectedInstitutionId
                            ? 'Jurnalları görmək üçün məktəb seçin'
                            : 'Jurnalları görmək üçün sinif seçin'}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <GradeBookList
                      institutionId={selectedInstitutionId}
                      institutionName={selectedInstitutionName}
                      selectedGradeId={selectedGradeId}
                      selectedGradeLabel={
                        selectedClassLevel !== null && selectedClassLevel !== undefined && selectedLetter
                          ? `${selectedClassLevel}-${selectedLetter}`
                          : undefined
                      }
                    />
                  )}
                </div>
              </div>
            ) : (
              /* 3-block layout for school admin: I=Sinif Səviyyələri  II=Siniflər  III=Jurnallar */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Block I: Sinif Səviyyələri */}
                <div className="md:col-span-4 flex flex-col">
                  <Card className="border-slate-200 flex flex-col min-h-[580px]">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Sinif Səviyyələri
                      </CardTitle>
                      <span className="text-xs text-slate-500 truncate block" title={institutionChipText || undefined}>
                        {institutionChipText || currentUser?.institution?.name || '\u00a0'}
                      </span>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Sinif axtar..."
                          value={levelSearch}
                          onChange={(e) => setLevelSearch(e.target.value)}
                          className="pl-10 h-9 border-slate-200"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-y-auto">
                      {gradesLoading ? (
                        <div className="text-sm text-slate-500 text-center py-10">Yüklənir...</div>
                      ) : filteredLevelsWithLetters.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-10">
                          {levelSearch ? 'Axtarışa uyğun sinif tapılmadı' : 'Sinif tapılmadı'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            variant={selectedClassLevel === null ? 'default' : 'outline'}
                            className="w-full justify-start gap-2"
                            onClick={() => { setSelectedClassLevel(null); setSelectedLetter(null); }}
                          >
                            <LayoutGrid className="w-4 h-4" />
                            Bütün siniflər
                          </Button>
                          {filteredLevelsWithLetters.map(({ lvl }) => (
                            <Button
                              key={lvl.level}
                              variant={selectedClassLevel === lvl.level ? 'default' : 'outline'}
                              className="w-full justify-between"
                              onClick={() => { setSelectedClassLevel(lvl.level); setSelectedLetter(null); }}
                            >
                              <span className="truncate">{lvl.level}-ci sinif</span>
                              <span className="flex items-center gap-1 ml-1">
                                <Badge variant="secondary" className="text-xs">{lvl.studentCount} şagird</Badge>
                                <Badge variant="secondary" className="text-xs">{lvl.journalCount} jurnal</Badge>
                              </span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Block II: Siniflər (A, B...) */}
                <div className="md:col-span-4 flex flex-col">
                  <Card className="border-slate-200 flex flex-col min-h-[580px]">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Siniflər
                      </CardTitle>
                      <span className="text-xs text-slate-500 truncate block">
                        {selectedClassLevel !== null && selectedClassLevel !== undefined
                          ? `${selectedClassLevel}-ci sinif bölmələri`
                          : '\u00a0'}
                      </span>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Bölmə axtar..."
                          value={letterSearch}
                          onChange={(e) => setLetterSearch(e.target.value)}
                          disabled={selectedClassLevel === null || selectedClassLevel === undefined}
                          className="pl-10 h-9 border-slate-200 disabled:opacity-50"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-y-auto">
                      {(selectedClassLevel === null || selectedClassLevel === undefined) ? (
                        gradesForInstitution.length <= 20 || levelSearch ? (
                          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                            {gradesForInstitution
                              .filter(g => !levelSearch || g.label.toLowerCase().includes(levelSearch.toLowerCase()))
                              .map((grade) => (
                                <Button
                                  key={grade.id}
                                  variant={selectedLetter === grade.name && selectedClassLevel === grade.classLevel ? 'default' : 'outline'}
                                  className="justify-between h-auto py-2 px-3"
                                  onClick={() => { 
                                    setSelectedClassLevel(grade.classLevel); 
                                    setSelectedLetter(grade.name); 
                                  }}
                                >
                                  <span className="font-medium">{grade.label}</span>
                                  <div className="flex items-center gap-1 ml-2">
                                    <Badge variant="secondary" className="px-1 text-[10px] font-normal">
                                      {grade.studentCount} şagird
                                    </Badge>
                                    <Badge variant="secondary" className="px-1 text-[10px] font-normal">
                                      {grade.journalCount} jurnal
                                    </Badge>
                                  </div>
                                </Button>
                              ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                            <GraduationCap className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">Sinif səviyyəsi seçin</p>
                          </div>
                        )
                      ) : filteredClassLetters.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-10">
                          {letterSearch ? 'Axtarışa uyğun bölmə tapılmadı' : 'Bu səviyyədə sinif tapılmadı'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredClassLetters.map((g) => (
                            <div key={g.id} className="flex gap-1">
                               <Button
                                 variant={selectedLetter === g.name ? 'default' : 'outline'}
                                 className="flex-1 justify-between"
                                 onClick={() => setSelectedLetter(g.name)}
                               >
                                 <span className="truncate">{g.name}</span>
                                 <div className="flex items-center gap-1 ml-1">
                                   <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal whitespace-nowrap">{g.studentCount} şagird</Badge>
                                   <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal whitespace-nowrap">{g.journalCount} jurnal</Badge>
                                 </div>
                               </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-9 w-9 text-slate-400 hover:text-slate-700"
                                title={`${g.name} - Bütün fənnləri export et`}
                                disabled={bulkExporting}
                                onClick={() => handleBulkExport(g.id, `${selectedClassLevel}-${g.name}`)}
                              >
                                <FileDown className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Block III: Jurnallar */}
                <div className="md:col-span-4 flex flex-col min-h-[580px]">
                  {!selectedGradeId ? (
                    <Card className="border-slate-200 flex flex-col flex-1 min-h-[580px]">
                      <CardHeader className="pb-3 flex-shrink-0">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Jurnallar
                        </CardTitle>
                        <span className="text-xs text-slate-500 block">&nbsp;</span>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Jurnal axtar..."
                            disabled
                            className="pl-10 h-9 border-slate-200 opacity-50"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 flex-1 flex items-center justify-center">
                        <div className="text-sm text-slate-500 text-center">
                          {!selectedInstitutionId
                            ? 'Jurnalları görmək üçün məktəb seçin'
                            : 'Jurnalları görmək üçün sinif seçin'}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <GradeBookList
                      institutionId={selectedInstitutionId}
                      institutionName={currentUser?.institution?.name}
                      selectedGradeId={selectedGradeId}
                      selectedGradeLabel={
                        selectedClassLevel !== null && selectedClassLevel !== undefined && selectedLetter
                          ? `${selectedClassLevel}-${selectedLetter}`
                          : undefined
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {allowedTabs.includes('analysis') && (
          <TabsContent value="analysis" className="mt-4">
            <GradeBookAnalysis />
          </TabsContent>
        )}

        {allowedTabs.includes('admin_overview') && (
          <TabsContent value="admin_overview" className="mt-4">
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
