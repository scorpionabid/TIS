# Hesabat Cədvəlləri (Report Tables) - Kod Analizi və Təkmilləşdirmə Planı

## 1. Mövcud Problemlər və Kod Problemləri

### 1.1. Komponent Həcmli (Component Size)
- **Problem**: `EditableTable.tsx` (1272 sətir), `ReportTableResponsesView.tsx` (790 sətir) çox böyük komponentlərdir
- **Risk**: Maintenance çətinləşir, test coverage almaq çətindir, bir developer başqa birinin işini dəyişəndə conflict riski yüksəkdir
- **Təklif**: Hər bir komponenti 300-400 sətirdən çox olmayacaq şəkildə parçalayın

### 1.2. Kod Təkrarı (Code Duplication)
- **cellValue() funksiyası** ən az 5 yerdə təkrarlanır:
  - `ReportTableApprovalQueue.tsx`
  - `ReportTableResponsesView.tsx` 
  - `ReportTableApprovalGroupedView.tsx`
  - `ReportTableReadyView.tsx`
  - `ReportTableReadyGroupedView.tsx`
  
- **Status badge komponentləri** təkrarlanır: `RowStatusBadge`, `StatusBadge` bir-birinə oxşar
- **Təklif**: `utils/cellValue.ts` və `components/StatusBadge.tsx` kimi shared modullar yaradın

### 1.3. Tip Təhlükəsizlik Problemləri (Type Safety)
```typescript
// Məsələ: ReportTableReadyView.tsx
const cols = selected.table.columns as ReportTableColumn[]; // Type assertion
resp.row_statuses as RowStatuses; // Type assertion
```
- **Risk**: Type assertion-lar runtime xətalarını gizlədir
- **Təklif**: Backend-də tip dəqiqliyi artırılmalı, type assertion minimuma endirilməlidir

### 1.4. Console.log-lar Production-da (Debug Code in Production)
```typescript
// ReportTableReadyView.tsx: 74-77
console.log('All responses:', responses);
if (responses.length > 0) {
  console.log('First response structure:', JSON.stringify(responses[0], null, 2));
}
console.log('Approved responses (filtered by sector):', filteredApproved);
```
- **Risk**: Məxfi məlumatlar (PII) browser console-da görünə bilər
- **Təklif**: `console.log` production build-də avtomatik silinməli və ya `import.meta.env.DEV` ilə şərtli olmalı

### 1.5. Magic Numbers (Hardcoded Values)
```typescript
refetchInterval: 30_000 // 30 saniye - niyə 30? Konfigurasyon olmalı
const timer = setTimeout(() => { saveMutation.mutate(rows); }, 3_000); // 3 saniye autosave
const days = Math.ceil((new Date(table.deadline).getTime() - Date.now()) / 86400000);
```
- **Təklif**: `constants.ts` faylında `REFETCH_INTERVALS`, `AUTO_SAVE_DELAY`, `MS_PER_DAY` kimi konstantlar yaradın

### 1.6. useEffect Dependency Problemləri
```typescript
// TableEntryCard.tsx: 182-192
useEffect(() => {
  const fullyLocked = responseStatus === 'submitted' && !hasEditableRows;
  const hasNonEmptyRows = rows.some(r =>
    Object.values(r).some(v => v !== null && v !== '' && v !== undefined)
  );
  if (fullyLocked || !hasUnsaved || !hasNonEmptyRows) return;
  const timer = setTimeout(() => {
    saveMutation.mutate(rows);
  }, 3_000);
  return () => clearTimeout(timer);
}, [rows, responseStatus, hasEditableRows, hasUnsaved, saveMutation]);
```
- **Problem**: `saveMutation` funksiyası hər render-də yeni referencə yaradır, bu da useEffect-i tez-tez trigger edir
- **Təklif**: `useCallback` ilə saveMutation memoize edilməli və ya `useRef` istifadə edilməlidir

### 1.7. Error Handling Boşluqları
```typescript
// Bir çox mutation-da:
onError: (e: Error) => toast.error(e.message || 'Xəta baş verdi.')
```
- **Problem**: Xətalar səliqəsiz handle olunur, bəzi yerlərdə `console.error` yoxdur
- **Risk**: Debugging çətinləşir, istifadəçi ancaq "Xəta baş verdi" görür
- **Təklif**: Global error handling middleware yaradın

