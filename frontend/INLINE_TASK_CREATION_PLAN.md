# Excel Görünüşündə İnline Tapşırıq Yaratma - Təkmilləşdirmə Planı

## Mövcud Vəziyyətin Təhlili

### Hal-hazırda olan struktur:
1. **Tasks.tsx** - İki görünüş rejimi arasında keçid (TasksTable və ExcelTaskTable)
2. **ExcelTaskTable.tsx** - Excel tipli cədvəl görünüşü
3. **ExcelCreateRow.tsx** - Sadə düymə komponenti (modal açır)
4. **TasksHeader.tsx** - "Yeni Tapşırıq" düyməsi ilə başlıq
5. **TaskModals.tsx** - Modal əsaslı tapşırıq yaratma/redaktə

### Problemlər:
- İki fərqli görünüş rejimi qarışıqlıq yaradır
- Modal əsaslı yaratma Excel görünüşü ilə ziddiyyət təşkil edir
- ExcelCreateRow passiv düymə kimi işləyir, potensialından istifadə olunmur
- Kod dublikatı: Həm ExcelCreateRow, həm də TasksHeader-də yaratma düyməsi

## Məqsəd

Excel görünüşünü əsas və yeganə görünüş etmək, tapşırıq yaratmanı inline forma ilə həyata keçirmək.

## Təkmilləşdirmə Planı

---

## Faza 1: Tasks.tsx Sadələşdirilməsi

### 1.1. View Mode Toggle Sisteminin Silinməsi

**Fayllar:** `frontend/src/pages/Tasks.tsx`

**Dəyişikliklər:**

```typescript
// SILIMƏLI OLAN:
// Line 2: Table as TableIcon, Grid3x3 import
// Line 20: ToggleGroup, ToggleGroupItem import
// Line 25: const [viewMode, setViewMode] = useState<'table' | 'excel'>('excel');
// Lines 283-294: View Mode Toggle UI

// SILIMƏLI OLAN (conditional rendering):
// Lines 297-336: viewMode === 'excel' ? ... : ...

// YENİ KOD:
// Sadəcə ExcelTaskTable saxlanılır, şərt yoxdur
```

**Konkret Addımlar:**

1. **Import-ları yenilə** (Lines 1-20):
   ```typescript
   // SİL: Table as TableIcon, Grid3x3
   // SİL: ToggleGroup, ToggleGroupItem

   // Line 7: TasksTable import-u tamamilə sil
   ```

2. **State dəyişənini sil** (Line 25):
   ```typescript
   // SİL:
   // const [viewMode, setViewMode] = useState<'table' | 'excel'>('excel');
   ```

3. **View toggle UI-ni sil** (Lines 283-294):
   ```typescript
   // SİL:
   // {/* View Mode Toggle */}
   // <div className="flex justify-end">
   //   <ToggleGroup ...>
   //     ...
   //   </ToggleGroup>
   // </div>
   ```

4. **Şərti renderi sadələşdir** (Lines 297-336):
   ```typescript
   // ƏVVƏLKİ:
   // {viewMode === 'excel' ? (
   //   <ExcelTaskTable ... />
   // ) : (
   //   <TasksTable ... />
   // )}

   // YENİ:
   <ExcelTaskTable
     tasks={tasks}
     sortField={sortField}
     sortDirection={sortDirection}
     onSort={handleSort}
     onViewTask={(task) => openDetailsDrawer(task)}
     onEditTask={handleOpenModal}
     onDeleteTask={(task) => openDeleteModal(task)}
     // onCreateTask={() => handleOpenModal()} // SİL
     canEditTaskItem={canEditTaskItem}
     canDeleteTaskItem={canDeleteTaskItem}
     showCreateButton={showCreateButton}
     page={page}
     perPage={perPage}
     availableUsers={availableUsers}
     availableDepartments={availableDepartments}
     onRefresh={refreshTasks}
     activeTab={activeTab} // YENİ - originScope üçün
     onTaskCreated={handleTaskCreated} // YENİ - callback
   />
   ```

### 1.2. TasksHeader-dən "Yeni Tapşırıq" Düyməsinin Silinməsi

**Fayllar:**
- `frontend/src/pages/Tasks.tsx`
- `frontend/src/components/tasks/TasksHeader.tsx`

**Tasks.tsx dəyişiklikləri:**

