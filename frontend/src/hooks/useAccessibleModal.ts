import { useEffect, useRef } from 'react';
import { createFocusTrap } from '@/utils/focusManagement';

/**
 * Hook for managing accessible modal behavior
 * Handles focus trapping and proper ARIA states
 */
export function useAccessibleModal(isOpen: boolean) {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useRef<ReturnType<typeof createFocusTrap> | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const modalElement = modalRef.current;
    
    if (isOpen && modalElement) {
      // Store the previously focused element
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      
      // Create focus trap with a slight delay to ensure Radix UI setup is complete
      const timer = setTimeout(() => {
        focusTrapRef.current = createFocusTrap(modalElement);
        focusTrapRef.current.activate();
      }, 50);

      return () => {
        clearTimeout(timer);
        focusTrapRef.current?.deactivate();
      };
    } else if (!isOpen) {
      // Clean up focus trap when modal closes
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
        focusTrapRef.current = null;
      }

      // Return focus to the previously focused element
      if (previousActiveElementRef.current && document.contains(previousActiveElementRef.current)) {
        previousActiveElementRef.current.focus();
      }
    }
  }, [isOpen]);

  return {
    modalRef,
    // Additional helper functions
    isModalOpen: isOpen,
    hasFocusTrap: !!focusTrapRef.current?.isActive(),
  };
}