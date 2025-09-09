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
}) => {
  const [activeTab, setActiveTab] = React.useState<string>(
    tabs.length > 0 ? tabs[0].id : 'default'
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset tab when modal opens
  React.useEffect(() => {
    if (open && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [open, tabs]);

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

  const renderTabContent = (tab: BaseModalTab) => (
    <TabsContent key={tab.id} value={tab.id} className="mt-6">
      {tab.description && (
        <div className={cn(
          'mb-4 p-4 rounded-lg border',
          colorClasses[tab.color || 'blue']
        )}>
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
      />
    </TabsContent>
  );

  const renderSingleForm = () => (
    <FormBuilder
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel={submitLabel || (entity ? 'Yenilə' : 'Əlavə et')}
      loading={isSubmitting || loading}
      defaultValues={defaultValues}
      columns={columns}
      className="mt-6"
    />
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting && !loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent 
        className={cn(
          getMaxWidthClass(),
          "max-h-[90vh] overflow-y-auto z-[9999]"
        )}
        onEscapeKeyDown={onClose}
        onPointerDownOutside={onClose}
        onInteractOutside={(e) => {
          if (isSubmitting || loading) {
            e.preventDefault();
            return;
          }
          onClose();
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn(
              "grid w-full",
              `grid-cols-${Math.min(tabs.length, 4)}`
            )}>
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2"
                  disabled={tab.disabled}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map(renderTabContent)}
          </Tabs>
        ) : (
          renderSingleForm()
        )}
      </DialogContent>
    </Dialog>
  );
};