```typescript
// Line 257-280: TasksHeader props
<TasksHeader
  currentTabLabel={currentTabLabel}
  availableTabs={availableTabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  // showCreateButton={showCreateButton}  // SİL
  // onCreateTask={() => handleOpenModal()}  // SİL
  stats={stats}
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  statusFilter={statusFilter}
  onStatusFilterChange={setStatusFilter}
  priorityFilter={priorityFilter}
  onPriorityFilterChange={setPriorityFilter}
  categoryFilter={categoryFilter}
  onCategoryFilterChange={setCategoryFilter}
  deadlineFilter={deadlineFilter}
  onDeadlineFilterChange={setDeadlineFilter}
  tasksCount={pagination?.total ?? stats.total}
  isFiltering={isFiltering}
  onClearFilters={clearFilters}
  onApplyPreset={handleApplyFilterPreset}
  disabled={isFetching}
/>
```

**TasksHeader.tsx dəyişiklikləri:**

```typescript
// Line 26-27: Props-dan sil
type TasksHeaderProps = {
  // ...
  // showCreateButton: boolean;  // SİL
  // onCreateTask: () => void;   // SİL
  // ...
};

// Line 169-174: UI elementini sil
// {showCreateButton && (
//   <Button className="flex items-center gap-2 self-start md:self-auto" onClick={onCreateTask} disabled={disabled}>
//     <Plus className="h-4 w-4" />
//     Yeni Tapşırıq
//   </Button>
// )}
```

### 1.3. Modal Məntiqi (isteğe bağlı - saxlanıla bilər redaktə üçün)

**Qeyd:** Modal ancaq **redaktə** üçün saxlanılır. Yeni yaratma inline olacaq.

```typescript
// handleOpenModal funksiyanı sadələşdirilir:
const handleOpenModal = async (task: Task) => {
  // İndi yalnız task parametri ilə çağırılır (redaktə üçün)
  if (!task) {
    console.warn('[Tasks] handleOpenModal yalnız redaktə üçün istifadə olunur');
    return;
  }

  openTaskModal(task);

  try {
    const freshTask = await taskService.getById(task.id, false);
    updateSelectedTask(freshTask);
  } catch (modalError) {
    console.error('[Tasks] Tapşırıq detalları yenilənmədi', modalError);
    toast({
      title: 'Detallar alınmadı',
      description: modalError instanceof Error ? modalError.message : 'Tapşırıq məlumatları yenilənə bilmədi.',
      variant: 'destructive',
    });
  }
};
```

---

## Faza 2: ExcelCreateRow Komponenti - Tam Yenidən Yazılma

### 2.1. Yeni Interface və State Strukturu

**Fayl:** `frontend/src/components/tasks/excel-view/ExcelCreateRow.tsx`

**Yeni Props Interface:**

```typescript
import { useState, useCallback, useMemo } from 'react';
import { Save, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTaskMutations } from '@/hooks/tasks/useTaskMutations';
import { CreateTaskData } from '@/services/tasks';
import { categoryOptions, priorityOptions } from '@/components/tasks/config/taskFormFields';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ExcelCreateRowProps {
  availableUsers: Array<{ id: number; name: string; email?: string }>;
  availableDepartments: Array<{ id: number; name: string }>;
  onTaskCreated: () => Promise<void>; // Cədvəli yeniləmək üçün callback
  originScope: 'region' | 'sector' | null;
  showCreateButton: boolean; // İcazə yoxlaması
}

interface FormState {
  title: string;
  description: string;
  category: string;
  priority: string;
  deadline: string;
  assigned_user_ids: number[];
  notes: string;
}

const initialFormState: FormState = {
  title: '',
  description: '',
  category: 'other',
  priority: 'medium',
  deadline: '',
  assigned_user_ids: [],
  notes: '',
};
```

### 2.2. Komponent Məntiqi

