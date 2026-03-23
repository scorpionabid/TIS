# My Resources Səhifəsi — Təkmilləşdirmə Planı

> **Tarix:** 2026-03-12
> **Əsas fayl:** `frontend/src/pages/MyResources.tsx`
> **Əlaqəli fayllar:** `frontend/src/services/resources.ts`, `frontend/src/types/resources.ts`, `backend/routes/api/links.php`, `backend/app/Http/Controllers/LinkShareControllerRefactored.php`, `backend/app/Services/LinkSharing/Domains/Query/LinkQueryBuilder.php`

---

## Mövcud Vəziyyətin Xülasəsi

Səhifə 2 əsas bölmədən ibarətdir:
1. **Mənə Təyin Edilmiş Resurslar** — `GET /api/my-resources/assigned` endpoint-i
2. **Paylaşılan Folderlər** — `documentCollectionService.getAll()` (yalnız sektoradmin+schooladmin)

---

## Aşkar Edilən Problemlər

### 🔴 Kritik Buglar

| # | Problem | Fayllar | Təsir |
|---|---------|---------|-------|
| B1 | **Role mismatch** — Frontend `superadmin`/`regionadmin`-ə `canViewAssignedResources = true` verir, lakin backend middleware yalnız `sektoradmin\|schooladmin\|regionoperator\|müəllim\|teacher`-ə icazə verir. Nəticə: 403 error | `MyResources.tsx:47`, `backend/routes/api/links.php` | Silent failure, user confused |
| B2 | **`viewed_at` tracking yoxdur** — Backend həmişə `null` qaytarır. "Baxıldı" badge heç vaxt yaşıl olmur. `handleResourceAction` içindəki `case 'view'` boşdur | `MyResources.tsx:186-188`, `LinkQueryBuilder.php` | Misleading UX |
| B3 | **Search server-side deyil** — `searchTerm` state query key-ə əlavə edilib amma `useQuery` sadəcə yenidən fetch edir. `per_page: 50` olduğu üçün 50-dən çox resurs varsa axtarış düzgün işləmir | `MyResources.tsx:79,98`, `resources.ts:631` | Functional bug at scale |
| B4 | **Loading state pozisiyası yanlışdır** — `isLoading` skeleton `return` blokundan sonra, Card-ların altında render olunur (şərti rendering ardıcıllığı yanlış) | `MyResources.tsx:494-510` | UX problem |

### 🟡 UX / Performance Problemləri

| # | Problem | Fayllar | Təsir |
|---|---------|---------|-------|
| P1 | **Pagination yoxdur** — `per_page: 50` hardcoded, real user-lar üçün 100+ resurs ola bilər | `MyResources.tsx:98` | Scalability |
| P2 | **Sort yoxdur** — Tarix, başlıq, tip üzrə sıralama yoxdur | `MyResources.tsx` | Missing feature |
| P3 | **`expires_at` göstərilmir** — `documents` cədvəlində `expires_at` sütunu var, lakin kartda göstərilmir | `AssignedResourceGrid` | User unaware |
| P4 | **Category filter yoxdur** — `documents` cədvəlindəki `category` enum (administrative/financial/educational/...) istifadə edilmir | `MyResources.tsx` | Missing feature |
| P5 | **Debounce yoxdur** — Hər keypress-də yeni API sorğusu göndərilir | `MyResources.tsx:295-298` | Performance |
| P6 | **`AssignedResourceGrid` inline komponentdir** — Səhifənin altında tanımlıdır, ayrı fayl deyil, reusability sıfır | `MyResources.tsx:515-688` | Code quality |
| P7 | **`getResourceIcon` funkiyası iki dəfə təkrarlanır** — Həm `MyResources` page-ində, həm `AssignedResourceGrid`-də eyni funksiya kopyalanıb | `MyResources.tsx:145-156, 522-533` | DRY violation |
| P8 | **`formatDate` iki dəfə təkrarlanır** — Eyni funksiya iki fərqli yerdə | `MyResources.tsx:220-226, 535-541` | DRY violation |

