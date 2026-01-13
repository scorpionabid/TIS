# Task Page Implementation Plan
## Verified Analysis & Implementation Strategy

**Status:** ✅ All issues confirmed through codebase analysis
**Priority:** High - Affects data accuracy and user experience
**Estimated Complexity:** Medium-High

---

## Issue #1: Hybrid Sorting Logic

### Current State (Confirmed)
- **Server-side sorting:** deadline, priority, status
- **Client-side sorting:** title, category, assignee
- **Location:** `frontend/src/hooks/tasks/useTasksData.ts:120-145`
- **Problem:** Client sorts only current page data (default 25 items), misleading users

### Implementation Steps

#### Backend Changes (Priority: High)
1. **Update `/api/tasks` endpoint to support all column sorting**
   - Add sort support for: `title`, `category`, `assignees`
   - Ensure database indexes exist for performance
   - Add sort validation middleware

2. **Required API changes:**
   ```typescript
   // Accept these additional sort_by values:
   - title (alphabetical, case-insensitive)
   - category (by category name)
   - assignees (by primary assignee name)
   - department (by department name)
   - started_at (by date)
   - progress (by completion percentage)
   ```

3. **Database optimization:**
   - Create indexes on frequently sorted columns
   - Test query performance with large datasets

#### Frontend Changes
1. **Update `useTasksData.ts`**
   - Remove client-side sorting logic entirely
   - Expand `serverSortableFields` mapping:
   ```typescript
   const serverSortableFields: Partial<Record<SortField, string>> = {
     title: "title",
     category: "category",
     deadline: "deadline",
     priority: "priority",
     status: "status",
     assignee: "assignees",
     department: "department",
     started_at: "started_at",
     progress: "progress"
   };
   ```

2. **Remove client-side sort functions**
   - Delete `sortTasksByTitle()`, `sortTasksByCategory()`, `sortTasksByAssignee()`
   - Simplify the hook logic

3. **Testing:**
   - Test sorting on all columns with pagination
   - Verify sort persistence when changing pages
   - Test with empty datasets

---

## Issue #2: Client-Side Statistics Calculation

### Current State (Confirmed)
- **Location:** `frontend/src/hooks/tasks/useTasksData.ts:161-177`
- **Problem:** Statistics calculated from `rawTasks` array (current page only)
- **Impact:** Incorrect total counts shown to users

```typescript
// Current implementation (INCORRECT):
const stats = useMemo(() => {
  const pending = rawTasks.filter((task) => task.status === "pending").length;
  const inProgress = rawTasks.filter((task) => task.status === "in_progress").length;
  // ... only counts current page tasks
}, [rawTasks]);
```

### Implementation Steps

#### Backend Changes (Priority: High)
1. **Modify `/api/tasks` response structure**
   ```typescript
   // Current response:
   {
     data: Task[],
     pagination: { total, per_page, current_page, last_page }
   }

   // New response (add statistics):
   {
     data: Task[],
     pagination: { total, per_page, current_page, last_page },
     statistics: {
       total: number,
       pending: number,
       in_progress: number,
       completed: number,
       overdue: number
     }
   }
   ```

2. **Statistics should respect current filters**
   - Count should match filtered results, not all tasks
   - Example: If filtering by department X, stats should show counts for department X only

3. **Optimize query performance**
   - Use SQL COUNT with WHERE clauses
   - Consider caching for frequently accessed stats
   - Use single query with CASE WHEN for counts

#### Frontend Changes
1. **Update TaskService type definitions**
   - Add `statistics` to the API response interface
   - Update `TaskListResponse` type

2. **Update `useTasksData.ts`**
   ```typescript
   // Use statistics from API response:
   const stats = useMemo(() => {
     return data?.statistics || {
       total: 0,
       pending: 0,
       in_progress: 0,
       completed: 0,
       overdue: 0
     };
   }, [data?.statistics]);
   ```

3. **Remove client-side calculation logic**
   - Delete the current `useMemo` block that filters `rawTasks`
   - Simplify dependencies