```typescript
export function ExcelCreateRow({
  availableUsers,
  availableDepartments,
  onTaskCreated,
  originScope,
  showCreateButton,
}: ExcelCreateRowProps) {
  const { toast } = useToast();
  const { createTask } = useTaskMutations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // İcazə yoxlaması
  if (!showCreateButton) {
    return null; // Bu tabda yaratma icazəsi yoxdursa, göstərmə
  }

  const handleFieldChange = useCallback((field: keyof FormState, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setFormData(initialFormState);
    setIsExpanded(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: 'Xəta',
        description: 'Tapşırıq başlığı mütləqdir',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Xəta',
        description: 'Tapşırıq təsviri mütləqdir',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateTaskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category as CreateTaskData['category'],
        priority: formData.priority as CreateTaskData['priority'],
        deadline: formData.deadline || undefined,
        assigned_user_ids: formData.assigned_user_ids.length > 0 ? formData.assigned_user_ids : undefined,
        notes: formData.notes.trim() || undefined,
        origin_scope: originScope || undefined,
        target_scope: originScope === 'region' ? 'regional' : 'sector',
      };

      await createTask.mutateAsync(payload);

      toast({
        title: 'Uğurla yaradıldı',
        description: 'Yeni tapşırıq əlavə edildi',
      });

      // Reset form və collapse
      handleReset();

      // Cədvəli yenilə
      await onTaskCreated();
    } catch (error) {
      console.error('[ExcelCreateRow] Yaratma xətası', error);
      toast({
        title: 'Xəta baş verdi',
        description: error instanceof Error ? error.message : 'Tapşırıq yaradılarkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, createTask, toast, onTaskCreated, handleReset, originScope]);

  // ... (UI render kodları növbəti bölmədə)
}
```

### 2.3. UI Strukturu

```typescript
  return (
    <>
      {/* Collapsed State - Düymə */}
      {!isExpanded && (
        <tr className="border-t-2 border-primary/20 bg-muted/20 hover:bg-muted/40 transition-colors">
          <td colSpan={100} className="px-4 py-3">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start text-muted-foreground hover:text-primary',
                'transition-colors group'
              )}
              onClick={() => setIsExpanded(true)}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">Yeni tapşırıq yarat</span>
                <span className="text-xs text-muted-foreground/60">
                  (sətirdə birbaşa əlavə et)
                </span>
              </div>
            </Button>
          </td>
        </tr>
      )}

      {/* Expanded State - Form */}
      {isExpanded && (
        <tr className="border-t-2 border-primary/30 bg-blue-50/50 dark:bg-blue-950/20">
          {/* № (boş) */}
          <td className="px-2 py-3 text-center text-muted-foreground">
            <Plus className="h-4 w-4 mx-auto" />
          </td>

          {/* Başlıq */}
          <td className="px-2 py-3">
            <Input
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Tapşırıq başlığı *"
              className="h-9 text-sm"
              autoFocus
              disabled={isSubmitting}
            />
          </td>

          {/* Təsvir */}
          <td className="px-2 py-3">
            <Textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Təsvir *"
              className="min-h-[80px] text-sm resize-none"
              disabled={isSubmitting}
            />
          </td>

          {/* Kateqoriya */}
          <td className="px-2 py-3">
            <Select
              value={formData.category}
              onValueChange={(value) => handleFieldChange('category', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Prioritet */}
          <td className="px-2 py-3">
            <Select
              value={formData.priority}
              onValueChange={(value) => handleFieldChange('priority', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Status (Yeni yaradılanda həmişə "pending") */}
          <td className="px-2 py-3 text-center text-muted-foreground text-sm">
            Gözləyir
          </td>

          {/* Başlama tarixi (boş - backend set edir) */}
          <td className="px-2 py-3 text-center text-muted-foreground text-sm">
            —
          </td>

          {/* Son tarix */}
          <td className="px-2 py-3">
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) => handleFieldChange('deadline', e.target.value)}
              className="h-9 text-sm"
              disabled={isSubmitting}
            />
          </td>

          {/* Progress (boş - default 0) */}
          <td className="px-2 py-3 text-center text-muted-foreground text-sm">
            0%
          </td>

          {/* Məsul şəxs */}
          <td className="px-2 py-3">
            <Select
              value={formData.assigned_user_ids[0]?.toString() || ''}
              onValueChange={(value) =>
                handleFieldChange('assigned_user_ids', value ? [Number(value)] : [])
              }
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Məsul seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Heç biri</SelectItem>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Qeydlər */}
          <td className="px-2 py-3">
            <Textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Əlavə qeydlər"
              className="min-h-[60px] text-sm resize-none"
              disabled={isSubmitting}
            />
          </td>

          {/* Əməliyyatlar */}
          <td className="px-2 py-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-1"
              >
                <Save className="h-3 w-3" />
                Saxla
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                disabled={isSubmitting}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Ləğv et
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

---

## Faza 3: ExcelTaskTable Komponentinin Uyğunlaşdırılması

### 3.1. Props Dəyişiklikləri

**Fayl:** `frontend/src/components/tasks/excel-view/ExcelTaskTable.tsx`

```typescript
// Line 32: SİL
// onCreateTask: () => void;

