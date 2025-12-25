/**
 * UserModalTabs Component
 * NEW: Role-based tab structure for user creation
 * Each role gets its dedicated tab with pre-configured fields
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, UserCog, Building, School, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RegionOperatorTab } from "./RegionOperatorTab";
import { RegionAdminTab } from "./RegionAdminTab";
import { SektorAdminTab } from "./SektorAdminTab";
import { SchoolAdminTab } from "./SchoolAdminTab";
import { TeacherTab } from "./TeacherTab";
import { ROLE_TAB_CONFIG, getVisibleRoleTabs } from "../utils/roleTabConfig";
import {
  DEFAULT_FORM_VALUES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  CRUD_PERMISSIONS,
} from "../utils/constants";
import {
  transformFormDataToBackend,
  transformBackendDataToForm,
} from "../utils/fieldTransformers";
import { PermissionAssignmentPanel } from "./PermissionAssignmentPanel";
import { PermissionMetadata } from "@/services/regionAdmin";
import { Info } from "lucide-react";
import { usePermissionDiff } from "@/hooks/usePermissionDiff";
import { PermissionDiffPreview } from "./PermissionDiffPreview";

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
  console.log(
    "🚨🚨🚨 [UserModalTabs] FILE UPDATED - NEW VERSION LOADED! 🚨🚨🚨"
  );
  console.log("🎯 UserModalTabs RENDERED!", {
    open,
    currentUserRole,
    availableRolesCount: availableRoles?.length,
    availableRoles: availableRoles,
    availableInstitutionsCount: availableInstitutions?.length,
    availableDepartmentsCount: availableDepartments?.length,
  });
  console.log("🔍 [UserModalTabs] Props at component top:", {
    open,
    user: !!user,
    userId: user?.id,
    loadingUser,
  });

  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>("regionoperator");
  const [formData, setFormData] = useState<any>(DEFAULT_FORM_VALUES);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [permissionSelection, setPermissionSelection] = useState<string[]>([]);
  const [showDiffPreview, setShowDiffPreview] = useState(false);
  const [diffResult, setDiffResult] = useState<any | null>(null);

  const {
    dryRunValidate,
    clientDiff,
    loading: diffLoading,
    error: diffError,
  } = usePermissionDiff();

  // Get visible tabs for current user
  const visibleTabs = getVisibleRoleTabs(currentUserRole);
  console.log("👀 Visible tabs:", visibleTabs);

  // DEBUG: Log dependencies BEFORE useEffect
  console.log("🔍 [UserModalTabs] BEFORE useEffect - Dependencies:", {
    open,
    loadingUser,
    user: !!user,
    userId: user?.id,
    userObject: user,
  });

  // Initialize form data
  useEffect(() => {
    console.log("✅✅✅ [UserModalTabs] useEffect TRIGGERED ✅✅✅", {
      open,
      loadingUser,
      hasUser: !!user,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });

    if (!open) {
      console.log("⚠️ [UserModalTabs] useEffect SKIPPED: modal not open", {
        open,
      });
      return;
    }
    if (loadingUser) {
      console.log("⚠️ [UserModalTabs] useEffect SKIPPED: loading user", {
        loadingUser,
      });
      return;
    }

    console.log(
      "🚀 [UserModalTabs] useEffect PASSED all checks, processing..."
    );

    if (user) {
      console.log("[UserModalTabs] Hydrating form with user:", user);
      console.log("[UserModalTabs] Incoming permissions snapshot:", {
        assignable_permissions: user?.assignable_permissions,
        region_operator_permissions: user?.region_operator_permissions,
      });
      console.log("[UserModalTabs] User profile snapshot:", user?.profile);
      console.log("[UserModalTabs] Name fields snapshot:", {
        topLevelFirstName: user?.first_name,
        topLevelLastName: user?.last_name,
        profileFirstName: user?.profile?.first_name,
        profileLastName: user?.profile?.last_name,
      });
      const transformed = transformBackendDataToForm(user);
      console.log("[UserModalTabs] Transformed values:", transformed);
      const hydratedForm = {
        ...DEFAULT_FORM_VALUES,
        ...transformed,
      };
      console.log("[UserModalTabs] Hydrated form values:", hydratedForm);
      setFormData(hydratedForm);

      // For RegionOperator, assignable_permissions already contains MERGED CRUD + modern permissions
      // Don't try to rebuild it from user object - trust the transformation!
      const permissionSelection = Array.isArray(
        hydratedForm.assignable_permissions
      )
        ? hydratedForm.assignable_permissions
        : [];

      console.log("[UserModalTabs] Permission selection after hydration:", {
        count: permissionSelection.length,
        permissions: permissionSelection,
      });
      setPermissionSelection(permissionSelection);
    } else {
      // New user flow: pre-select defaults for the currently selected role when metadata is available
      const roleCfg = ROLE_TAB_CONFIG[selectedTab];
      const targetRoleNameLocal = roleCfg?.targetRoleName ?? "";
      const roleKey = targetRoleNameLocal.toString().toLowerCase();

      const defaultsForRole = permissionRoleMatrix?.[roleKey]?.defaults ?? [];
      const assignableDefaults = Array.isArray(defaultsForRole)
        ? defaultsForRole
        : [];

      // Build available permission set for the current role from metadata
      const availableSet = new Set<string>(
        (effectivePermissionMetadata?.modules || [])
          .filter(
            (m) =>
              !m.roles ||
              m.roles.length === 0 ||
              m.roles.includes(targetRoleNameLocal)
          )
          .flatMap((m) => (m.permissions || []).map((p) => p.key))
      );

      const finalDefaults = assignableDefaults.filter((p) =>
        availableSet.has(p)
      );

      const initialForm = {
        ...DEFAULT_FORM_VALUES,
        assignable_permissions: finalDefaults,
      };

      setFormData(initialForm);
      setPermissionSelection(finalDefaults);
    }

    setFormKey((prev) => prev + 1);
  }, [open, user, loadingUser, permissionMetadata, selectedTab]);

  // Set default tab on mount
  useEffect(() => {
    console.log("[UserModalTabs] Checking visible tab sync", {
      visibleTabs,
      selectedTab,
    });
    if (visibleTabs.length > 0 && !visibleTabs.includes(selectedTab)) {
      console.log("[UserModalTabs] Adjusting selectedTab due to permissions", {
        visibleTabs,
        selectedTab,
      });
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

  // NOTE: permission metadata should be provided by parent via `permissionMetadata` prop
  // Modal does not perform its own network fetch anymore to avoid duplicate requests.

  useEffect(() => {
    if (!user && selectedTab !== "regionoperator") {
      setPermissionSelection([]);
    }
  }, [selectedTab, user]);

  const roleConfig = ROLE_TAB_CONFIG[selectedTab];
  const targetRoleName = roleConfig?.targetRoleName ?? "";
  const allowAssignablePermissions = Boolean(
    targetRoleName && targetRoleName !== "regionoperator"
  );

  const effectivePermissionMetadata = permissionMetadata ?? null;
  const effectivePermissionLoading = Boolean(permissionMetadataLoading);
  const featurePreviewEnabled =
    effectivePermissionMetadata?.features?.permission_preview ?? true;
  const permissionRoleMatrix = effectivePermissionMetadata?.role_matrix ?? {};

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
    if (!effectivePermissionMetadata || !allowAssignablePermissions) {
      return new Set<string>();
    }

    const modules = effectivePermissionMetadata.modules || [];
    const allowed = modules
      .filter(
        (module) =>
          !module.roles ||
          module.roles.length === 0 ||
          module.roles.includes(targetRoleName)
      )
      .flatMap((module) =>
        module.permissions.map((permission) => permission.key)
      );

    return new Set<string>(allowed);
  }, [effectivePermissionMetadata, allowAssignablePermissions, targetRoleName]);

  const filteredPermissionSelection = useMemo(() => {
    if (!allowAssignablePermissions || allowedPermissionKeys.size === 0) {
      return [];
    }
    return permissionSelection.filter((permission) =>
      allowedPermissionKeys.has(permission)
    );
  }, [permissionSelection, allowAssignablePermissions, allowedPermissionKeys]);

  // Handle form submission
  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Get selected role config
      const roleConfig = ROLE_TAB_CONFIG[selectedTab];
      if (!roleConfig) {
        throw new Error("Invalid role tab selected");
      }

      // Find role metadata from availableRoles
      const roleMetadata = availableRoles.find(
        (r) => r.name.toLowerCase() === roleConfig.targetRoleName.toLowerCase()
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
        assignable_permissions:
          roleMetadata.name === "regionoperator"
            ? data.assignable_permissions || []
            : allowAssignablePermissions
            ? filteredPermissionSelection
            : [],
      };

      console.log("🔍 [UserModalTabs] handleSubmit - Before transform:", {
        role_name: roleMetadata.name,
        is_regionoperator: roleMetadata.name === "regionoperator",
        data_assignable_permissions: data.assignable_permissions,
        formData_assignable_permissions: formData.assignable_permissions,
        finalData_assignable_permissions: finalData.assignable_permissions,
        assignable_count: Array.isArray(finalData.assignable_permissions)
          ? finalData.assignable_permissions.length
          : 0,
        FULL_DATA: data,
        FULL_FORM_DATA: formData,
        FULL_FINAL_DATA: finalData,
      });

      const isTeacherTab =
        roleConfig.targetRoleName.toLowerCase() === "müəllim";
      // Transform to backend format
      const userData = transformFormDataToBackend(
        finalData,
        isTeacherTab ? "teacher" : undefined,
        finalData.institution_id ? parseInt(finalData.institution_id) : null,
        () => isTeacherTab,
        () => false // student roles not yet supported
      );

      console.log("🔍 [UserModalTabs] handleSubmit - After transform:", {
        userData_role_name: userData.role_name,
        userData_assignable_permissions: userData.assignable_permissions,
        assignable_count: userData.assignable_permissions?.length || 0,
      });

      // ✅ UNIFIED PERMISSION VALIDATION - All roles use Spatie permissions
      if (roleMetadata.name === "regionoperator") {
        const assignablePermissions = userData.assignable_permissions || [];
        if (assignablePermissions.length === 0) {
          toast({
            title: "Səlahiyyət seçilməyib",
            description:
              "RegionOperator üçün ən azı bir səlahiyyət seçilməlidir.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log("📤 UserModalTabs sending data to backend:", {
        selectedTab,
        targetRole: roleConfig.targetRoleName,
        roleMetadata,
        finalData,
        userData,
      });

      await onSave(userData);

      toast({
        title: "Uğurlu",
        description: user
          ? SUCCESS_MESSAGES.USER_UPDATED
          : SUCCESS_MESSAGES.USER_CREATED,
      });
      onClose();
    } catch (error: any) {
      console.error("User creation/update error:", error);

      toast({
        title: "Xəta",
        description: error.message || ERROR_MESSAGES.OPERATION_FAILED,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Attempt submission with dry-run validation and preview
  const attemptSubmit = async () => {
    try {
      // Determine target role and role metadata
      const roleConfig = ROLE_TAB_CONFIG[selectedTab];
      if (!roleConfig) throw new Error("Invalid role tab selected");

      const roleMetadata = availableRoles.find(
        (r) => r.name.toLowerCase() === roleConfig.targetRoleName.toLowerCase()
      );

      const isRegionOperator = roleMetadata?.name === "regionoperator";

      const proposed = isRegionOperator
        ? formData.assignable_permissions || []
        : filteredPermissionSelection;

      const userId = user?.id ?? null;
      const roleName = roleConfig.targetRoleName ?? null;

      // Call server dry-run validation
      // If preview/dry-run feature is disabled via backend feature flags, skip dry-run
      if (!featurePreviewEnabled) {
        await handleSubmit(formData);
        return;
      }

      const result = await dryRunValidate({ userId, roleName, proposed });
      if (!result) {
        toast({
          title: "Xəta",
          description: diffError || "Yoxlama zamanı server xətası",
          variant: "destructive",
        });
        return;
      }

      const hasChanges =
        (result.added?.length ?? 0) > 0 || (result.removed?.length ?? 0) > 0;
      const hasIssues =
        (result.missing_required?.length ?? 0) > 0 ||
        Object.keys(result.missing_dependencies || {}).length > 0 ||
        (result.not_allowed?.length ?? 0) > 0 ||
        (result.admin_missing_permissions?.length ?? 0) > 0;

      if (hasChanges || hasIssues) {
        // Only show preview if feature is enabled (double-check)
        if (featurePreviewEnabled) {
          setDiffResult(result);
          setShowDiffPreview(true);
          return;
        }
        // If feature disabled, proceed directly
        await handleSubmit(formData);
        return;
      }

      // No issues — proceed to actual submit
      await handleSubmit(formData);
    } catch (err: any) {
      console.error("Attempt submit error:", err);
      toast({
        title: "Xəta",
        description: err?.message || "Əməliyyat uğursuz oldu",
        variant: "destructive",
      });
    }
  };

  const onConfirmPreview = async () => {
    setShowDiffPreview(false);
    await handleSubmit(formData);
  };

  const onCancelPreview = () => {
    setShowDiffPreview(false);
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

  const getRoleInfo = (roleName: string) => {
    if (!roleName) {
      return null;
    }
    const key = roleName.toLowerCase();
    return permissionRoleMatrix?.[key] ?? null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user
              ? "İstifadəçi məlumatlarını redaktə et"
              : "Yeni İstifadəçi Yarat"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? "Mövcud istifadəçinin məlumatlarını dəyişdirin və yadda saxlayın."
              : "Rol seçib yeni istifadəçi yaradın. Hər rol öz tab-ında müəyyən form sahələri ilə təmin edilir."}
          </DialogDescription>
          <p className="text-xs text-muted-foreground mt-2">
            Səlahiyyətlərə dəyişiklik etmək üçün aşağıdakı paneldən istifadə
            edin. Dəqiq bələdçi üçün paneldəki “Tez bələdçi” linkinə keçin.
          </p>
          {!featurePreviewEnabled && (
            <div className="mt-4">
              <Alert>
                <AlertDescription>
                  "Tezliklə preview/xüsusi yoxlama deaktivdir — bu,
                  dəyişiklikləri birbaşa yadda saxlayacaq. Əgər təhlükəsizlik və
                  müştəri təsdiqi tələb olunursa, `FEATURE_PERMISSION_PREVIEW`-i
                  aktiv edin."
                </AlertDescription>
              </Alert>
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
              {visibleTabs.map((tabKey) => {
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
                {selectedTab === "regionadmin" && (
                  <PermissionAssignmentPanel
                    metadata={effectivePermissionMetadata}
                    userPermissions={user?.permissions ?? null}
                    roleName={ROLE_TAB_CONFIG.regionadmin.targetRoleName}
                    value={filteredPermissionSelection}
                    onChange={setPermissionSelection}
                    loading={effectivePermissionLoading}
                    roleInfo={getRoleInfo(
                      ROLE_TAB_CONFIG.regionadmin.targetRoleName
                    )}
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
                {selectedTab === "teacher" && (
                  <PermissionAssignmentPanel
                    metadata={effectivePermissionMetadata}
                    userPermissions={user?.permissions ?? null}
                    roleName={ROLE_TAB_CONFIG.teacher.targetRoleName}
                    value={filteredPermissionSelection}
                    onChange={setPermissionSelection}
                    loading={effectivePermissionLoading}
                    roleInfo={getRoleInfo(
                      ROLE_TAB_CONFIG.teacher.targetRoleName
                    )}
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
                {selectedTab === "sektoradmin" && (
                  <PermissionAssignmentPanel
                    metadata={effectivePermissionMetadata}
                    userPermissions={user?.permissions ?? null}
                    roleName={ROLE_TAB_CONFIG.sektoradmin.targetRoleName}
                    value={filteredPermissionSelection}
                    onChange={setPermissionSelection}
                    loading={effectivePermissionLoading}
                    roleInfo={getRoleInfo(
                      ROLE_TAB_CONFIG.sektoradmin.targetRoleName
                    )}
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
                {selectedTab === "schooladmin" && (
                  <PermissionAssignmentPanel
                    metadata={effectivePermissionMetadata}
                    userPermissions={user?.permissions ?? null}
                    roleName={ROLE_TAB_CONFIG.schooladmin.targetRoleName}
                    value={filteredPermissionSelection}
                    onChange={setPermissionSelection}
                    loading={effectivePermissionLoading}
                    roleInfo={getRoleInfo(
                      ROLE_TAB_CONFIG.schooladmin.targetRoleName
                    )}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            type="button"
            onClick={() => attemptSubmit()}
            disabled={
              loading ||
              loadingOptions ||
              effectivePermissionLoading ||
              (selectedTab === "regionoperator" &&
                !regionOperatorPermissionsSelected)
            }
            className="min-w-[200px]"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {user ? "Yenilənir..." : "Yaradılır..."}
              </>
            ) : user ? (
              "Yenilə"
            ) : (
              "İstifadəçi Yarat"
            )}
          </Button>
        </div>
        <Dialog open={showDiffPreview} onOpenChange={setShowDiffPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dəyişiklik önizləməsi</DialogTitle>
              <DialogDescription className="text-xs">
                Yadda saxlamazdan əvvəl əlavə və çıxarılan icazələri yoxlayın.
              </DialogDescription>
            </DialogHeader>

            {diffResult && (
              <PermissionDiffPreview
                added={diffResult.added || []}
                removed={diffResult.removed || []}
                missing_dependencies={diffResult.missing_dependencies || {}}
                missing_required={diffResult.missing_required || []}
                not_allowed={diffResult.not_allowed || []}
                admin_missing_permissions={
                  diffResult.admin_missing_permissions || []
                }
                onConfirm={onConfirmPreview}
                onCancel={onCancelPreview}
              />
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