### 🟢 Çatışan Funksionallıqlar

| # | Feature | Prioritet |
|---|---------|-----------|
| F1 | **`viewed_at` tracking** — Link açılanda/sənəd yüklənəndə server-ə bildirmək | Yüksək |
| F2 | **Resurs Detalları Panel** — Sağ tərəfdən açılan side panel (title, description, kim paylaşıb, tarix, statistika) | Orta |
| F3 | **"Baxıldı olaraq işarələ" düyməsi** — Manuel mark as read | Orta |
| F4 | **Bildiriş badge** — Sidebar navigation-da unread count | Orta |
| F5 | **Bulk actions** — Bir neçə resursu eyni anda yükləmə/işarələmə | Aşağı |

---

## İmplementasiya Planı

---

### Mərhələ 1 — Kritik Bugları Düzəlt

> **Ümumi iş:** ~4-6 saat | **Prioritet:** DƏRHAL

---

#### Addım 1.1 — Role Mismatch Düzəlt (B1)

**Məqsəd:** Frontend role array-ini backend middleware ilə eyniləşdir.

**Backend dəyişikliyi** — `backend/routes/api/links.php`:
```php
// ƏVVƏL:
->middleware(['auth:sanctum', 'role:sektoradmin|schooladmin|regionoperator|müəllim|teacher']);

// SONRA (superadmin və regionadmin əlavə et):
->middleware(['auth:sanctum', 'role:superadmin|regionadmin|sektoradmin|schooladmin|regionoperator|müəllim|teacher']);
```

**Frontend dəyişikliyi** — `frontend/src/pages/MyResources.tsx:47`:
```typescript
// ƏVVƏL:
const canViewAssignedResources = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'regionoperator', 'müəllim', 'teacher'].includes(currentUser.role);

// SONRA — Rolları sabit dəyişənə çıxar:
const ASSIGNED_RESOURCES_ROLES = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'regionoperator', 'müəllim', 'teacher'] as const;
const canViewAssignedResources = currentUser && ASSIGNED_RESOURCES_ROLES.includes(currentUser.role as typeof ASSIGNED_RESOURCES_ROLES[number]);
```

**Test:**
```bash
# SuperAdmin ilə giriş et, /my-resources açıq, resurslar görünməlidir
# RegionAdmin ilə giriş et, eyni
docker exec atis_backend php artisan test --filter=AssignedResourcesPermissionTest
```

---

#### Addım 1.2 — `viewed_at` Tracking (B2)

**Məqsəd:** Link açılanda / sənəd yüklənəndə `viewed_at` zamanını server-ə göndər.

**Backend — yeni migration:**
```bash
docker exec atis_backend php artisan make:migration create_resource_views_table
```

```php
// database/migrations/YYYY_MM_DD_create_resource_views_table.php
Schema::create('resource_views', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->unsignedBigInteger('resource_id');
    $table->enum('resource_type', ['link', 'document']);
    $table->timestamp('first_viewed_at');
    $table->timestamp('last_viewed_at');
    $table->unsignedInteger('view_count')->default(1);
    $table->index(['user_id', 'resource_id', 'resource_type']);
});
```

**Backend — yeni endpoint:**
```bash
# backend/routes/api/links.php əlavə:
Route::post('/my-resources/{type}/{id}/view', [LinkShareController::class, 'markAsViewed'])
    ->middleware(['auth:sanctum'])
    ->where('type', 'link|document');
```

