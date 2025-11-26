/**
 * UserModalTabs Component
 * NEW: Role-based tab structure for user creation
 * Each role gets its dedicated tab with pre-configured fields
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, UserCog, Building, School, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { RegionOperatorTab } from './RegionOperatorTab';
import { RegionAdminTab } from './RegionAdminTab';
import { SektorAdminTab } from './SektorAdminTab';
import { SchoolAdminTab } from './SchoolAdminTab';
import { TeacherTab } from './TeacherTab';
import { ROLE_TAB_CONFIG, getVisibleRoleTabs } from '../utils/roleTabConfig';
import { DEFAULT_FORM_VALUES, SUCCESS_MESSAGES, ERROR_MESSAGES, CRUD_PERMISSIONS } from '../utils/constants';
import { transformFormDataToBackend, transformBackendDataToForm } from '../utils/fieldTransformers';
import { PermissionAssignmentPanel } from './PermissionAssignmentPanel';
import { regionAdminService, PermissionMetadata } from '@/services/regionAdmin';

interface UserModalTabsProps {
  open: boolean;
  onClose: () => void;
  user?: any | null;
  onSave: (user: any) => Promise<void>;
  currentUserRole: string; // Logged-in user's role
  availableInstitutions: any[];
  availableDepartments: any[];
  availableRoles: any[];
  loadingOptions: boolean;
  permissionMetadata?: PermissionMetadata | null;
  permissionMetadataLoading?: boolean;
  currentUserPermissions: string[];
  loadingUser?: boolean;
}

export function UserModalTabs({
  open,
  onClose,
  user = null,
  onSave,
  currentUserRole,
  availableInstitutions,
  availableDepartments,
  availableRoles,
  loadingOptions,
  permissionMetadata,
  permissionMetadataLoading = false,
  currentUserPermissions,
  loadingUser = false,
}: UserModalTabsProps) {
  console.log('🚨🚨🚨 [UserModalTabs] FILE UPDATED - NEW VERSION LOADED! 🚨🚨🚨');
  console.log('🎯 UserModalTabs RENDERED!', {
    open,
    currentUserRole,
    availableRolesCount: availableRoles?.length,
    availableRoles: availableRoles,
    availableInstitutionsCount: availableInstitutions?.length,
    availableDepartmentsCount: availableDepartments?.length
  });
  console.log('🔍 [UserModalTabs] Props at component top:', {
    open,
    user: !!user,
    userId: user?.id,
    loadingUser,
  });

  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>('regionoperator');
  const [formData, setFormData] = useState<any>(DEFAULT_FORM_VALUES);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [permissionSelection, setPermissionSelection] = useState<string[]>([]);
  const [localPermissionMetadata, setLocalPermissionMetadata] = useState<PermissionMetadata | null>(null);
  const [localPermissionLoading, setLocalPermissionLoading] = useState(false);

  // Get visible tabs for current user
  const visibleTabs = getVisibleRoleTabs(currentUserRole);
  console.log('👀 Visible tabs:', visibleTabs);

  // DEBUG: Log dependencies BEFORE useEffect
  console.log('🔍 [UserModalTabs] BEFORE useEffect - Dependencies:', {
    open,
    loadingUser,
    user: !!user,
    userId: user?.id,
    userObject: user,
  });

  // Initialize form data
  useEffect(() => {
    console.log('✅✅✅ [UserModalTabs] useEffect TRIGGERED ✅✅✅', {
      open,
      loadingUser,
      hasUser: !!user,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });

    if (!open) {
      console.log('⚠️ [UserModalTabs] useEffect SKIPPED: modal not open', {open});
      return;
    }
    if (loadingUser) {
      console.log('⚠️ [UserModalTabs] useEffect SKIPPED: loading user', {loadingUser});
      return;
    }

    console.log('🚀 [UserModalTabs] useEffect PASSED all checks, processing...');

    if (user) {
      console.log('[UserModalTabs] Hydrating form with user:', user);
      console.log('[UserModalTabs] Incoming permissions snapshot:', {
        assignable_permissions: user?.assignable_permissions,
        region_operator_permissions: user?.region_operator_permissions,
      });
      console.log('[UserModalTabs] User profile snapshot:', user?.profile);
      console.log('[UserModalTabs] Name fields snapshot:', {
        topLevelFirstName: user?.first_name,
        topLevelLastName: user?.last_name,
        profileFirstName: user?.profile?.first_name,
        profileLastName: user?.profile?.last_name,
      });
      const transformed = transformBackendDataToForm(user);
      console.log('[UserModalTabs] Transformed values:', transformed);
      const hydratedForm = {
        ...DEFAULT_FORM_VALUES,
        ...transformed,
      };
      console.log('[UserModalTabs] Hydrated form values:', hydratedForm);
      setFormData(hydratedForm);

      // For RegionOperator, assignable_permissions already contains MERGED CRUD + modern permissions
      // Don't try to rebuild it from user object - trust the transformation!
      const permissionSelection = Array.isArray(hydratedForm.assignable_permissions)
        ? hydratedForm.assignable_permissions
        : [];

      console.log('[UserModalTabs] Permission selection after hydration:', {
        count: permissionSelection.length,
        permissions: permissionSelection,
      });
      setPermissionSelection(permissionSelection);
    } else {
      setFormData(DEFAULT_FORM_VALUES);
      setPermissionSelection([]);
    }

    setFormKey((prev) => prev + 1);
  }, [open, user, loadingUser]);

  // Set default tab on mount
  useEffect(() => {
    console.log('[UserModalTabs] Checking visible tab sync', { visibleTabs, selectedTab });
    if (visibleTabs.length > 0 && !visibleTabs.includes(selectedTab)) {
      console.log('[UserModalTabs] Adjusting selectedTab due to permissions', { visibleTabs, selectedTab });
      setSelectedTab(visibleTabs[0]);
    }
  }, [visibleTabs, selectedTab]);

  useEffect(() => {
    if (!user) return;
    const userRoleName =
      user.role_name ||
      user.role ||
      user.roles?.[0]?.name ||
      user.roles?.[0]?.display_name;
    if (!userRoleName) return;

    const normalized = userRoleName.toString().toLowerCase();
    const matchingTabEntry = Object.entries(ROLE_TAB_CONFIG).find(
      ([key, config]) =>
        key.toLowerCase() === normalized ||
        config.targetRoleName.toLowerCase() === normalized
    );

    if (matchingTabEntry && visibleTabs.includes(matchingTabEntry[0])) {
      setSelectedTab(matchingTabEntry[0]);
    }
  }, [user, visibleTabs]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (permissionMetadata || localPermissionMetadata || localPermissionLoading) {
      return;
    }

    setLocalPermissionLoading(true);
    regionAdminService
      .getPermissionMetadata()
      .then((metadata) => {
        console.log('[PermissionMeta][Modal] Loaded via fallback', {
          modules: metadata?.modules?.length,
          templates: metadata?.templates?.length,
        });
        setLocalPermissionMetadata(metadata);
      })
      .catch((error) => {
        console.error('[PermissionMeta][Modal] Failed to load', error);
      })
      .finally(() => {
        setLocalPermissionLoading(false);
      });
  }, [open, permissionMetadata, localPermissionMetadata, localPermissionLoading]);

  useEffect(() => {
    if (!user && selectedTab !== 'regionoperator') {
      setPermissionSelection([]);
    }
  }, [selectedTab, user]);

  const roleConfig = ROLE_TAB_CONFIG[selectedTab];
  const targetRoleName = roleConfig?.targetRoleName ?? '';
  const allowAssignablePermissions = Boolean(targetRoleName && targetRoleName !== 'regionoperator');

  const effectivePermissionMetadata = permissionMetadata ?? localPermissionMetadata ?? null;
  const effectivePermissionLoading = Boolean(permissionMetadataLoading || localPermissionLoading);

  const regionOperatorPermissionsSelected = useMemo(() => {
    const assignable = Array.isArray(formData.assignable_permissions)
      ? formData.assignable_permissions
      : [];

    const legacy = Object.values(CRUD_PERMISSIONS).some((module) =>
      module.actions.some((action) => formData[action.key] === true)
    );

    return assignable.length > 0 || legacy;
  }, [formData]);

  const allowedPermissionKeys = useMemo(() => {
    if (!permissionMetadata || !allowAssignablePermissions) {
      return new Set<string>();
    }

    const modules = permissionMetadata.modules || [];
    const allowed = modules
      .filter(
        (module) =>
          !module.roles ||
          module.roles.length === 0 ||
          module.roles.includes(targetRoleName)
      )
      .flatMap((module) => module.permissions.map((permission) => permission.key));

    return new Set<string>(allowed);
  }, [permissionMetadata, allowAssignablePermissions, targetRoleName]);

  const filteredPermissionSelection = useMemo(() => {
    if (!allowAssignablePermissions || allowedPermissionKeys.size === 0) {
      return [];
    }
    return permissionSelection.filter((permission) => allowedPermissionKeys.has(permission));
  }, [permissionSelection, allowAssignablePermissions, allowedPermissionKeys]);

  // Handle form submission
  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Get selected role config
      const roleConfig = ROLE_TAB_CONFIG[selectedTab];
      if (!roleConfig) {
        throw new Error('Invalid role tab selected');
      }

      // Find role metadata from availableRoles
      const roleMetadata = availableRoles.find(
        r => r.name.toLowerCase() === roleConfig.targetRoleName.toLowerCase()
      );

      if (!roleMetadata) {
        throw new Error(`Role "${roleConfig.targetRoleName}" not found`);
      }

      // Merge form data with role metadata
      const finalData = {
        ...data,
        role_id: roleMetadata.id.toString(),
        role_name: roleMetadata.name,
        role_display_name: roleMetadata.display_name || roleMetadata.name,
        // For RegionOperator, get permissions from formData.assignable_permissions
        // For other roles, use filteredPermissionSelection
        assignable_permissions: roleMetadata.name === 'regionoperator'
          ? (data.assignable_permissions || [])
          : (allowAssignablePermissions ? filteredPermissionSelection : []),
      };

      console.log('🔍 [UserModalTabs] handleSubmit - Before transform:', {
        role_name: roleMetadata.name,
        is_regionoperator: roleMetadata.name === 'regionoperator',
        data_assignable_permissions: data.assignable_permissions,
        finalData_assignable_permissions: finalData.assignable_permissions,
        assignable_count: Array.isArray(finalData.assignable_permissions) ? finalData.assignable_permissions.length : 0,
      });

      const isTeacherTab = roleConfig.targetRoleName.toLowerCase() === 'müəllim';
      // Transform to backend format
      const userData = transformFormDataToBackend(
        finalData,
        isTeacherTab ? 'teacher' : undefined,
        finalData.institution_id ? parseInt(finalData.institution_id) : null,
        () => isTeacherTab,
        () => false  // student roles not yet supported
      );

      console.log('🔍 [UserModalTabs] handleSubmit - After transform:', {
        userData_role_name: userData.role_name,
        userData_region_operator_permissions: userData.region_operator_permissions,
        region_perms_count: userData.region_operator_permissions ? Object.keys(userData.region_operator_permissions).length : 0,
        userData_assignable_permissions: userData.assignable_permissions,
      });

      if (roleMetadata.name === 'regionoperator') {
        const regionPerms = userData.region_operator_permissions || {};
        const enabledRegionPermCount = Object.values(regionPerms).filter(Boolean).length;
        if (enabledRegionPermCount === 0) {
          toast({
            title: 'Səlahiyyət seçilməyib',
            description: 'RegionOperator üçün ən azı bir əsas səlahiyyət (Sorğular, Tapşırıqlar, Sənədlər və s.) seçilməlidir.',
            variant: 'destructive',
          });
          return;
        }
      }

      console.log('📤 UserModalTabs sending data to backend:', {
        selectedTab,
        targetRole: roleConfig.targetRoleName,
        roleMetadata,
        finalData,
        userData,
      });

      await onSave(userData);

      toast({
        title: 'Uğurlu',
        description: user ? SUCCESS_MESSAGES.USER_UPDATED : SUCCESS_MESSAGES.USER_CREATED,
      });
      onClose();
    } catch (error: any) {
      console.error('User creation/update error:', error);

      toast({
        title: 'Xəta',
        description: error.message || ERROR_MESSAGES.OPERATION_FAILED,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Icon mapping
  const iconMap: Record<string, React.ReactNode> = {
    Shield: <Shield className="h-4 w-4" />,
    UserCog: <UserCog className="h-4 w-4" />,
    Building: <Building className="h-4 w-4" />,
    School: <School className="h-4 w-4" />,
    GraduationCap: <GraduationCap className="h-4 w-4" />,
  };

    if (visibleTabs.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Səlahiyyət Xətası</DialogTitle>
            <DialogDescription>
              İstifadəçi yaratmaq üçün səlahiyyətiniz yoxdur.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'İstifadəçi məlumatlarını redaktə et' : 'Yeni İstifadəçi Yarat'}
          </DialogTitle>
          <DialogDescription>
            {user
              ? 'Mövcud istifadəçinin məlumatlarını dəyişdirin və yadda saxlayın.'
              : 'Rol seçib yeni istifadəçi yaradın. Hər rol öz tab-ında müəyyən form sahələri ilə təmin edilir.'
            }
          </DialogDescription>
          {currentUserPermissions?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3">
              {currentUserPermissions.slice(0, 6).map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
              {currentUserPermissions.length > 6 && (
                <Badge variant="outline">+{currentUserPermissions.length - 6}</Badge>
              )}
            </div>
          )}
        </DialogHeader>

        {loadingUser ? (
          <div className="py-12 text-center text-muted-foreground">
            İstifadəçi məlumatları yüklənir...
          </div>
        ) : (
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-5">
            {visibleTabs.map(tabKey => {
              const config = ROLE_TAB_CONFIG[tabKey];
              return (
                <TabsTrigger
                  key={tabKey}
                  value={tabKey}
                  className="flex items-center gap-2"
                >
                  {iconMap[config.icon]}
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* RegionAdmin Tab */}
          <TabsContent value="regionadmin">
            <div className="space-y-6">
              <RegionAdminTab
                formKey={formKey}
                formData={formData}
                setFormData={setFormData}
                availableInstitutions={availableInstitutions}
                loadingOptions={loadingOptions}
                user={user}
                onSubmit={handleSubmit}
                loading={loading}
              />
              {selectedTab === 'regionadmin' && (
                <PermissionAssignmentPanel
                  metadata={effectivePermissionMetadata}
                  roleName={ROLE_TAB_CONFIG.regionadmin.targetRoleName}
                  value={filteredPermissionSelection}
                  onChange={setPermissionSelection}
                  loading={effectivePermissionLoading}
                />
              )}
            </div>
          </TabsContent>

          {/* RegionOperator Tab */}
          <TabsContent value="regionoperator">
          <RegionOperatorTab
            formKey={formKey}
            formData={formData}
            setFormData={setFormData}
              availableInstitutions={availableInstitutions}
              availableDepartments={availableDepartments}
              loadingOptions={loadingOptions}
              user={user}
              onSubmit={handleSubmit}
              loading={loading}
              permissionMetadata={effectivePermissionMetadata}
              permissionMetadataLoading={effectivePermissionLoading}
            />
          </TabsContent>

          {/* Teacher Tab */}
          <TabsContent value="teacher">
            <div className="space-y-6">
              <TeacherTab
                formKey={formKey}
                formData={formData}
                setFormData={setFormData}
                availableInstitutions={availableInstitutions}
                loadingOptions={loadingOptions}
                user={user}
                onSubmit={handleSubmit}
                loading={loading}
              />
              {selectedTab === 'teacher' && (
                <PermissionAssignmentPanel
                  metadata={effectivePermissionMetadata}
                  roleName={ROLE_TAB_CONFIG.teacher.targetRoleName}
                  value={filteredPermissionSelection}
                  onChange={setPermissionSelection}
                  loading={effectivePermissionLoading}
                />
              )}
            </div>
          </TabsContent>

          {/* SektorAdmin Tab */}
          <TabsContent value="sektoradmin">
            <div className="space-y-6">
              <SektorAdminTab
                formKey={formKey}
                formData={formData}
                setFormData={setFormData}
                availableInstitutions={availableInstitutions}
                loadingOptions={loadingOptions}
                user={user}
                onSubmit={handleSubmit}
                loading={loading}
              />
              {selectedTab === 'sektoradmin' && (
                <PermissionAssignmentPanel
                  metadata={effectivePermissionMetadata}
                  roleName={ROLE_TAB_CONFIG.sektoradmin.targetRoleName}
                  value={filteredPermissionSelection}
                  onChange={setPermissionSelection}
                  loading={effectivePermissionLoading}
                />
              )}
            </div>
          </TabsContent>

          {/* SchoolAdmin Tab */}
          <TabsContent value="schooladmin">
            <div className="space-y-6">
              <SchoolAdminTab
                formKey={formKey}
                formData={formData}
                setFormData={setFormData}
                availableInstitutions={availableInstitutions}
                loadingOptions={loadingOptions}
                user={user}
                onSubmit={handleSubmit}
                loading={loading}
              />
              {selectedTab === 'schooladmin' && (
                <PermissionAssignmentPanel
                  metadata={effectivePermissionMetadata}
                  roleName={ROLE_TAB_CONFIG.schooladmin.targetRoleName}
                  value={filteredPermissionSelection}
                  onChange={setPermissionSelection}
                  loading={effectivePermissionLoading}
                />
              )}
            </div>
          </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            type="button"
            onClick={() => handleSubmit(formData)}
            disabled={
              loading ||
              loadingOptions ||
              effectivePermissionLoading ||
              (selectedTab === 'regionoperator' && !regionOperatorPermissionsSelected)
            }
            className="min-w-[200px]"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {user ? 'Yenilənir...' : 'Yaradılır...'}
              </>
            ) : (
              user ? 'Yenilə' : 'İstifadəçi Yarat'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
