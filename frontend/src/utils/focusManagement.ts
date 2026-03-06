/**
 * Focus Management Utilities
 * Handles proper focus behavior for modals and dialogs
 */

/**
 * Gets all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled]):not([aria-hidden="true"])',
    '[href]:not([disabled]):not([aria-hidden="true"])',
    'input:not([disabled]):not([aria-hidden="true"]):not([type="hidden"])',
    'select:not([disabled]):not([aria-hidden="true"])',
    'textarea:not([disabled]):not([aria-hidden="true"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
    '[contenteditable]:not([disabled]):not([aria-hidden="true"])',
  ].join(',');

  const elements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
  
  return elements.filter(element => {
    // Additional checks for visibility and interactability
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      !element.hasAttribute('inert')
    );
  });
}

/**
 * Finds the first focusable element, excluding close buttons
 */
export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusableElements = getFocusableElements(container);
  
  // Prioritize input fields and primary action buttons over close buttons
  const priorityElement = focusableElements.find(el => {
    // Skip close buttons and cancel buttons
    if (
      el.closest('[data-dialog-close]') ||
      el.classList.contains('absolute') ||
      el.textContent?.toLowerCase().includes('bağla') ||
      el.textContent?.toLowerCase().includes('close') ||
      el.textContent?.toLowerCase().includes('cancel') ||
      el.textContent?.toLowerCase().includes('ləğv et')
    ) {
      return false;
    }
    
    // Prioritize input fields first
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      return true;
    }
    
    // Then tab triggers (for tabbed modals)
    if (el.getAttribute('role') === 'tab' || el.closest('[role="tablist"]')) {
      return true;
    }
    
    // Then primary action buttons that aren't destructive
    if (el.tagName === 'BUTTON' && !el.classList.contains('destructive')) {
      return true;
    }
    
    return false;
  });
  
  // If no priority element found, but we have tabs, focus the first tab
  if (!priorityElement) {
    const firstTab = focusableElements.find(el => 
      el.getAttribute('role') === 'tab' || 
      el.closest('[role="tablist"]')
    );
    if (firstTab) return firstTab;
  }
  
  return priorityElement || focusableElements[0] || null;
}

/**
 * Creates a focus trap for modal dialogs
 */
export function createFocusTrap(container: HTMLElement) {
  let isActive = false;
  let previousActiveElement: HTMLElement | null = null;

  function handleKeyDown(event: KeyboardEvent) {
    if (!isActive || event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  function activate() {
    if (isActive) return;
    
    isActive = true;
    previousActiveElement = document.activeElement as HTMLElement;
    
    // Focus the first appropriate element
    const firstFocusable = getFirstFocusableElement(container);
    if (firstFocusable) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        firstFocusable.focus();
      });
    }

    // Add event listener for tab trapping
    document.addEventListener('keydown', handleKeyDown);
  }

  function deactivate() {
    if (!isActive) return;
    
    isActive = false;
    document.removeEventListener('keydown', handleKeyDown);
    
    // Return focus to previous element if it still exists and is focusable
    if (previousActiveElement && document.contains(previousActiveElement)) {
      previousActiveElement.focus();
    }
  }

  return {
    activate,
    deactivate,
    isActive: () => isActive,
  };
}

/**
 * Enhanced Dialog hook with proper focus management
 */
export function useDialogFocus(isOpen: boolean, containerRef: React.RefObject<HTMLElement>) {
  const focusTrapRef = React.useRef<ReturnType<typeof createFocusTrap> | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isOpen) {
      // Create and activate focus trap
      focusTrapRef.current = createFocusTrap(container);
      // Small delay to ensure Radix UI setup is complete
      setTimeout(() => {
        focusTrapRef.current?.activate();
      }, 100);
    } else {
      // Deactivate focus trap
      focusTrapRef.current?.deactivate();
      focusTrapRef.current = null;
    }

    return () => {
      focusTrapRef.current?.deactivate();
    };
  }, [isOpen, containerRef]);
}