**Backend — Controller metodu:**
```php
// LinkShareControllerRefactored.php
public function markAsViewed(Request $request, string $type, int $id): JsonResponse
{
    $user = $request->user();

    ResourceView::updateOrCreate(
        ['user_id' => $user->id, 'resource_id' => $id, 'resource_type' => $type],
        ['last_viewed_at' => now(), 'first_viewed_at' => now()]
    );

    // Əgər record artıq varsa, view_count artır
    ResourceView::where([
        'user_id' => $user->id,
        'resource_id' => $id,
        'resource_type' => $type
    ])->increment('view_count');

    return response()->json(['success' => true]);
}
```

**Backend — `getAssignedResources`-da `viewed_at` doldur** (`LinkQueryBuilder.php`):
```php
// Links üçün LEFT JOIN resource_views
->leftJoin('resource_views', function ($join) use ($user) {
    $join->on('link_shares.id', '=', 'resource_views.resource_id')
         ->where('resource_views.resource_type', '=', 'link')
         ->where('resource_views.user_id', '=', $user->id);
})
->addSelect('resource_views.last_viewed_at as viewed_at')
```

**Frontend — `resources.ts` əlavə et:**
```typescript
async markAsViewed(id: number, type: 'link' | 'document'): Promise<void> {
    try {
        await apiClient.post(`/my-resources/${type}/${id}/view`);
    } catch (error) {
        // Non-blocking — viewing should not fail silently
        console.warn('Failed to mark resource as viewed:', error);
    }
}
```

**Frontend — `MyResources.tsx` handleResourceAction-da çağır:**
```typescript
case 'access':
    if (resource.type === 'link' && resource.url) {
        const result = await resourceService.accessResource(resource.id, 'link');
        window.open(result.redirect_url || resource.url, '_blank', 'noopener,noreferrer');
        // YENİ: viewed_at track et (non-blocking)
        resourceService.markAsViewed(resource.id, 'link');
        queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
    }
    break;
case 'download':
    if (resource.type === 'document') {
        // ... mövcud kod ...
        // YENİ: viewed_at track et (non-blocking)
        resourceService.markAsViewed(resource.id, 'document');
        queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
    }
    break;
```

**Migrate:**
```bash
docker exec atis_backend php artisan migrate
```

---

#### Addım 1.3 — Search Debounce əlavə et (B3, P5)

**Məqsəd:** Hər keypress-dən sonra yeni API çağırışı olmaqların qarşısını al.

**Frontend — `MyResources.tsx`-ə yeni state:**
```typescript
// ƏVVƏL:
const [searchTerm, setSearchTerm] = useState('');

// SONRA — debouncedSearch ayrı state:
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchTerm);
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
}, [searchTerm]);
```

**Query key-ə `debouncedSearch` istifadə et:**
```typescript
// ƏVVƏL:
queryKey: ['assigned-resources', { search: searchTerm || undefined, ... }],

// SONRA:
queryKey: ['assigned-resources', { search: debouncedSearch || undefined, ... }],
```

**Backend — `getAssignedResources` metodunda `search` filterini tətbiq et** (`LinkQueryBuilder.php`):
```php
// Mövcud kod içinə əlavə et:
if (!empty($filters['search'])) {
    $searchTerm = '%' . $filters['search'] . '%';
    $query->where(function ($q) use ($searchTerm) {
        $q->where('link_shares.title', 'ILIKE', $searchTerm)
          ->orWhere('link_shares.description', 'ILIKE', $searchTerm)
          ->orWhere('link_shares.url', 'ILIKE', $searchTerm);
    });
}
```

---

#### Addım 1.4 — Loading State Pozisiyasını Düzəlt (B4)

**Məqsəd:** Skeleton-u content-in yerindəki göstər, altında yox.

**Frontend — `MyResources.tsx`-də loading check-i erkən geri qaytar:**
```typescript
// ƏVVƏL — isLoading Card-ların altında conditionally göstərilir (səh. 494-510)
// SONRA — Section 1-in ContentArea-nı isLoading-ə görə render et:

// CardContent içindəki Tabs-dan əvvəl:
{isLoading ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
            <Card key={i}>
                <CardContent className="px-4 py-6">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
) : (
    <Tabs ...>...</Tabs>
)}
```

