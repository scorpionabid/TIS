import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { getFirstFocusableElement } from "@/utils/focusManagement"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  React.useImperativeHandle(ref, () => contentRef.current!);
  
  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    
    // CRITICAL: Aggressive focus cleanup on any modal state change
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'aria-hidden' || 
             mutation.attributeName === 'data-state')) {
          const target = mutation.target as HTMLElement;
          
          // Aggressive cleanup on any state change
          const allElements = target.querySelectorAll('*');
          allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              try {
                if (el === document.activeElement || el.matches(':focus')) {
                  el.blur();
                  // Temporarily disable focus events
                  const events = ['focus', 'focusin', 'focusout'];
                  const listeners: { [key: string]: any } = {};
                  
                  events.forEach(eventType => {
                    listeners[eventType] = (el as any)[`on${eventType}`];
                    (el as any)[`on${eventType}`] = null;
                  });
                  
                  // Restore listeners after a delay
                  setTimeout(() => {
                    events.forEach(eventType => {
                      (el as any)[`on${eventType}`] = listeners[eventType];
                    });
                  }, 200);
                }
              } catch (error) {
                // Ignore cleanup errors
              }
            }
          });
          
          // Also blur document.activeElement if it's inside this modal
          if (document.activeElement && target.contains(document.activeElement)) {
            try {
              (document.activeElement as HTMLElement).blur();
            } catch (error) {
              // Ignore errors
            }
          }
        }
      });
    });
    
    observer.observe(content, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'data-state'],
      subtree: true // Watch all descendant changes
    });
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        onAnimationStart={(e) => {
          const target = e.currentTarget;
          if (e.animationName.includes('animate-out') || e.animationName.includes('fade-out')) {
            // Modal is closing - immediately and aggressively blur all elements
            const allElements = target.querySelectorAll('*');
            
            allElements.forEach((el) => {
              if (el instanceof HTMLElement) {
                try {
                  if (el === document.activeElement || el.matches(':focus') || el.matches(':focus-within')) {
                    el.blur();
                    // Remove focus-related event listeners temporarily
                    const originalOnFocus = el.onfocus;
                    el.onfocus = null;
                    setTimeout(() => {
                      el.onfocus = originalOnFocus;
                    }, 100);
                  }
                } catch (error) {
                  // Ignore errors during aggressive cleanup
                }
              }
            });
          }
        }}
        onOpenAutoFocus={(e) => {
          // CRITICAL: Disable automatic focus to prevent infinite loops with Select components
          e.preventDefault();
          
          const dialogContent = e.currentTarget;
          
          // Check if modal contains Select components that could cause focus loops
          const hasSelectTriggers = dialogContent.querySelector('[data-radix-select-trigger]');
          
          if (hasSelectTriggers) {
            // For modals with Select components, disable auto focus entirely
            // Users can manually click to focus elements
            console.log('🔒 Modal contains Select components - disabling auto focus to prevent infinite loops');
            return;
          }
          
          // Only apply focus management for modals without Select components
          dialogContent.removeAttribute('aria-hidden');
          
          setTimeout(() => {
            const firstTab = dialogContent.querySelector('[role="tab"]:not([disabled])') as HTMLElement;
            if (firstTab) {
              firstTab.focus();
              return;
            }
            
            const firstFocusable = getFirstFocusableElement(dialogContent);
            if (firstFocusable && !firstFocusable.hasAttribute('data-radix-select-trigger')) {
              firstFocusable.focus();
            }
          }, 50); // Reduced delay
        }}
        onCloseAutoFocus={(e) => {
          // CRITICAL: Completely disable auto focus return to prevent loops
          e.preventDefault();
          
          const dialogContent = e.currentTarget;
          
          // Comprehensive immediate cleanup
          const allFocusableElements = dialogContent.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [data-radix-select-trigger], [role="tab"]'
          );
          
          allFocusableElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              try {
                el.blur();
                // Remove any focus-related attributes that might cause issues
                el.removeAttribute('data-focus-visible-added');
                el.removeAttribute('data-focus-visible');
              } catch (error) {
                // Ignore any errors during cleanup
                console.warn('Focus cleanup error:', error);
              }
            }
          });
          
          // Ensure document.activeElement is also blurred
          if (document.activeElement && document.activeElement instanceof HTMLElement) {
            try {
              document.activeElement.blur();
            } catch (error) {
              console.warn('Document activeElement blur error:', error);
            }
          }
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close 
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          data-dialog-close
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Bağla</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