### 1.8. Accessibility (a11y) Problemləri
- Bir çox düymədə `aria-label` yoxdur
- Tablo başlıqlarında `<th>` yerinə bəzən `<td>` istifadə olunur
- Color contrast bəzi yerlərdə WCAG standartlarına uyğun olmaya bilər (text-gray-400 üzərində)

### 1.9. Mobile Responsiveness Problemləri
- `EditableTable` mobile görünüşdə sütunların kəsilməsi problemi
- Overflow-x-auto bir çox yerdə istifadə olunur amma swipe gestures tam işləmir
- Touch target-lar (dəymə sahələri) çox kiçik ola bilər

### 1.10. Performance Problemləri
- `ReportTableResponsesView` hər expand-də bütün rows re-render olunur
- `flatApprovedRows` useMemo istifadə edir am dependency array tam optimize deyil
- `queryClient.invalidateQueries()` bir çox yerdə eyni anda çoxlu query-ləri invalid edir

---

## 2. Arxitektura Problemləri

### 2.1. Tight Coupling (Sıx Bağlılıq)
- `ReportTableApprovalQueue` birbaşa `reportTableService` çağırır, abstraction layer yoxdur
- UI komponentləri data fetching logic ilə qarışıqdır

### 2.2. State Management Dağınıqlığı
- `useState` hook-ları bəzən 10-dan çox yerdə istifadə olunur, reducer pattern istifadə edilmir
- `expandedSectors`, `expandedSchools`, `selected` - bu state-lər URL ilə sync edilmir

### 2.3. API Layer Problemləri
```typescript
// Bir neçə fərqli response endpoint formatı var:
getApprovalQueue()      // ApprovalQueueTable[]
getApprovalQueueGrouped() // ApprovalQueueGroupedTable[]
getReadyGrouped()       // ReadyGroupedTable[]
getAllResponses()       // ReportTableResponse[]
```
- **Problem**: Response strukturları bir-birinə oxşar amma fərqli, DRY prinsipi pozulur

### 2.4. Backend-Frontend Coupling
- Frontend-da `fixed_rows` üçün yoxlama logic-i var amma backend də eyni yoxlama etməlidir
- Type-lar frontend və backend arasında sync saxlanılmalı (shared types)

---

## 3. Security Problemləri

### 3.1. XSS Riski
```typescript
// ReportTableResponsesView.tsx
<td className="px-3 py-2 border-r border-gray-200 text-gray-700">
  {row[col.key] !== undefined && row[col.key] !== null && row[col.key] !== ''
    ? String(row[col.key]) // XSS riski: HTML injection
    : <span className="text-gray-300">—</span>}
</td>
```
- **Risk**: İstifadəçi input-u `<script>` tag-i ola bilər
- **Təklif**: DOMPurify və ya React-in default escape behavior-undan istifadə edilməli

### 3.2. Race Condition
```typescript
// TableEntryCard.tsx
const handleRowSubmit = useCallback((rowIndex: number) => {
  submitRowMutation.mutate(rowIndex);
}, [submitRowMutation]);
```
- **Problem**: İki sətir eyni anda submit edilsə, `responseId` null ola bilər və conflict yaranar

---

## 4. Təkmilləşdirmə Təklifləri

### 4.1. Refactoring Priorities

#### Phase 1: Critical (Dərhal edilməli)
1. **Console.log-ları təmizlə** - production build təhlükəsizliyi üçün
2. **cellValue utility-si** yaradın və təkrarlanan kodları silin
3. **Error handling** sistemini qaydasına qoyun

#### Phase 2: High Priority (1-2 həftə)
4. **EditableTable refactor** - komponenti parçalayın:
   - `TableHeader.tsx`
   - `TableRow.tsx` 
   - `CellInput.tsx`
   - `useTableKeyboard.ts` (hook)
   - `useTableValidation.ts` (hook)

5. **Type safety** artırın:
   - Backend-dən gələn response-lara strict typing
   - `zod` və ya `io-ts` ilə runtime validation