---

### Mərhələ 2 — Kod Keyfiyyəti və Refaktor

> **Ümumi iş:** ~3-4 saat | **Prioritet:** YAXIN

---

#### Addım 2.1 — `AssignedResourceGrid`-i Ayrı Fayla Çıxar (P6)

**Məqsəd:** `MyResources.tsx`-in sonundakı inline komponenti ayrı fayla köçür.

**Yeni fayl:** `frontend/src/components/resources/AssignedResourceGrid.tsx`

```typescript
// AssignedResourceGrid.tsx
import React from 'react';
import { AssignedResource } from '@/types/resources';
import { resourceService } from '@/services/resources';
// ... UI import-ları

interface AssignedResourceGridProps {
    resources: AssignedResource[];
    onResourceAction: (resource: AssignedResource, action: 'view' | 'access' | 'download') => void;
    isLoading?: boolean;
}

export function AssignedResourceGrid({ resources, onResourceAction, isLoading }: AssignedResourceGridProps) {
    // ... mövcud kod buraya köçür
}
```

**`MyResources.tsx`-də import əlavə et:**
```typescript
import { AssignedResourceGrid } from '@/components/resources/AssignedResourceGrid';
// Faylın altındakı inline komponenti sil
```

---

#### Addım 2.2 — Dublikat Helper Funksiyaları Sil (P7, P8)

**Məqsəd:** `getResourceIcon` və `formatDate` funksiyalarının kopyalarını sil.

`MyResources.tsx:145-156` sətirindəki `getResourceIcon` funksiyasını sil — `AssignedResourceGrid` artıq özünün versiyasını istifadə edir.

`MyResources.tsx:220-226` sətirindəki `formatDate` funksiyasını sil — yalnız `AssignedResourceGrid`-in öz versiyası lazımdır.

---

#### Addım 2.3 — `expires_at` Kartda Göstər (P3)

**Məqsəd:** Resurs kartında bitmə tarixini göstər, yaxın bitəcəksə qırmızı rənglə vurğula.

**`AssignedResourceGrid.tsx`-ə əlavə:**
```typescript
// Kartın alt hissəsindəki metadata bölməsinə:
{resource.expires_at && (
    <div className={`flex items-center gap-1 text-xs ${
        isExpiringSoon(resource.expires_at)
            ? 'text-red-600 font-medium'
            : 'text-muted-foreground'
    }`}>
        <Clock className="h-3 w-3" />
        <span>
            {isExpiringSoon(resource.expires_at) ? '⚠ ' : ''}
            Son tarix: {formatDate(resource.expires_at)}
        </span>
    </div>
)}
```

**Yardımçı funksiya:**
```typescript
const isExpiringSoon = (expiresAt: string): boolean => {
    const daysUntilExpiry = Math.ceil(
        (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
};
```

---

### Mərhələ 3 — Yeni Funksionallıqlar (UX)

> **Ümumi iş:** ~6-8 saat | **Prioritet:** ORTA

---

#### Addım 3.1 — Sort Kontrolları (P2)

**Məqsəd:** İstifadəçi resursları tarix/ad/tip üzrə sıralaya bilsin.

**Frontend — `MyResources.tsx`-ə yeni state:**
```typescript
const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'>('date_desc');
```

**UI — axtarış inputunun yanına:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<div className="flex gap-3 mb-6">
    {/* mövcud Search input */}

    <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
        <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sırala" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="date_desc">Ən yeni əvvəl</SelectItem>
            <SelectItem value="date_asc">Ən köhnə əvvəl</SelectItem>
            <SelectItem value="title_asc">Ad (A → Z)</SelectItem>
            <SelectItem value="title_desc">Ad (Z → A)</SelectItem>
        </SelectContent>
    </Select>
