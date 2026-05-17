import React from 'react';
import { Button } from '@/components/ui/button';
import { BaseModalTabsContext } from '@/components/common/BaseModal.context';
import { logger } from '@/utils/logger';
import { ChevronRight, Loader2 } from 'lucide-react';

export interface ModalTabNavigationProps {
  /**
   * React Hook Form instance
   */
  form: any;

  /**
   * List of field names that need to be validated before navigation
   */
  requiredFields?: string[];

  /**
   * Target tab ID to navigate to
   */
  targetTabId: string;

  /**
   * Button label (default: "İrəli")
   */
  label?: string;

  /**
   * Button variant
   */
  variant?: 'default' | 'secondary' | 'outline';

  /**
   * Additional className for the container
   */
  className?: string;

  /**
   * Callback after successful validation
   */
  onValidationSuccess?: () => void;

  /**
   * Callback when validation fails
   */
  onValidationError?: (errors: any) => void;
}

/**
 * ModalTabNavigation - Reusable component for tab navigation with validation
 *
 * Bu komponent modal tab-lar arasında keçid üçün istifadə olunur.
 * Form validation ilə inteqrasiya olunub və yalnız valid məlumatlar olduqda
 * növbəti tab-a keçməyə icazə verir.
 *
 * @example
 * ```tsx
 * <ModalTabNavigation
 *   form={form}
 *   requiredFields={['title', 'category', 'priority']}
 *   targetTabId="target"
 *   label="Növbəti"
 * />
 * ```
 */
export const ModalTabNavigation: React.FC<ModalTabNavigationProps> = ({
  form,
  requiredFields = [],
  targetTabId,
  label = 'İrəli',
  variant = 'secondary',
  className = '',
  onValidationSuccess,
  onValidationError,
}) => {
  const tabsContext = React.useContext(BaseModalTabsContext);
  const [isValidating, setIsValidating] = React.useState(false);

  // If no tabs context available, don't render
  if (!tabsContext) {
    logger.warn('ModalTabNavigation used outside BaseModalTabsContext', {
      component: 'ModalTabNavigation'
    });
    return null;
  }

  const handleNext = async () => {
    setIsValidating(true);

    try {
      // Validate required fields if provided
      const isValid = requiredFields.length > 0
        ? await form.trigger(requiredFields, { shouldFocus: true })
        : true;

      logger.debug('ModalTabNavigation validation', {
        targetTabId,
        isValid,
        requiredFields,
        errors: form.formState.errors
      });

      if (isValid) {
        tabsContext.setActiveTab(targetTabId);
        onValidationSuccess?.();
      } else {
        onValidationError?.(form.formState.errors);
      }
    } catch (error) {
      logger.error('ModalTabNavigation validation error', error, {
        component: 'ModalTabNavigation',
        targetTabId
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className={`flex justify-end pt-2 ${className}`}>
      <Button
        type="button"
        variant={variant}
        onClick={handleNext}
        disabled={isValidating}
        className="min-w-[96px]"
      >
        {isValidating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Yoxlanılır...
          </>
        ) : (
          <>
            {label}
            <ChevronRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
};

/**
 * Simplified version for basic navigation without validation
 */
export const SimpleModalTabNavigation: React.FC<{
  targetTabId: string;
  label?: string;
  className?: string;
}> = ({ targetTabId, label = 'İrəli', className = '' }) => {
  const tabsContext = React.useContext(BaseModalTabsContext);

  if (!tabsContext) return null;

  return (
    <div className={`flex justify-end pt-2 ${className}`}>
      <Button
        type="button"
        variant="secondary"
        onClick={() => tabsContext.setActiveTab(targetTabId)}
        className="min-w-[96px]"
      >
        {label}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};
