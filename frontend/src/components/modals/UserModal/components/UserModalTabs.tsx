/**
 * UserModalTabs Component
 * NEW: Role-based tab structure for user creation
 * Each role gets its dedicated tab with pre-configured fields
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, UserCog, Building, School } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RegionOperatorTab } from './RegionOperatorTab';
import { RegionAdminTab } from './RegionAdminTab';
import { SektorAdminTab } from './SektorAdminTab';
import { SchoolAdminTab } from './SchoolAdminTab';
import { ROLE_TAB_CONFIG, getVisibleRoleTabs } from '../utils/roleTabConfig';
import { DEFAULT_FORM_VALUES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import { transformFormDataToBackend } from '../utils/fieldTransformers';

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
}: UserModalTabsProps) {
  console.log('🎯 UserModalTabs RENDERED!', {
    open,
    currentUserRole,
    availableRolesCount: availableRoles?.length,
    availableRoles: availableRoles,
    availableInstitutionsCount: availableInstitutions?.length,
    availableDepartmentsCount: availableDepartments?.length
  });

  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>('regionoperator');
  const [formData, setFormData] = useState<any>(DEFAULT_FORM_VALUES);
  const [loading, setLoading] = useState(false);

  // Get visible tabs for current user
  const visibleTabs = getVisibleRoleTabs(currentUserRole);
  console.log('👀 Visible tabs:', visibleTabs);

  // Initialize form data
  useEffect(() => {
    if (open) {
      if (user) {
        // Edit mode - populate with user data
        setFormData({
          ...DEFAULT_FORM_VALUES,
          ...user,
          is_active: user.is_active ? 'true' : 'false',
        });
      } else {
        // Create mode - reset to defaults
        setFormData(DEFAULT_FORM_VALUES);
      }
    }
  }, [open, user]);

  // Set default tab on mount
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(selectedTab)) {
      setSelectedTab(visibleTabs[0]);
    }
  }, [visibleTabs, selectedTab]);

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
      };

      // Transform to backend format
      const userData = transformFormDataToBackend(
        finalData,
        undefined, // mode
        finalData.institution_id ? parseInt(finalData.institution_id) : null,
        () => false, // isTeacherRole
        () => false  // isStudentRole
      );

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
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4 gap-2">
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
            <RegionAdminTab
              formData={formData}
              setFormData={setFormData}
              availableInstitutions={availableInstitutions}
              loadingOptions={loadingOptions}
              user={user}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </TabsContent>

          {/* RegionOperator Tab */}
          <TabsContent value="regionoperator">
            <RegionOperatorTab
              formData={formData}
              setFormData={setFormData}
              availableInstitutions={availableInstitutions}
              availableDepartments={availableDepartments}
              loadingOptions={loadingOptions}
              user={user}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </TabsContent>

          {/* SektorAdmin Tab */}
          <TabsContent value="sektoradmin">
            <SektorAdminTab
              formData={formData}
              setFormData={setFormData}
              availableInstitutions={availableInstitutions}
              loadingOptions={loadingOptions}
              user={user}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </TabsContent>

          {/* SchoolAdmin Tab */}
          <TabsContent value="schooladmin">
            <SchoolAdminTab
              formData={formData}
              setFormData={setFormData}
              availableInstitutions={availableInstitutions}
              loadingOptions={loadingOptions}
              user={user}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
