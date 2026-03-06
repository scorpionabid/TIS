# Suspense & Fallback Patterns

This note documents how Suspense is currently used across the ATİS frontend and defines the shared fallbacks/components teams should rely on when lazy-loading UI.

## Audit Summary

- `frontend/src/pages/Users/UserManagement.tsx` lazily loads `UserModal`, `DeleteConfirmationModal`, `UserImportExportModal`, and `TrashedUsersModal`. These modals now share a common fallback component.
- Other modals (Departments, Roles, Institutions, etc.) are imported eagerly today. They can adopt the shared pattern when/if they are converted to lazy-loaded modules.
- Page-level suspense (dashboards, layout) already goes through `components/common/LazyWrapper.tsx`, which provides a default loader and error boundary.

## Shared Building Blocks

| Component | Purpose | Location |
| --- | --- | --- |
| `ModalFallback` | Skeleton-based placeholder for modal Suspense boundaries (backdrop + content placeholders) | `frontend/src/components/common/ModalFallback.tsx` |
| `LazyWrapper` | Wrapper for lazily loaded pages/sections with spinner + error boundary | `frontend/src/components/common/LazyWrapper.tsx` |

### Using `ModalFallback`

```tsx
import { Suspense, lazy } from 'react';
import { ModalFallback } from '@/components/common/ModalFallback';

const DeleteConfirmationModal = lazy(() =>
  import('@/components/modals/DeleteConfirmationModal').then(mod => ({
    default: mod.DeleteConfirmationModal,
  }))
);

// ...
{isDeleteOpen ? (
  <Suspense fallback={<ModalFallback />}>
    <DeleteConfirmationModal open={isDeleteOpen} onClose={closeModal} />
  </Suspense>
) : null}
```

`ModalFallback` accepts optional props (`titlePlaceholderWidth`, `contentLines`, `actionCount`) so teams can tweak the skeleton layout if needed, while maintaining a consistent visual baseline.

### Using `LazyWrapper` for sections/pages

```tsx
import { LazyWrapper } from '@/components/common/LazyWrapper';

<LazyWrapper minHeight="300px">
  <HeavyDashboardWidget />
</LazyWrapper>
```

## Checklist for New Lazy-Loaded UI

1. **Modals**: wrap the lazy modal in `<Suspense fallback={<ModalFallback />}>`.
2. **Pages/sections**: prefer `<LazyWrapper>` which already bundles Suspense + ErrorBoundary + default loader.
3. **Accessibility**: the fallback should communicate loading state (ModalFallback skeleton includes visible placeholders). Avoid leaving an empty overlay.
4. **Error handling**: ensure error boundaries are present for large sections (LazyWrapper provides one).
5. **Testing**: when adding lazy-loaded components, verify the fallback renders under artificial network throttling and that the resolved component still mounts correctly.

Following these guidelines keeps the user experience consistent while we continue splitting more UI with Suspense.