</div>
```

**Client-side sort (backend sort da əlavə etmək mümkündür):**
```typescript
const sortedResources = useMemo(() => {
    const data = [...resourcesData];
    switch (sortBy) {
        case 'date_desc': return data.sort((a, b) => new Date(b.assigned_at || b.created_at).getTime() - new Date(a.assigned_at || a.created_at).getTime());
        case 'date_asc':  return data.sort((a, b) => new Date(a.assigned_at || a.created_at).getTime() - new Date(b.assigned_at || b.created_at).getTime());
        case 'title_asc': return data.sort((a, b) => a.title.localeCompare(b.title, 'az'));
        case 'title_desc':return data.sort((a, b) => b.title.localeCompare(a.title, 'az'));
        default: return data;
    }
}, [resourcesData, sortBy]);
```

---

#### Addım 3.2 — Category Filter Sənədlər Üçün (P4)

**Məqsəd:** Sənəd tab-ında kateqoriya filtri əlavə et.

**State:**
```typescript
const [categoryFilter, setCategoryFilter] = useState<string>('all');
```

**UI — `documents` TabsContent içinə:**
```tsx
{activeTab === 'documents' && (
    <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'administrative', 'financial', 'educational', 'hr', 'technical', 'legal', 'reports', 'forms'].map(cat => (
            <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
            >
                {getCategoryLabel(cat)}
            </Button>
        ))}
    </div>
)}
```

**Filter logic:**
```typescript
const filteredDocuments = useMemo(() => {
    const docs = sortedResources.filter(r => r.type === 'document');
    if (categoryFilter === 'all') return docs;
    return docs.filter(r => r.category === categoryFilter);
}, [sortedResources, categoryFilter]);
```

---

#### Addım 3.3 — Resurs Detalları Side Panel (F2)

**Məqsəd:** Karta kliklədikdə sağdan açılan panel — tam məlumat göstərin.

**Yeni komponent:** `frontend/src/components/resources/ResourceDetailPanel.tsx`

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AssignedResource } from '@/types/resources';

interface ResourceDetailPanelProps {
    resource: AssignedResource | null;
    onClose: () => void;
    onAction: (resource: AssignedResource, action: 'access' | 'download') => void;
}

export function ResourceDetailPanel({ resource, onClose, onAction }: ResourceDetailPanelProps) {
    if (!resource) return null;

    return (
        <Sheet open={!!resource} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        {/* icon + title */}
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {/* Description */}
                    {/* Assigned by (name + institution) */}
                    {/* Assign date, expires_at */}
                    {/* Click/download count */}
                    {/* Baxıldı status */}
                    {/* Action buttons: Aç / Yüklə */}
                </div>
            </SheetContent>
        </Sheet>
    );
}
```

**`MyResources.tsx`-ə state:**
```typescript
const [selectedResource, setSelectedResource] = useState<AssignedResource | null>(null);
```

**`AssignedResourceGrid`-ə `onCardClick` prop:**
```typescript
// Kartın Card komponentinə:
<Card
    onClick={() => onCardClick?.(resource)}
    className="cursor-pointer ..."
>
```

---

#### Addım 3.4 — "Baxıldı olaraq işarələ" Düyməsi (F3)

**Məqsəd:** Hər kartda "Baxıldı" olaraq işarələyə bilmək üçün checkbox/button.

**`AssignedResourceGrid.tsx`-ə:**
```tsx
// Kartın sağ üst küncündə:
{!resource.viewed_at && (
    <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 absolute top-2 right-2"
        onClick={(e) => {
            e.stopPropagation(); // Panel açılmasın
            onMarkAsViewed?.(resource);
        }}
        title="Baxıldı olaraq işarələ"
    >
        <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-green-600" />
    </Button>
)}
```

**`MyResources.tsx`-ə mutation:**
```typescript
const markAsViewedMutation = useMutation({
    mutationFn: (resource: AssignedResource) =>
        resourceService.markAsViewed(resource.id, resource.type),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['assigned-resources'] });
    }
});
```