4. **Update stats display components**
   - Verify StatCards component uses the new data correctly
   - Add loading state for statistics
   - Handle undefined/null gracefully

---

## Issue #3: ExcelTaskTable Complexity

### Current State (Confirmed)
- **Main Component:** `frontend/src/components/tasks/excel-view/ExcelTaskTable.tsx` (350+ lines)
- **Related Hooks:**
  - `useInlineEdit.ts` - Manages single-cell editing state
  - `useBulkEdit.ts` - Manages multi-row selection and bulk updates
- **Features:** 12 columns, keyboard navigation, inline editing, bulk operations, sorting

### Improvement Strategy (Non-Breaking)

#### Short-term Actions
1. **Add comprehensive tests (Priority: High)**
   - Create test file: `ExcelTaskTable.test.tsx`
   - Test scenarios:
     - Column sorting (all columns)
     - Inline editing (each editable field)
     - Bulk selection (select all, select individual)
     - Bulk editing (status, priority, assignees)
     - Keyboard navigation (arrow keys, enter, escape)
     - Permission checks (canEditTaskItem, canDeleteTaskItem)
     - Error handling (API failures)

2. **Add integration tests**
   - Create: `tasks-page.e2e.test.ts`
   - Test full user workflows:
     - Create → Edit → Delete task
     - Apply filters → Sort → Edit
     - Bulk select → Bulk update

3. **Performance monitoring**
   - Add React DevTools Profiler measurements
   - Monitor render counts for large datasets (100+ tasks)
   - Identify unnecessary re-renders
   - Consider memoization opportunities

#### Medium-term Refactoring (Future)
1. **Extract sub-components** (when adding new features):
   - `ExcelTableHeader.tsx` - Column headers with sort controls
   - `ExcelTableRow.tsx` - Individual task row
   - `ExcelTableCell.tsx` - Cell rendering logic
   - `BulkActionToolbar.tsx` - Bulk operation controls

2. **Simplify hooks:**
   - Consider combining `useInlineEdit` and `useBulkEdit` if logic overlaps
   - Extract reusable validation logic
   - Centralize API mutation patterns

3. **Documentation:**
   - Add JSDoc comments to complex functions
   - Create architecture diagram for the excel-view module
   - Document keyboard shortcuts for users

---

## Issue #4: API Requests in Tasks.tsx

### Current State (Confirmed)
- **Location:** `frontend/src/pages/Tasks.tsx`
- **Direct API calls:**
  - Line 135: `taskService.getAssignableUsers()`
  - Line 151: `departmentService.getAll()`
  - Line 187: `taskService.getById()`
  - Lines 221-256: CRUD operations (create, update, delete)

### Implementation Steps

#### Create New Hooks
1. **Create `useAssignableUsers.ts`**
   ```typescript
   // File: frontend/src/hooks/tasks/useAssignableUsers.ts
   import { useQuery } from '@tanstack/react-query';
   import { taskService } from '@/services';

   export function useAssignableUsers() {
     return useQuery({
       queryKey: ['assignable-users'],
       queryFn: () => taskService.getAssignableUsers({ per_page: 1000 }),
       select: (response) => response.data,
       staleTime: 5 * 60 * 1000, // 5 minutes
     });
   }
   ```

2. **Create `useAvailableDepartments.ts`**
   ```typescript
   // File: frontend/src/hooks/tasks/useAvailableDepartments.ts
   import { useQuery } from '@tanstack/react-query';
   import { departmentService } from '@/services';

   export function useAvailableDepartments() {
     return useQuery({
       queryKey: ['departments', { is_active: true }],
       queryFn: () => departmentService.getAll({ per_page: 1000, is_active: true }),
       select: (response) => response.data || [],
       staleTime: 10 * 60 * 1000, // 10 minutes
     });
   }
   ```

