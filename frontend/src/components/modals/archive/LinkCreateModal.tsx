import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Users, Settings, AlertCircle, ChevronRight } from 'lucide-react';
import { useLinkCreate } from '@/components/links/hooks/useLinkCreate';
import { LinkTargetSelection } from '@/components/links/LinkTargetSelection';
import { LinkSharingSettings } from '@/components/links/LinkSharingSettings';

interface LinkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkCreated?: () => void;
}

export const LinkCreateModal: React.FC<LinkCreateModalProps> = ({
  isOpen,
  onClose,
  onLinkCreated
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  const {
    // State
    creating,
    institutionSearch,
    departmentSearch,
    institutionTypeFilter,
    selectedInstitutionForDepartments,

    // Data
    sharingOptions,
    filteredInstitutions,
    filteredDepartments,
    availableInstitutionTypes,
    institutionsLoading,
    departmentsLoading,

    // Form
    form,

    // Actions
    setInstitutionSearch,
    setDepartmentSearch,
    setInstitutionTypeFilter,
    setSelectedInstitutionForDepartments,
    handleSelectAllInstitutions,
    handleDeselectAllInstitutions,
    handleSelectAllDepartments,
    handleDeselectAllDepartments,
    handleSelectAllRoles,
    handleDeselectAllRoles,
    onSubmit,
    handleClose,
    validateURL
  } = useLinkCreate({ onLinkCreated, onClose });

  // Get tab status for navigation
  const getTabStatus = (tab: string) => {
    if (tab === 'basic') {
      const title = form.watch('title');
      const url = form.watch('url');
      return title && url && validateURL(url) ? 'completed' : 'incomplete';
    }

    if (tab === 'targeting') {
      const shareScope = form.watch('share_scope');
      if (shareScope === 'public') return 'optional';

      const institutions = form.watch('target_institutions');
      const roles = form.watch('target_roles');
      const departments = form.watch('target_departments');

      return (institutions.length > 0 || roles.length > 0 || departments.length > 0) ? 'completed' : 'incomplete';
    }

    return 'optional';
  };

  const canProceedToNextTab = (currentTab: string) => {
    if (currentTab === 'basic') {
      return getTabStatus('basic') === 'completed';
    }
    return true;
  };

  const getTabBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-800">✓</Badge>;
      case 'incomplete':
        return <Badge variant="destructive" className="ml-1 text-xs">!</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Yeni Link Yarat
          </DialogTitle>
          <DialogDescription>
            Faydalı bir link əlavə edərək müəssisələrlə paylaşın.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Əsas Məlumat
                  {getTabBadge(getTabStatus('basic'))}
                </TabsTrigger>
                <TabsTrigger
                  value="targeting"
                  className="flex items-center gap-2"
                  disabled={!canProceedToNextTab('basic')}
                >
                  <Users className="h-4 w-4" />
                  Hədəf Seçimi
                  {getTabBadge(getTabStatus('targeting'))}
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Tənzimləmələr
                </TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Başlıq <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Məsələn, Təhsil Nazirliyinin rəsmi saytı"
                            {...field}
                            disabled={creating}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          URL <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com"
                            {...field}
                            disabled={creating}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qısa Təsvir</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Link haqqında qısa məlumat..."
                            {...field}
                            disabled={creating}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="link_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link Növü</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={creating}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Növünü seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="external">Xarici Link</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="form">Forma</SelectItem>
                              <SelectItem value="document">Sənəd</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="share_scope"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paylaşım Əhatəsi</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={creating}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Paylaşım əhatəsini seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="public">Hamı üçün</SelectItem>
                              <SelectItem value="regional">Regional</SelectItem>
                              <SelectItem value="sectoral">Sektor</SelectItem>
                              <SelectItem value="institutional">Təşkilat</SelectItem>
                              <SelectItem value="specific_users">Xüsusi İstifadəçilər</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Xüsusi Link</FormLabel>
                          <DialogDescription>
                            Bu linki xüsusi (seçilmiş) kimi qeyd et.
                          </DialogDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={creating}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('targeting')}
                    disabled={!canProceedToNextTab('basic') || creating}
                    className="flex items-center gap-2"
                  >
                    Növbəti: Hədəf Seçimi
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Target Selection Tab */}
              <TabsContent value="targeting" className="space-y-4 mt-4">
                {form.watch('share_scope') === 'public' ? (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Hamı üçün əlçatan</h3>
                    <p className="text-muted-foreground">
                      Bu link hamı tərəfindən görülə bilər. Xüsusi hədəf seçimi tələb olunmur.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4" />
                      Paylaşım əhatəsi "{form.watch('share_scope')}" seçilmişdir. Kimlərin görə biləcəyini dəqiq müəyyən edin.
                    </div>

                    <LinkTargetSelection
                      form={form}
                      creating={creating}
                      filteredInstitutions={filteredInstitutions}
                      filteredDepartments={filteredDepartments}
                      availableInstitutionTypes={availableInstitutionTypes}
                      sharingOptions={sharingOptions}
                      institutionsLoading={institutionsLoading}
                      departmentsLoading={departmentsLoading}
                      institutionSearch={institutionSearch}
                      departmentSearch={departmentSearch}
                      institutionTypeFilter={institutionTypeFilter}
                      selectedInstitutionForDepartments={selectedInstitutionForDepartments}
                      setInstitutionSearch={setInstitutionSearch}
                      setDepartmentSearch={setDepartmentSearch}
                      setInstitutionTypeFilter={setInstitutionTypeFilter}
                      setSelectedInstitutionForDepartments={setSelectedInstitutionForDepartments}
                      handleSelectAllInstitutions={handleSelectAllInstitutions}
                      handleDeselectAllInstitutions={handleDeselectAllInstitutions}
                      handleSelectAllDepartments={handleSelectAllDepartments}
                      handleDeselectAllDepartments={handleDeselectAllDepartments}
                      handleSelectAllRoles={handleSelectAllRoles}
                      handleDeselectAllRoles={handleDeselectAllRoles}
                    />
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('basic')}
                    disabled={creating}
                  >
                    Geri
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    disabled={creating}
                    className="flex items-center gap-2"
                  >
                    Növbəti: Tənzimləmələr
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4 mt-4">
                <LinkSharingSettings form={form} creating={creating} />

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('targeting')}
                    disabled={creating}
                  >
                    Geri
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <DialogFooter className="mt-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={creating}>
                Ləğv et
              </Button>
              <Button type="submit" disabled={creating || !canProceedToNextTab('basic')}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link Yarat
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};