---

### Mərhələ 4 — Pagination (Sonuncu)

> **Ümumi iş:** ~4-5 saat | **Prioritet:** ORTA-AŞAĞI (cari 50 limit production üçün kifayət edir)

---

#### Addım 4.1 — Backend Pagination

**`LinkQueryBuilder.php`-da `getAssignedResources`-a pagination əlavə et:**
```php
$perPage = $filters['per_page'] ?? 20;
$page = $filters['page'] ?? 1;

return [
    'data' => $results->forPage($page, $perPage)->values(),
    'total' => $results->count(),
    'per_page' => $perPage,
    'current_page' => $page,
    'last_page' => ceil($results->count() / $perPage),
];
```

#### Addım 4.2 — Frontend Pagination State

```typescript
const [currentPage, setCurrentPage] = useState(1);
const PER_PAGE = 20;

// Query key-ə əlavə et:
queryKey: ['assigned-resources', { page: currentPage, ... }],

// UI — CardContent-in altına:
{totalPages > 1 && (
    <div className="flex justify-center gap-2 mt-6">
        <Button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            Əvvəlki
        </Button>
        <span className="py-2 px-4">{currentPage} / {totalPages}</span>
        <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            Növbəti
        </Button>
    </div>
)}
```

---

## Keyfiyyət Yoxlama (Hər Addımdan Sonra)

```bash
# Frontend type check
docker exec atis_frontend npm run typecheck

# Frontend lint
docker exec atis_frontend npm run lint

# Backend tests
docker exec atis_backend php artisan test

# Əgər migration yazıldısa:
docker exec atis_backend php artisan migrate --pretend  # Əvvəlcə preview
docker exec atis_backend php artisan migrate
```

---

## İmplementasiya Sırası (Tövsiyə)

```
GÜN 1 AM → Addım 1.1 (Role mismatch — 30 dəq)
GÜN 1 PM → Addım 1.3 + 1.4 (Debounce + Loading fix — 1 saat)
GÜN 2    → Addım 1.2 (viewed_at tracking — 3-4 saat, migration daxil)
GÜN 3 AM → Addım 2.1 + 2.2 (Refaktor — 2 saat)
GÜN 3 PM → Addım 2.3 (expires_at UI — 30 dəq)
GÜN 4    → Addım 3.1 + 3.2 (Sort + Category filter — 3 saat)
GÜN 5    → Addım 3.3 (Side Panel — 3-4 saat)
GÜN 6    → Addım 3.4 (Mark as viewed button — 1-2 saat)
GÜN 7+   → Addım 4.x (Pagination — əgər lazım olarsa)
```

---

## Riskli Dəyişikliklər

| Dəyişiklik | Risk | Mitigation |
|-----------|------|-----------|
| `resource_views` migration | Yeni cədvəl yaradılır — production-a apply lazımdır | `migrate --pretend` ilə əvvəlcə yoxla |
| Backend role middleware dəyişikliyi | SuperAdmin/RegionAdmin-in görəcəyi resurs sayı artacaq | `getAssignedResources` məntiqi role-a görə data filter edir — OK |
| `getAssignedResources`-a search əlavəsi | Mövcud query-ə WHERE clause əlavə olunur | Test ilə yoxla |

---

## Faydalı Linklər (Layihə İçi)

- `backend/app/Services/LinkSharing/Domains/Query/LinkQueryBuilder.php` — Assigned resources əsas məntiqi
- `backend/app/Http/Controllers/LinkShareControllerRefactored.php` — Controller
- `frontend/src/types/resources.ts` — TypeScript type-ları
- `frontend/src/components/documents/FolderDocumentsView.tsx` — Mövcud side panel nümunəsi (refaktor üçün istinad)
- `.claude/references/atis-permissions-guide.md` — Role permission siyahısı