#### Phase 3: Medium Priority (2-4 həftə)
6. **State management** optimize edin:
   - URL sync ilə state management (`useSearchParams`)
   - `zustand` və ya `jotai` ilə global state

7. **Virtualization** əlavə edin:
   - `react-window` və ya `@tanstack/react-virtual` ilə böyük cədvəllər üçün

#### Phase 4: Long-term (1-3 ay)
8. **Micro-frontend** arxitekturası:
   - Report Tables öz bundle-ı ola bilər
   - Lazy loading ilə yüklənmə

9. **Real-time updates**:
   - WebSocket və ya Server-Sent Events (SSE) ilə canlı yeniləmələr

### 4.2. Test Strategiyası
- **Unit tests**: Formula engine, validation logic, utilities
- **Integration tests**: API calls, mutations, query cache
- **E2E tests**: Artıq Playwright test-ləri yazılıb, coverage artırılmalı
- **Visual regression**: Storybook ilə komponent testləri

### 4.3. Performance Optimizations
```typescript
// Məsələn: React.memo ilə row komponentləri
const TableRow = React.memo(function TableRow({ ... }) {
  // ...
}, (prev, next) => {
  // Custom comparison logic
  return prev.rowData === next.rowData && prev.isExpanded === next.isExpanded;
});

// Debounce ilə search
const debouncedSearch = useMemo(
  () => debounce((value: string) => setSearch(value), 300),
  []
);
```

### 4.4. Accessibility (a11y) Təkmilləşdirmələri
- Bütün düymələrə `aria-label` əlavə edin
- Keyboard navigation (Tab, Shift+Tab, Enter, Escape) tam test edilsin
- Screen reader dostu error mesajları
- Focus management (modal açılanda focus trap)

---

## 5. Müəssisə (Priority) Sıralaması

### 🔴 Critical (Bu həftə)
| Problem | Səbəb | Həll |
|---------|-------|------|
| Console.log-lar | PII sızması riski | ESLint rule əlavə et |
| XSS riski | Təhlükəsizlik | DOMPurify istifadə et |
| Race condition | Data itirilməsi | Mutex/lock pattern |

### 🟠 High (1-2 həftə)
| Problem | Səbəb | Həll |
|---------|-------|------|
| Böyük komponentlər | Maintenance çətinliyi | Parçalama |
| Code duplication | DRY pozulması | Shared utilities |
| Type assertions | Runtime xətaları | Strict typing |

### 🟡 Medium (2-4 həftə)
| Problem | Səbəb | Həll |
|---------|-------|------|
| Performance | Yavaş render | Virtualization |
| State management | URL sync yoxdur | Query params |
| Mobile UX | Responsiveness | Touch targets |

### 🟢 Low (Future)
| Problem | Səbəb | Həll |
|---------|-------|------|
| Real-time updates | Manual refresh | WebSocket |
| Micro-frontend | Bundle size | Code splitting |

---

## 6. Nəticə və Növbəti Addımlar

### Hazırda Güclü Tərəflər ✅
1. Funksionallıq tam və işləkdir
2. React Query ilə effektiv data fetching
3. Toast notifications ilə yaxşı UX
4. Auto-save funksionallığı
5. Formula engine (hesablama sütunları)
6. Bulk operations (toplu təsdiq/rədd)
7. Stabil cədvəl (fixed rows) dəstəyi

### Təkmilləşdirmə Tələb Olunan Əsas Sahələr ⚠️
1. **Code quality**: Refactoring və code organization
2. **Testing**: Test coverage artırmaq
3. **Performance**: Böyük cədvəllər üçün optimization
4. **Type safety**: Runtime type checking
5. **Security**: XSS və CSRF qoruması
6. **Accessibility**: WCAG 2.1 AA compliance

### Tövsiyə Olunan İş Planı 📋
1. Həftə 1: Critical təhlükəsizlik və debug problemlərini həll et
2. Həftə 2-3: EditableTable refactor və code organization
3. Həftə 4-5: Testing (unit + integration test coverage)
4. Həftə 6-8: Performance optimizations
5. Həftə 9-12: Accessibility və mobile UX təkmilləşdirmələri

---

*Sənəd tarixi: 4 Mart 2026*
*Son yeniləmə: Real-time kod analizi əsasında*