// YENİ ƏLAVƏ ET (Line 40-dən sonra):
onTaskCreated: () => Promise<void>; // Yeni callback
originScope: 'region' | 'sector' | null; // Origin scope
```

### 3.2. Props Destructuring Yenilə

```typescript
// Line 43-60
export function ExcelTaskTable({
  tasks,
  sortField,
  sortDirection,
  onSort,
  onViewTask,
  onEditTask,
  onDeleteTask,
  // onCreateTask,  // SİL
  canEditTaskItem,
  canDeleteTaskItem,
  showCreateButton,
  page,
  perPage,
  availableUsers = [],
  availableDepartments = [],
  onRefresh,
  onTaskCreated, // YENİ
  originScope, // YENİ
}: ExcelTaskTableProps) {
```

### 3.3. ExcelCreateRow Render Yenilə

```typescript
// Line 242-247: ƏVVƏLKİ
{showCreateButton && !bulkEditContext.isSelectionMode && (
  <ExcelCreateRow
    onCreateClick={onCreateTask}
    colSpan={excelColumns.length}
  />
)}

// YENİ:
{!bulkEditContext.isSelectionMode && (
  <ExcelCreateRow
    availableUsers={availableUsers}
    availableDepartments={availableDepartments}
    onTaskCreated={onTaskCreated}
    originScope={originScope}
    showCreateButton={showCreateButton}
  />
)}
```

---

## Faza 4: Tasks.tsx-də Yeni Callback Əlavə Etmək

**Fayl:** `frontend/src/pages/Tasks.tsx`

```typescript
// Line 253-dən sonra, handleDeleteConfirm-dən əvvəl:
const handleTaskCreated = useCallback(async () => {
  console.log('[Tasks] Yeni tapşırıq yaradıldı, cədvəl yenilənir...');
  await refreshTasks();
}, [refreshTasks]);
```

---

## Faza 5: Test və Yoxlama

### 5.1. Funkional Testlər

1. **Yaratma formasının açılması:**
   - "Yeni tapşırıq yarat" düyməsinə klik
   - Formanın genişlənməsi
   - Bütün sahələrin görünməsi

2. **Form validasiyası:**
   - Boş başlıq ilə saxlamağa cəhd
   - Boş təsvir ilə saxlamağa cəhd
   - Düzgün error mesajlarının göstərilməsi

3. **Uğurlu yaratma:**
   - Bütün mütləq sahələrin doldurulması
   - "Saxla" düyməsinə klik
   - Toast bildirişinin göstərilməsi
   - Formanın sıfırlanması və collapse olması
   - Cədvəlin avtomatik yenilənməsi
   - Yeni tapşırığın siyahıda görünməsi

4. **Ləğv etmə:**
   - Forma doldurularkən "Ləğv et" düyməsinə klik
   - Formanın sıfırlanması və collapse olması
   - Məlumatların yadda saxlanmaması

5. **İcazə yoxlaması:**
   - Yaratma icazəsi olmayan tabda yaratma formasının göstərilməməsi

### 5.2. UI/UX Testləri

1. **Responsive dizayn:**
   - Desktop (1920px+)
   - Tablet (768px-1024px)
   - Mobile (360px-767px)

2. **Keyboard naviqasiyası:**
   - Tab ilə sahələr arası keçid
   - Enter ilə submit
   - Escape ilə ləğv etmə

3. **Loading state-lər:**
   - Submit zamanı disabled state
   - Loading indikatorları

### 5.3. Performans Testləri

1. **Render performance:**
   - Böyük task list ilə test (100+ task)
   - Form açma/bağlama sürəti

2. **Network:**
   - Yaratma API response time
   - Reload sürəti

---

## Faza 6: Commit və Deployment

### 6.1. Git Commit Strukturu

```bash
# Commit 1: View mode removal
feat: Remove table/excel view toggle and keep only Excel view

- Remove view mode state and toggle UI from Tasks.tsx
- Remove TasksTable conditional rendering
- Keep only ExcelTaskTable as the primary view
- Clean up unused imports (TableIcon, Grid3x3, ToggleGroup)

BREAKING CHANGE: TasksTable view is no longer available

# Commit 2: Header simplification
refactor: Remove create button from TasksHeader

- Remove showCreateButton and onCreateTask props from TasksHeader
- Remove "Yeni Tapşırıq" button UI
- Task creation now happens inline in Excel view

# Commit 3: Inline form implementation
feat: Implement inline task creation in ExcelCreateRow

- Transform ExcelCreateRow from button to full inline form
- Add form state management with validation
- Integrate with useTaskMutations hook
- Add collapsible UI (collapsed button + expanded form)
- Support all required task fields: title, description, category, priority, deadline, assignee, notes

# Commit 4: ExcelTaskTable integration
refactor: Update ExcelTaskTable to use new inline creation

- Remove onCreateTask prop
- Add onTaskCreated callback prop
- Add originScope prop for task creation context
- Pass availableUsers and availableDepartments to ExcelCreateRow
- Update prop destructuring and component rendering

# Commit 5: Tasks.tsx callback
feat: Add handleTaskCreated callback in Tasks.tsx

- Implement handleTaskCreated to refresh tasks after creation
- Pass callback to ExcelTaskTable component
- Ensure seamless table refresh after inline creation
```

### 6.2. Testing Checklist Before Commit

- [ ] Frontend compile olur (no TypeScript errors)
- [ ] Bütün sahələr düzgün işləyir
- [ ] Form validasiyası düzgün işləyir
- [ ] Toast bildirişləri göstərilir
- [ ] Cədvəl avtomatik yenilənir
- [ ] İcazə yoxlaması işləyir
- [ ] Responsive dizayn düzgündür
- [ ] Browser console-da error yoxdur

---

## Gözlənilən Nəticələr

### Təkmilləşmələr:

1. **Sadələşdirilmiş UI:**
   - Yalnız bir görünüş rejimi (Excel view)
   - Modal əvəzinə inline yaratma
   - Daha sürətli iş axını

2. **UX təkmilləşdirməsi:**
   - Daha az klik (modal açmaq əvəzinə birbaşa inline form)
   - Kontekst dəyişməsi yoxdur
   - Daha sürətli və intuitiv

3. **Kod keyfiyyəti:**
   - Az kod dublikatı
   - Daha aydın məsuliyyət bölgüsü
   - Asanlıqla saxlanıla bilən struktur

4. **Performans:**
   - Modal overlay yoxdur
   - Daha az re-render
   - Daha sürətli əməliyyatlar

### Potensial Çətinliklər və Həllər:

1. **Çətinlik:** Forma sahələri table structure-a sığmaya bilər (mobil)
   **Həll:** Responsive dizayn, mobil üçün sətirlər şaquli scroll

2. **Çətinlik:** Form validasiya error-ları göstərmək çətin ola bilər
   **Həll:** Toast bildirişləri ilə error göstərmək

3. **Çətinlik:** Excel view-də istifadəçilər edit modal-ı gözləyə bilərlər
   **Həll:** Edit funksiyası hələ də modal ilə (bu plandan kənarda)

---

## Əlavə Qeydlər

1. **Gələcək genişləndirmələr:**
   - Inline edit funksiyası (modal əvəzinə)
   - Keyboard shortcut-lar (Ctrl+N - yeni tapşırıq)
   - Drag & drop prioritet dəyişikliyi

2. **Backend tələbləri:**
   - Mövcud API endpoint-lər dəyişməz
   - Yeni backend dəyişikliyi tələb olunmur

3. **Backward compatibility:**
   - TasksTable komponenti silinməyəcək (gələcək istifadə üçün)
   - Modal sistem saxlanılır (edit üçün)

---

## Son Qeyd

Bu plan ardıcıl şəkildə (faza-faza) həyata keçirilməlidir. Hər faza test edilib, işlədiyindən əmin olunduqdan sonra növbəti fazaya keçilməlidir.

**Ehtiyat tədbiri:** Hər commit-dən əvvəl git branch yaradıb test etmək məsləhətdir:

```bash
git checkout -b feature/inline-task-creation
# Implement changes
git commit -m "feat: ..."
# Test thoroughly
git checkout main
git merge feature/inline-task-creation
```