3. **Create `useTaskMutations.ts`**
   ```typescript
   // File: frontend/src/hooks/tasks/useTaskMutations.ts
   import { useMutation, useQueryClient } from '@tanstack/react-query';
   import { taskService } from '@/services';
   import { toast } from 'react-hot-toast';

   export function useTaskMutations() {
     const queryClient = useQueryClient();

     const createTask = useMutation({
       mutationFn: taskService.create,
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['tasks'] });
         toast.success('Task created successfully');
       },
       onError: () => {
         toast.error('Failed to create task');
       },
     });

     const updateTask = useMutation({
       mutationFn: ({ id, data }) => taskService.update(id, data),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['tasks'] });
         toast.success('Task updated successfully');
       },
       onError: () => {
         toast.error('Failed to update task');
       },
     });

     const deleteTask = useMutation({
       mutationFn: taskService.delete,
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['tasks'] });
         toast.success('Task deleted successfully');
       },
       onError: () => {
         toast.error('Failed to delete task');
       },
     });

     return { createTask, updateTask, deleteTask };
   }
   ```

#### Update Tasks.tsx
1. **Replace direct API calls with hooks:**
   ```typescript
   // Replace useEffect blocks with:
   const { data: availableUsers, isLoading: isLoadingUsers } = useAssignableUsers();
   const { data: availableDepartments, isLoading: isLoadingDepts } = useAvailableDepartments();
   const { createTask, updateTask, deleteTask } = useTaskMutations();
   ```

2. **Update handlers:**
   ```typescript
   // Before:
   const handleFormSubmit = async (data: TaskFormData) => {
     if (editingTask) {
       await taskService.update(editingTask.id, data);
     } else {
       await taskService.create(data);
     }
   };

   // After:
   const handleFormSubmit = async (data: TaskFormData) => {
     if (editingTask) {
       await updateTask.mutateAsync({ id: editingTask.id, data });
     } else {
       await createTask.mutateAsync(data);
     }
   };
   ```

3. **Benefits:**
   - Centralized error handling and loading states
   - Automatic cache invalidation
   - Reusable across components
   - Better testing (can mock hooks)
   - Cleaner component code

---

## Implementation Sequence

### Phase 1: Backend Foundation (Week 1)
1. Add statistics to `/api/tasks` response
2. Implement server-side sorting for all columns
3. Add database indexes
4. Write API tests

### Phase 2: Frontend Data Layer (Week 1-2)
1. Create new hooks (useAssignableUsers, useAvailableDepartments, useTaskMutations)
2. Update useTasksData to use server-provided statistics
3. Remove client-side sorting logic
4. Update type definitions

### Phase 3: Component Refactoring (Week 2)
1. Update Tasks.tsx to use new hooks
2. Remove direct API calls
3. Update error handling
4. Test all functionality

### Phase 4: Testing & Quality (Week 2-3)
1. Add unit tests for ExcelTaskTable
2. Add integration tests for task workflows
3. Performance testing with large datasets
4. User acceptance testing

### Phase 5: Documentation (Week 3)
1. Update API documentation
2. Add code comments
3. Create architecture diagrams
4. Update user guide

---

## Rollback Plan

Each phase can be rolled back independently:

1. **Backend changes:** Use feature flags to toggle new statistics/sorting
2. **Frontend hooks:** Keep old API calls until hooks are tested
3. **Component changes:** Branch-based development with thorough QA

---

## Success Metrics

- [ ] All sorting operations use server-side logic
- [ ] Statistics match database counts (verified with SQL queries)
- [ ] Test coverage > 80% for ExcelTaskTable and related hooks
- [ ] No performance regression (measure with Chrome DevTools)
- [ ] Zero direct API calls in page components
- [ ] All mutations centralized in custom hooks

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Comprehensive testing, gradual rollout |
| Performance degradation | Medium | Database indexes, query optimization, monitoring |
| Backend API changes require coordination | Medium | API versioning, backward compatibility |
| Large refactoring introduces bugs | High | Feature flags, staged deployment, rollback plan |

---

## Notes

- Maintain backward compatibility where possible
- Use feature flags for gradual rollout
- Monitor error rates and performance metrics post-deployment
- Communicate changes to team and stakeholders
- Update documentation alongside code changes
