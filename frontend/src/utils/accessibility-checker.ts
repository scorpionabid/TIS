/**
 * Accessibility Checker - Automated a11y problem detection
 * Checks for common accessibility violations in the application
 */

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
      const focusableDescendants = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      focusableDescendants.forEach((focusable) => {
        if (focusable === document.activeElement) {
          issues.push({
            element: focusable as HTMLElement,
            type: 'aria-hidden-focus',
            severity: 'critical',
            description: 'Element is focused but hidden from screen readers via aria-hidden',
            solution: 'Remove aria-hidden from focused elements or use proper focus management'
          });
        }
      });
    });

    return issues;
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
    console.log(checker.generateReport());
    return issues;
  };
}