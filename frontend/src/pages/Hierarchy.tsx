import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GitBranch, 
  Plus, 
  Settings, 
  RefreshCw, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Navigation,
  Edit,
  Move
} from "lucide-react";
import { 
  hierarchyService, 
  HierarchyNode, 
  HierarchyFilters
} from '@/services/hierarchy';
import HierarchyTree from '@/components/hierarchy/HierarchyTree';
import { HierarchyStatsCards, HierarchyBreakdown } from '@/components/hierarchy/HierarchyStatistics';
import { HierarchyFilters as HierarchyFiltersComponent } from '@/components/hierarchy/HierarchyFilters';
import { HierarchyBreadcrumb } from '@/components/hierarchy/HierarchyBreadcrumb';
import { HierarchyValidation } from '@/components/hierarchy/HierarchyValidation';
import HierarchyModal from '@/components/hierarchy/HierarchyModal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Hierarchy() {
  const { currentUser: user, loading } = useAuth();
  const queryClient = useQueryClient();

  console.log('Hierarchy Page - User:', user);
  console.log('Hierarchy Page - Loading:', loading);
  console.log('User Role:', user?.role);
  console.log('Role Check Result:', ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(user?.role || ''));

  // State hooks - all at the top
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<HierarchyFilters>({
    include_inactive: false,
    max_depth: 5,
    expand_all: false,
  });
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<any[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'move'>('edit');
  const [availableParents, setAvailableParents] = useState<HierarchyNode[]>([]);

  // Check access permissions
  const hasAccess = user && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(user.role);
  const canModify = hierarchyService.canModifyHierarchy(user?.roles || []);

  // Fetch hierarchy data - use enabled prop
  const {
    data: hierarchyResponse,
    isLoading: hierarchyLoading,
    error: hierarchyError,
    refetch: refetchHierarchy
  } = useQuery({
    queryKey: ['hierarchy', filters, user?.role, user?.institution_id],
    queryFn: () => hierarchyService.getHierarchy(filters),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: hasAccess,
  });

  // Fetch hierarchy statistics - use enabled prop
  const {
    data: statisticsData,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['hierarchy-statistics', user?.role, user?.institution_id],
    queryFn: () => hierarchyService.getStatistics(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: hasAccess,
  });

  // Fetch validation data when requested - use enabled prop
  const {
    data: validationData,
    isLoading: validationLoading,
    refetch: validateHierarchy
  } = useQuery({
    queryKey: ['hierarchy-validation'],
    queryFn: () => hierarchyService.validateHierarchy(),
    enabled: showValidation && hasAccess,
    refetchOnWindowFocus: false,
  });

  // Search institutions - use enabled prop
  const {
    data: searchResults,
    isLoading: searchLoading
  } = useQuery({
    queryKey: ['hierarchy-search', searchTerm, filters, user?.role, user?.institution_id],
    queryFn: () => hierarchyService.searchInstitutions(searchTerm, filters),
    enabled: searchTerm.length >= 2 && hasAccess,
    refetchOnWindowFocus: false,
  });

  // Show loading while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Yüklənir...</p>
        </div>
      </div>
    );
  }

  // Security check - only administrative roles can access hierarchy management
  if (!hasAccess) {
    console.log('Access denied for user:', user);
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız idarəçi rolları daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  const hierarchyData = hierarchyResponse?.data || [];
  const statistics = statisticsData;
  const validation = validationData;

  // Load available parents when needed for move modal
  const loadAvailableParents = async (currentNode: HierarchyNode) => {
    try {
      // Get all institutions that can be parents (not descendants of current node)
      const allHierarchy = await hierarchyService.getHierarchy({ expand_all: true });
      const descendants = await hierarchyService.getDescendants(currentNode.id);
      const descendantIds = new Set([currentNode.id, ...descendants.map(d => d.id)]);
      
      // Filter out current node and its descendants
      const availableParents = allHierarchy.data
        .filter((node: HierarchyNode) => !descendantIds.has(node.id))
        .filter((node: HierarchyNode) => node.level < 4); // Only allow up to level 4 as parents
      
      setAvailableParents(availableParents);
    } catch (error) {
      toast.error('Valideyn müəssisələr yüklənmədi');
    }
  };

  const handleNodeSelect = async (node: HierarchyNode) => {
    setSelectedNode(node);
    
    // Load path for selected node
    try {
      const pathResponse = await hierarchyService.getInstitutionPath(node.id);
      setSelectedPath(pathResponse.data);
    } catch (error) {
      console.error('Failed to load institution path:', error);
    }
  };

  const handleNodeExpand = async (node: HierarchyNode) => {
    // Load children if needed
    try {
      await hierarchyService.getSubTree(node.id, { depth: 2 });
      // Refresh hierarchy to show new data
      refetchHierarchy();
    } catch (error) {
      toast.error('Alt müəssisələr yüklənmədi');
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['hierarchy-statistics'] });
    toast.success('Hierarchy məlumatları yeniləndi');
  };

  const handleValidation = () => {
    setShowValidation(true);
    validateHierarchy();
  };

  const handleEditInstitution = () => {
    if (selectedNode) {
      // Check if this is a department node
      if (typeof selectedNode.id === 'string' && selectedNode.id.startsWith('dept_')) {
        toast.error('Departmentlər hierarchy modalı ilə redaktə edilə bilməz');
        return;
      }
      setModalMode('edit');
      setModalOpen(true);
    }
  };

  const handleMoveInstitution = async () => {
    if (selectedNode) {
      // Check if this is a department node
      if (typeof selectedNode.id === 'string' && selectedNode.id.startsWith('dept_')) {
        toast.error('Departmentlər hierarchy modalı ilə köçürülə bilməz');
        return;
      }
      setModalMode('move');
      await loadAvailableParents(selectedNode);
      setModalOpen(true);
    }
  };

  const handleModalSuccess = () => {
    // Refresh data after successful operation
    queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['hierarchy-statistics'] });
    setModalOpen(false);
  };

  const handleFiltersReset = () => {
    setFilters({
      include_inactive: false,
      max_depth: 5,
      expand_all: false,
    });
    setSearchTerm('');
  };

  const filteredNodes = searchTerm.length >= 2 && searchResults ? searchResults : hierarchyData;

  if (hierarchyError) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Hierarchy yüklənərkən xəta baş verdi</h3>
            <p className="text-muted-foreground mb-4">
              {hierarchyError instanceof Error ? hierarchyError.message : 'Naməlum xəta'}
            </p>
            <Button onClick={() => refetchHierarchy()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenidən cəhd et
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">İerarxiya İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Təşkilati strukturun dinamik idarəsi və visualizasiya
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={hierarchyLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${hierarchyLoading ? 'animate-spin' : ''}`} />
            Yenilə
          </Button>
          {['superadmin', 'regionadmin'].includes(user?.role || '') && (
            <Button 
              variant="outline" 
              onClick={handleValidation}
              disabled={validationLoading}
            >
              <Shield className="h-4 w-4 mr-2" />
              Validasiya
            </Button>
          )}
          {canModify && (
            <Button className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Strukturu İdarə Et
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="space-y-4">
          <HierarchyStatsCards 
            statistics={statistics} 
            loading={statsLoading}
          />
        </div>
      )}

      {/* Validation Results */}
      {showValidation && (
        <HierarchyValidation
          validation={validation}
          isLoading={validationLoading}
          onValidate={handleValidation}
        />
      )}

      {/* Breadcrumb Navigation */}
      {selectedPath.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <HierarchyBreadcrumb
              path={selectedPath}
              onNavigate={(institutionId) => {
                const node = hierarchyData.find((n: HierarchyNode) => n.id === institutionId);
                if (node) handleNodeSelect(node);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <HierarchyFiltersComponent
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleFiltersReset}
        isLoading={searchLoading}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hierarchy Tree */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <CardTitle>Təşkilati Struktur</CardTitle>
                </div>
                {searchTerm.length >= 2 && (
                  <div className="text-sm text-muted-foreground">
                    {filteredNodes.length} nəticə tapıldı
                  </div>
                )}
              </div>
              <CardDescription>
                İnteraktiv hierarchy strukturu - müəssisələri seçin və idarə edin
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {hierarchyLoading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Hierarchy yüklənir...</p>
                </div>
              ) : (
                <HierarchyTree
                  nodes={Array.isArray(filteredNodes) ? filteredNodes : hierarchyData}
                  onNodeSelect={handleNodeSelect}
                  onNodeExpand={handleNodeExpand}
                  canModify={canModify}
                  selectedNodeId={selectedNode?.id}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Selected Node Details */}
          {selectedNode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-primary" />
                  Seçilmiş Müəssisə
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">
                        {hierarchyService.getTypeIcon(selectedNode.type)}
                      </span>
                      <h4 className="font-medium">{selectedNode.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {hierarchyService.getTypeDisplayName(selectedNode.type)} • Səviyyə {selectedNode.level}
                    </p>
                  </div>

                  {/* Additional details */}
                  <div className="space-y-2">
                    {selectedNode.description && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Təsvir:</span>{' '}
                        {selectedNode.description}
                      </div>
                    )}
                    {selectedNode.address && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Ünvan:</span>{' '}
                        {selectedNode.address}
                      </div>
                    )}
                    {selectedNode.phone && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Telefon:</span>{' '}
                        {selectedNode.phone}
                      </div>
                    )}
                    {selectedNode.capacity && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Tutum:</span>{' '}
                        {selectedNode.capacity}
                      </div>
                    )}
                  </div>

                  {selectedNode.metadata && (
                    <div className="space-y-2">
                      {selectedNode.type === 'department' ? (
                        // Department-specific metadata
                        <>
                          {selectedNode.metadata.department_type && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Şöbə növü:</span>{' '}
                              {selectedNode.metadata.department_type}
                            </div>
                          )}
                          {selectedNode.metadata.head_name && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Şöbə rəhbəri:</span>{' '}
                              {selectedNode.metadata.head_name}
                            </div>
                          )}
                          {selectedNode.metadata.staff_count && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">İşçi sayı:</span>{' '}
                              {selectedNode.metadata.staff_count}
                            </div>
                          )}
                        </>
                      ) : (
                        // Institution metadata
                        <>
                          {selectedNode.metadata.region_code && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Region kodu:</span>{' '}
                              {selectedNode.metadata.region_code}
                            </div>
                          )}
                          {selectedNode.metadata.director_name && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Direktor:</span>{' '}
                              {selectedNode.metadata.director_name}
                            </div>
                          )}
                          {selectedNode.metadata.student_capacity && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Tutum:</span>{' '}
                              {selectedNode.metadata.student_capacity} şagird
                            </div>
                          )}
                          {selectedNode.metadata.staff_count && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">İşçi sayı:</span>{' '}
                              {selectedNode.metadata.staff_count}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Ətraflı
                    </Button>
                    {canModify && !(typeof selectedNode.id === 'string' && selectedNode.id.startsWith('dept_')) && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleEditInstitution}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Redaktə
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleMoveInstitution}
                          className="flex-1"
                        >
                          <Move className="h-3 w-3 mr-1" />
                          Köçür
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {canModify && (
            <Card>
              <CardHeader>
                <CardTitle>Sürətli Əməliyyatlar</CardTitle>
                <CardDescription>Struktur dəyişiklikləri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Plus className="h-3 w-3 mr-2" />
                  Yeni müəssisə əlavə et
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <GitBranch className="h-3 w-3 mr-2" />
                  Struktur yenidən təşkil et
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Settings className="h-3 w-3 mr-2" />
                  Toplu dəyişikliklər
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detailed Statistics */}
      {statistics && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Ətraflı Statistika</h2>
          <HierarchyBreakdown 
            statistics={statistics} 
            loading={statsLoading}
          />
        </div>
      )}

      {/* Hierarchy Modal */}
      <HierarchyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        institution={selectedNode}
        availableParents={availableParents}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}