import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FormBuilder, FormField } from '@/components/forms/FormBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { accessibilityChecker } from '@/utils/accessibility-checker';
import { BaseModalTabsContext } from './BaseModal.context';
import { TabProgressIndicator } from './TabProgressIndicator';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export interface BaseModalTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  fields: FormField[];
  description?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

export interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  loading?: boolean;
  loadingText?: string;
  entityBadge?: string;
  entity?: any;
  
  // Form configuration
  fields?: FormField[];
  tabs?: BaseModalTab[];
  defaultValues?: Record<string, any>;
  columns?: 1 | 2 | 3;
  
  // Handlers
  onSubmit: (data: any) => Promise<void>;
  submitLabel?: string;
  
  // Options
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  closeOnSubmit?: boolean;
  onFormInstance?: (form: UseFormReturn<any>) => void;
  onValuesChange?: (values: Record<string, any>) => void;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

export const BaseModal: React.FC<BaseModalProps> = ({
  open,
  onClose,
  title,
  description,
  loading = false,
  loadingText,
  entityBadge,
  entity,
  fields = [],
  tabs = [],
  defaultValues = {},
  columns = 2,
  onSubmit,
  submitLabel,
  maxWidth = '4xl',
  closeOnSubmit = true,
  onFormInstance,
  onValuesChange,
}) => {
  const [activeTab, setActiveTab] = React.useState<string>(
    tabs.length > 0 ? tabs[0].id : 'default'
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Create unified schema from all fields (tabs + single form)
  const allFields = React.useMemo(() => {
    if (tabs.length > 0) {
      return tabs.flatMap(tab => tab.fields);
    }
    return fields;
  }, [tabs, fields]);

  // Build unified schema for all form fields
  const schema = React.useMemo(() => {
    return z.object(
      allFields.reduce((acc, field) => {
        let fieldSchema = field.validation;

        if (!fieldSchema) {
          switch (field.type) {
            case 'email':
              fieldSchema = z.string().email('Düzgün email daxil edin');
              break;
            case 'number':
              fieldSchema = z.number().or(z.string().regex(/^\d+$/, 'Düzgün nömrə daxil edin').transform(Number));
              break;
            case 'password':
              fieldSchema = z.string().min(6, 'Parol ən azı 6 simvol olmalıdır');
              break;
            case 'checkbox':
            case 'switch':
              fieldSchema = z.boolean();
              break;
            case 'date':
              fieldSchema = z.string().optional();
              break;
            case 'multiselect':
              fieldSchema = z.array(z.string());
              break;
            case 'custom':
              fieldSchema = z.any().optional();
              break;
            default:
              fieldSchema = z.string();
          }
        }

        if (!field.required) {
          if (fieldSchema && typeof fieldSchema.optional === 'function') {
            fieldSchema = fieldSchema.optional();
          } else {
            fieldSchema = z.optional(fieldSchema);
          }
        }

        acc[field.name] = fieldSchema;
        return acc;
      }, {} as Record<string, z.ZodType<any>>)
    );
  }, [allFields]);

  // Create unified form instance for all tabs
  const sharedForm = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  React.useEffect(() => {
    onFormInstance?.(sharedForm);
  }, [onFormInstance, sharedForm]);

  React.useEffect(() => {
    if (!open) {
      sharedForm.reset(defaultValues);
      return;
    }

    sharedForm.reset(defaultValues);
  }, [defaultValues, open, sharedForm]);

  React.useEffect(() => {
    if (!onValuesChange || !open) return;
    const subscription = sharedForm.watch((values) => {
      onValuesChange(values as Record<string, any>);
    });
    return () => subscription.unsubscribe();
  }, [onValuesChange, open, sharedForm]);

  // Reset tab when modal opens
  React.useEffect(() => {
    if (open && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [open, tabs]);
  
  // Monitor modal accessibility state
  React.useEffect(() => {
    if (open && typeof window !== 'undefined' && (window as any).checkAccessibility) {
      // Check accessibility after modal and tabs are fully initialized
      const timeoutId = setTimeout(() => {
        try {
          (window as any).checkAccessibility();
        } catch (error) {
          console.warn('Accessibility check failed:', error);
        }
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [open, activeTab]);

  const handleSubmit = React.useCallback(async (data: any) => {
    setIsSubmitting(true);
    try {
      logger.debug('BaseModal submitting data', {
        component: 'BaseModal',
        action: 'submit',
        data: { ...data, entity: entity?.id }
      });
      
      await onSubmit(data);
      
      if (closeOnSubmit) {
        onClose();
      }
    } catch (error) {
      logger.error('BaseModal submit failed', error, {
        component: 'BaseModal',
        action: 'submit'
      });
      throw error; // Re-throw to let FormBuilder handle the error display
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, onClose, closeOnSubmit, entity]);

  const getMaxWidthClass = () => {
    const widthClasses = {
      sm: 'sm:max-w-sm',
      md: 'sm:max-w-md',
      lg: 'sm:max-w-lg',
      xl: 'sm:max-w-xl',
      '2xl': 'sm:max-w-2xl',
      '3xl': 'sm:max-w-3xl',
      '4xl': 'max-w-4xl',
    };
    return widthClasses[maxWidth];
  };

  // Get error count for a specific tab
  const getTabErrorCount = React.useCallback((tab: BaseModalTab) => {
    if (!sharedForm?.formState?.errors) return 0;

    const tabFieldNames = tab.fields.map(f => f.name);
    const errorKeys = Object.keys(sharedForm.formState.errors);

    return errorKeys.filter(key => tabFieldNames.includes(key)).length;
  }, [sharedForm?.formState?.errors]);

  const renderTabContent = (tab: BaseModalTab, index: number) => {
    // Only show submit button on the last tab
    const isLastTab = index === tabs.length - 1;

    return (
      <TabsContent key={tab.id} value={tab.id} className="mt-6">
        {tab.description && (
          <div
            className={cn(
              'mb-4 p-4 rounded-lg border',
              colorClasses[tab.color || 'blue']
            )}
            id={`tab-${tab.id}-description`}
            role="region"
            aria-label={`${tab.label} məlumatları`}
          >
            <div className="flex items-center gap-2 font-medium">
              {tab.icon}
              {tab.label}
              {tab.badge && (
                <Badge variant="secondary" className="text-xs">
                  {tab.badge}
                </Badge>
              )}
            </div>
            <p className="text-sm mt-1 opacity-90">
              {tab.description}
            </p>
          </div>
        )}
        <FormBuilder
          fields={tab.fields}
          onSubmit={handleSubmit}
          submitLabel={submitLabel || (entity ? 'Yenilə' : 'Əlavə et')}
          loading={isSubmitting || loading}
          defaultValues={defaultValues}
          columns={columns}
          hideSubmit={!isLastTab}
          externalForm={sharedForm}
        />
      </TabsContent>
    );
  };

  const renderSingleForm = () => (
    <FormBuilder
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel={submitLabel || (entity ? 'Yenilə' : 'Əlavə et')}
      loading={isSubmitting || loading}
      defaultValues={defaultValues}
      columns={columns}
      className="mt-6"
      externalForm={sharedForm}
    />
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting && !loading) {
      onClose();
    }
  };

  // Check if modal contains Select components that could cause focus loops
  const containsSelectComponents = tabs.some(tab => 
    tab.fields.some(field => field.type === 'select')
  ) || fields.some(field => field.type === 'select');
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={!containsSelectComponents}>
      <DialogContent 
        className={cn(
          getMaxWidthClass(),
          "max-h-[90vh] overflow-y-auto z-[9999]",
          containsSelectComponents && "[&_*]:focus:outline-none" // Disable focus outlines for problematic modals
        )}
        role="dialog"
        aria-modal={containsSelectComponents ? "false" : "true"} // Disable modal behavior for problematic modals
        data-state={open ? 'open' : 'closed'}
        data-contains-select={containsSelectComponents}
        onEscapeKeyDown={onClose}
        onPointerDownOutside={onClose}
        onInteractOutside={(e) => {
          if (isSubmitting || loading) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
        onOpenAutoFocus={(e) => {
          // DISABLE auto focus for modals with Select components
          if (containsSelectComponents) {
            e.preventDefault();
            console.log('🚫 Modal auto-focus disabled due to Select components');
            return;
          }
          
          // Enhanced focus management for modals with tabs (non-Select modals only)
          const dialogContent = e.currentTarget;
          
          setTimeout(() => {
            // First, try to focus the first tab trigger if tabs exist
            const firstTab = dialogContent.querySelector('[role="tab"]') as HTMLElement;
            if (firstTab && !firstTab.hasAttribute('disabled')) {
              firstTab.focus();
              return;
            }
            
            // Fallback to first focusable element (avoiding Select triggers)
            const firstFocusable = dialogContent.querySelector(
              'button:not([disabled]):not([data-radix-select-trigger]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
            ) as HTMLElement;
            
            if (firstFocusable) {
              firstFocusable.focus();
            }
          }, 50);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            {entityBadge && (
              <Badge variant="outline" className="ml-2">
                {entityBadge}
              </Badge>
            )}
          </DialogTitle>
          {description && (
            <DialogDescription>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && loadingText && (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">{loadingText}</span>
          </div>
        )}

        {tabs.length > 0 ? (
          <BaseModalTabsContext.Provider value={{ activeTab, setActiveTab, tabs }}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Progress Indicator */}
              {tabs.length > 1 && (
                <TabProgressIndicator
                  currentStep={tabs.findIndex(t => t.id === activeTab) + 1}
                  totalSteps={tabs.length}
                  className="mb-4"
                />
              )}

              <TabsList className={cn(
                "grid w-full",
                `grid-cols-${Math.min(tabs.length, 4)}`
              )}>
                {tabs.map((tab) => {
                  const errorCount = getTabErrorCount(tab);
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2"
                      disabled={tab.disabled}
                      onFocus={containsSelectComponents ? (e) => {
                        // For modals with Select components, disable tab focus management entirely
                        console.log('🚫 Tab focus disabled due to Select components in modal');
                      } : (e) => {
                        // Enhanced modal focus management for tabs (non-Select modals only)
                        const modalContent = e.currentTarget.closest('[role="dialog"]');
                        if (modalContent) {
                          // Ensure modal is properly visible before allowing focus
                          const isModalVisible = modalContent.getAttribute('data-state') === 'open' ||
                                               !modalContent.hasAttribute('aria-hidden') ||
                                               modalContent.getAttribute('aria-hidden') === 'false';

                          if (!isModalVisible) {
                            e.preventDefault();
                            e.currentTarget.blur();
                            return;
                          }

                          // Set appropriate ARIA labels for better accessibility
                          if (!e.currentTarget.hasAttribute('aria-describedby')) {
                            e.currentTarget.setAttribute('aria-describedby', `tab-${tab.id}-description`);
                          }
                        }
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {tab.badge}
                        </Badge>
                      )}
                      {errorCount > 0 && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                          {errorCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {tabs.map((tab, index) => renderTabContent(tab, index))}
            </Tabs>
          </BaseModalTabsContext.Provider>
        ) : (
          renderSingleForm()
        )}
      </DialogContent>
    </Dialog>
  );
};
