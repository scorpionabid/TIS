/**
 * Accessibility Checker - Automated a11y problem detection
 * Checks for common accessibility violations in the application
 */

import { logger } from './logger';

export interface AccessibilityIssue {
  element: HTMLElement;
  type: 'aria-hidden-focus' | 'missing-labels' | 'duplicate-ids' | 'focus-trap';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution: string;
}

export class AccessibilityChecker {
  private issues: AccessibilityIssue[] = [];

  /**
   * Check for aria-hidden elements with focus
   */
  checkAriaHiddenFocus(): AccessibilityIssue[] {
    const ariaHiddenElements = document.querySelectorAll('[aria-hidden="true"]');
    const issues: AccessibilityIssue[] = [];

    ariaHiddenElements.forEach((element) => {
      // Skip Radix UI managed elements - they handle accessibility internally
      if (this.isRadixUIManaged(element as HTMLElement)) {
        return;
      }

      const focusableDescendants = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      focusableDescendants.forEach((focusable) => {
        // Check if element is currently focused OR can receive focus
        const isActive = focusable === document.activeElement;
        const isFocusable = this.isElementFocusable(focusable as HTMLElement);
        
        // Additional check: skip if element is being transitioned or animated
        const isBeingTransitioned = this.isElementInTransition(focusable as HTMLElement);
        
        if (isActive || (isFocusable && this.isElementVisible(focusable as HTMLElement) && !isBeingTransitioned)) {
          issues.push({
            element: focusable as HTMLElement,
            type: 'aria-hidden-focus',
            severity: 'critical',
            description: 'Element is focusable but hidden from screen readers via aria-hidden ancestor',
            solution: 'Remove aria-hidden from ancestor or move element outside aria-hidden container'
          });
        }
      });
    });

    return issues;
  }

  /**
   * Check if element is managed by Radix UI (which handles accessibility internally)
   */
  private isRadixUIManaged(element: HTMLElement): boolean {
    // Check for Radix UI data attributes
    const radixDataAttrs = [
      'data-radix-dialog-content',
      'data-radix-dialog-overlay',
      'data-state',
      'data-radix-collection-item'
    ];
    
    return radixDataAttrs.some(attr => element.hasAttribute(attr) || element.closest(`[${attr}]`));
  }

  /**
   * Check if element is currently in transition/animation
   */
  private isElementInTransition(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.transition !== 'none' && style.transitionDuration !== '0s' ||
      style.animation !== 'none' && style.animationDuration !== '0s'
    );
  }

  /**
   * Check if element is actually focusable
   */
  private isElementFocusable(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      !element.hasAttribute('disabled') &&
      !element.hasAttribute('aria-disabled') &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /**
   * Check for missing labels on form elements
   */
  checkMissingLabels(): AccessibilityIssue[] {
    const formElements = document.querySelectorAll('input, select, textarea');
    const issues: AccessibilityIssue[] = [];

    formElements.forEach((element) => {
      const hasLabel = element.hasAttribute('aria-label') ||
                      element.hasAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${element.id}"]`);

      if (!hasLabel) {
        issues.push({
          element: element as HTMLElement,
          type: 'missing-labels',
          severity: 'high',
          description: 'Form element lacks accessible label',
          solution: 'Add aria-label, aria-labelledby, or associate with a label element'
        });
      }
    });

    return issues;
  }

  /**
   * Check for duplicate IDs
   */
  checkDuplicateIds(): AccessibilityIssue[] {
    const elements = document.querySelectorAll('[id]');
    const ids = new Map<string, HTMLElement[]>();
    const issues: AccessibilityIssue[] = [];

    elements.forEach((element) => {
      const id = element.id;
      if (!ids.has(id)) {
        ids.set(id, []);
      }
      ids.get(id)!.push(element as HTMLElement);
    });

    ids.forEach((elements, id) => {
      if (elements.length > 1) {
        elements.forEach((element) => {
          issues.push({
            element,
            type: 'duplicate-ids',
            severity: 'medium',
            description: `Duplicate ID "${id}" found`,
            solution: 'Ensure all IDs are unique within the document'
          });
        });
      }
    });

    return issues;
  }

  /**
   * Check for proper focus trap in modals
   */
  checkFocusTrap(): AccessibilityIssue[] {
    const modals = document.querySelectorAll('[role="dialog"], .modal');
    const issues: AccessibilityIssue[] = [];

    modals.forEach((modal) => {
      if (modal.getAttribute('data-state') === 'open' || 
          !modal.hasAttribute('hidden')) {
        
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) {
          issues.push({
            element: modal as HTMLElement,
            type: 'focus-trap',
            severity: 'high',
            description: 'Modal has no focusable elements',
            solution: 'Ensure modal contains at least one focusable element'
          });
        }

        // Check if focus is trapped within modal
        const activeElement = document.activeElement;
        if (activeElement && !modal.contains(activeElement)) {
          issues.push({
            element: modal as HTMLElement,
            type: 'focus-trap',
            severity: 'medium',
            description: 'Focus has escaped the modal',
            solution: 'Implement proper focus trap to keep focus within modal'
          });
        }
      }
    });

    return issues;
  }

  /**
   * Run all accessibility checks
   */
  runAllChecks(): AccessibilityIssue[] {
    this.issues = [
      ...this.checkAriaHiddenFocus(),
      ...this.checkMissingLabels(),
      ...this.checkDuplicateIds(),
      ...this.checkFocusTrap()
    ];

    return this.issues;
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): AccessibilityIssue[] {
    return this.issues.filter(issue => issue.severity === severity);
  }

  /**
   * Generate accessibility report
   */
  generateReport(): string {
    const totalIssues = this.issues.length;
    const criticalIssues = this.getIssuesBySeverity('critical').length;
    const highIssues = this.getIssuesBySeverity('high').length;
    const mediumIssues = this.getIssuesBySeverity('medium').length;
    const lowIssues = this.getIssuesBySeverity('low').length;

    return `
🔍 Accessibility Report
=======================
Total Issues: ${totalIssues}
Critical: ${criticalIssues}
High: ${highIssues}  
Medium: ${mediumIssues}
Low: ${lowIssues}

${this.issues.length > 0 ? 'Issues Found:' : '✅ No accessibility issues detected!'}
${this.issues.map((issue, index) => `
${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type}
   Element: ${issue.element.tagName.toLowerCase()}${issue.element.id ? `#${issue.element.id}` : ''}
   Problem: ${issue.description}
   Solution: ${issue.solution}
`).join('')}
    `.trim();
  }
}

// Global instance for easy access
export const accessibilityChecker = new AccessibilityChecker();

// Development helper function
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).checkAccessibility = () => {
    const checker = new AccessibilityChecker();
    const issues = checker.runAllChecks();
    logger.log('Accessibility check report', { component: 'AccessibilityChecker', action: 'runAllChecks', data: checker.generateReport() });
    return issues;
  };
}