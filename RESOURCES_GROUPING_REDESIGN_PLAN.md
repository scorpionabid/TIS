# ATİS Resources - Qruplaşdırma və Sadələşdirilmiş Filter Planı

**Tarix:** 14 Noyabr 2025
**Status:** Design & Implementation Plan
**Fokus:** Sektor/Başlıq Qruplaşdırması + Minimalist Filter

---

## 🎯 İstifadəçi Tələbləri

### Əsas Fokus
1. ✅ **Sektor Qruplaşdırması** - Sektorlara aid müəssisələrin linklərini qrupla
2. ✅ **Başlıq Qruplaşdırması** - Link başlıqlarına görə əlifba sırası ilə qrupla
3. ✅ **Minimalist Filter** - Lazımsız filter elementlərini azalt, əsasları saxla
4. ✅ **Sadə İstifadə** - User-friendly, kompleks olmayan interfeys

### Qruplaşdırma Prioriteti
```
Prioritet 1: Sektor üzrə qruplaşdırma (Regional hierarchy)
Prioritet 2: Başlıq (Title) üzrə əlifba qruplaşdırması
Prioritet 3: Filter sadələşdirmə
```

---

## 📊 Mövcud Vəziyyət Analizi

### Backend Data Structure (Hazır)
```php
LinkShare Model:
├─ institution_id (int)          // Müəssisə ID
├─ share_scope (enum)            // public, regional, sectoral, institutional
├─ target_institutions (json)    // [1, 2, 3, ...] müəssisə ID-ləri
├─ target_roles (json)           // ['teacher', 'admin', ...]
├─ target_departments (json)     // [1, 2, 3, ...] department ID-ləri
├─ title (string)                // Link başlığı
├─ link_type (enum)              // external, video, form, document
├─ created_by (int)              // Yaradıcı user ID
└─ created_at (timestamp)        // Yaranma tarixi
```

### Institution Hierarchy (Hazır)
```
Ministry (id: 1) - Level 1
├─ Regional Office 1 (id: 2-5) - Level 2
│  ├─ Sector 1 (id: 6-10) - Level 3
│  │  ├─ School 1 (id: 11-30) - Level 4
│  │  └─ School 2
│  └─ Sector 2
└─ Regional Office 2
```

### Frontend Components (Mövcud)
```typescript
/frontend/src/
├─ pages/Resources.tsx               // Main page (923 lines)
├─ components/resources/
│  ├─ LinkFilterPanel.tsx           // Filter UI (517 lines)
│  ├─ ResourceGrid.tsx              // Table display (417 lines)
│  └─ ResourceToolbar.tsx           // Actions toolbar
└─ hooks/
   └─ useResourceFilters.ts         // Filter state management
```

---

## 🎨 Yeni Dizayn Konsepti

### 1️⃣ Qruplaşdırma UI Dizaynı

#### Vizual Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────────┐
│ Resources Səhifəsi                                     [+ Link] │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 Axtar...]  [⚙️ Qruplaşdırma ▼]  [🔽 Filter]  [↕️ Sort ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌────── Bakı Sektor 1 (15 link) ────────────────────────────┐  │
│ │                                                             │  │
│ │ [A]                                                         │  │
│ │  → Attestasiya forması                        🔗 10 klik   │  │
│ │  → Audit hesabat sistemi                      📄 5 klik    │  │
│ │                                                             │  │
│ │ [B]                                                         │  │
│ │  → Bakı şəhər təhsil statistikası             📊 25 klik   │  │
│ │                                                             │  │
│ │ [T]                                                         │  │
│ │  → Təhsil nazirliyi rəsmi sayt                🌐 100 klik  │  │
│ │  → Tədris materialları bazası                 📚 45 klik   │  │
│ │                                                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────── Bakı Sektor 2 (8 link) ─────────────────────────────┐  │
│ │                                                             │  │
│ │ [D]                                                         │  │
│ │  → Dərslik siyahısı 2025                      📋 18 klik   │  │
│ │                                                             │  │
│ │ [İ]                                                         │  │
│ │  → İmtahan nəticələri portalı                 📊 67 klik   │  │
│ │                                                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────── Sumqayıt Sektor 1 (12 link) ────────────────────────┐  │
│ │  ...                                                        │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Qruplaşdırma Dropdown
```
⚙️ Qruplaşdırma
├─ ✓ Sektor üzrə
├─ ○ Başlıq (Əlifba)
├─ ○ Link növü
├─ ○ Yaranma tarixi
└─ ○ Qruplaşdırma yoxdur
```

---

### 2️⃣ Sadələşdirilmiş Filter Paneli

#### ❌ Silinəcək Filter Elementləri (Kompleks/Az istifadə)
```typescript
// REMOVE:
- Share Scope filter (Paylaşma səviyyəsi) - Qruplaşdırma ilə həll olunur
- Creator filter (Yaradıcı) - Admin-specific, ümumi istifadəçi üçün lazım deyil
- Date range filters (Başlanğıc/Bitmə tarix) - Az istifadə olunur
- Access Level (Giriş səviyyəsi) - Documents üçün, links-də lazımsız
- Category (Kateqoriya) - Documents üçün
- Mime Type (Fayl növü) - Documents üçün
- Quick filters checkboxes (Mənim resurslarım, Önə çıxanlar) - Dropdown-a çevrilə bilər
```

#### ✅ Saxlanılacaq Filter Elementləri (Əsas)
```typescript
// KEEP (Minimalist):
1. Müəssisə (Institution) - Multi-select, search-able
2. Link Növü (Link Type) - external, video, form, document
3. Status - active, expired, disabled
```

#### Yeni Minimalist Filter UI
```
┌─────────────────────────────────────────────────────────┐
│ 🔽 Filtr                                     [Təmizlə]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Müəssisə                                                 │
│ [🔍 Müəssisə axtar...]                           ▼      │
│ ☐ Bakı şəhər təhsil idarəsi                             │
│ ☐ Sumqayıt təhsil idarəsi                               │
│ ☐ 1 nömrəli məktəb                                      │
│                                                          │
│ Link Növü                    Status                     │
│ [ Hamısı        ▼ ]          [ Hamısı        ▼ ]        │
│                                                          │
│ [2 aktiv filter]                                         │
│ • Müəssisə: Bakı şəhər... [x]                           │
│ • Status: Aktiv [x]                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 3️⃣ Qruplaşdırma Alqoritmləri

#### Sektor Qruplaşdırması Logic
```typescript
interface GroupedByInstitution {
  institution: {
    id: number;
    name: string;
    type: string;        // 'sector' | 'school' | 'regional'
    level: number;       // 1-4
    parentId: number | null;
  };
  links: Resource[];
  count: number;
  subGroups?: GroupedByInstitution[];  // Nested grouping
}

// Algorithm:
function groupBySector(links: Resource[], institutions: Institution[]) {
  // 1. Extract all institution IDs from links
  const institutionIds = new Set<number>();
  links.forEach(link => {
    if (link.institution_id) institutionIds.add(link.institution_id);
    if (link.target_institutions) {
      link.target_institutions.forEach(id => institutionIds.add(id));
    }
  });

  // 2. Build institution hierarchy map
  const institutionMap = buildHierarchyMap(institutions);

  // 3. Group links by sector (level 3) or closest parent
  const groups: Map<number, Resource[]> = new Map();

  links.forEach(link => {
    const institutionId = link.institution_id || link.target_institutions?.[0];
    if (!institutionId) {
      // Orphan links → "Ümumi" group
      groups.set(0, [...(groups.get(0) || []), link]);
      return;
    }

    const institution = institutionMap.get(institutionId);
    const sectorId = findSectorId(institution, institutionMap);

    groups.set(sectorId, [...(groups.get(sectorId) || []), link]);
  });

  // 4. Sort groups by sector name
  return Array.from(groups.entries())
    .map(([sectorId, links]) => ({
      institution: institutionMap.get(sectorId),
      links: links,
      count: links.length
    }))
    .sort((a, b) => a.institution.name.localeCompare(b.institution.name, 'az'));
}

// Helper: Find sector (level 3) ancestor
function findSectorId(institution: Institution, map: Map): number {
  if (!institution) return 0;
  if (institution.level === 3) return institution.id;
  if (institution.level === 4) return institution.parentId; // School → Sector
  if (institution.level === 2) return institution.id; // Regional → treat as group
  return 0; // Unknown → "Ümumi"
}
```

#### Başlıq (Əlifba) Qruplaşdırması Logic
```typescript
interface GroupedByTitle {
  letter: string;           // "A", "B", "Ə", "İ", ...
  links: Resource[];
  count: number;
}

// Algorithm:
function groupByTitle(links: Resource[]) {
  const groups: Map<string, Resource[]> = new Map();

  // Azerbaijani alphabet order
  const azAlphabet = ['A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F', 'G', 'Ğ', 'H',
                      'X', 'I', 'İ', 'J', 'K', 'Q', 'L', 'M', 'N', 'O', 'Ö',
                      'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'];

  links.forEach(link => {
    const firstChar = link.title.charAt(0).toUpperCase();
    const letter = azAlphabet.includes(firstChar) ? firstChar : '#';

    groups.set(letter, [...(groups.get(letter) || []), link]);
  });

  // Sort within each group by title
  groups.forEach((links, letter) => {
    links.sort((a, b) => a.title.localeCompare(b.title, 'az'));
  });

  // Return in alphabet order
  return azAlphabet
    .filter(letter => groups.has(letter))
    .map(letter => ({
      letter,
      links: groups.get(letter)!,
      count: groups.get(letter)!.length
    }));
}
```

---

## 💻 Implementation Plan

### Phase 1: Backend Enhancements (Optional - əgər lazımsa)

#### 1.1 API Response Grouping (Backend-də qruplama)
**File:** `/backend/app/Services/LinkSharingService.php`

**Əlavə ediləcək method:**
```php
public function getGroupedLinks(Request $request, User $user, string $groupBy = 'sector'): array
{
    // 1. Get filtered links
    $query = $this->buildFilteredQuery($request, $user);
    $links = $query->with(['institution', 'sharedBy'])->get();

    // 2. Group by strategy
    switch ($groupBy) {
        case 'sector':
            return $this->groupBySector($links);
        case 'title':
            return $this->groupByTitle($links);
        case 'link_type':
            return $this->groupByLinkType($links);
        case 'date':
            return $this->groupByDate($links);
        default:
            return ['ungrouped' => $links];
    }
}

private function groupBySector($links): array
{
    $groups = [];

    foreach ($links as $link) {
        $institution = $link->institution;
        $sectorId = $this->findSectorId($institution);
        $sectorName = $this->getSectorName($sectorId);

        if (!isset($groups[$sectorName])) {
            $groups[$sectorName] = [
                'institution' => $institution,
                'links' => [],
                'count' => 0
            ];
        }

        $groups[$sectorName]['links'][] = $link;
        $groups[$sectorName]['count']++;
    }

    // Sort by sector name
    ksort($groups);

    return $groups;
}

private function findSectorId($institution): int
{
    if (!$institution) return 0;

    // Level 3 = Sector
    if ($institution->level === 3) return $institution->id;

    // Level 4 = School → get parent sector
    if ($institution->level === 4) {
        return $institution->parent_id;
    }

    // Level 2 = Regional → treat as sector
    if ($institution->level === 2) return $institution->id;

    return 0; // Unknown
}
```

**Yeni Endpoint:**
```php
// routes/api.php
Route::get('/link-shares/grouped', [LinkShareControllerRefactored::class, 'indexGrouped'])
    ->middleware('auth:sanctum');
```

**Controller method:**
```php
public function indexGrouped(Request $request): JsonResponse
{
    $request->validate([
        'group_by' => 'nullable|string|in:sector,title,link_type,date,none',
        // ... digər filter validations
    ]);

    $user = Auth::user();
    $groupBy = $request->input('group_by', 'sector');

    $result = $this->linkSharingService->getGroupedLinks($request, $user, $groupBy);

    return $this->successResponse($result, 'Qruplaşdırılmış linklər');
}
```

---

### Phase 2: Frontend Implementation

#### 2.1 Grouping State Management
**File:** `/frontend/src/hooks/useResourceGrouping.ts` (YENİ)

```typescript
import { useState, useMemo } from 'react';
import { Resource } from '@/types/resources';
import { Institution } from '@/types/institution';

export type GroupingMode = 'none' | 'sector' | 'title' | 'link_type' | 'date';

interface GroupedResources {
  groupKey: string;
  groupLabel: string;
  resources: Resource[];
  count: number;
  metadata?: {
    institution?: Institution;
    letter?: string;
    linkType?: string;
    date?: string;
  };
}

export function useResourceGrouping(
  resources: Resource[],
  institutions: Institution[],
  mode: GroupingMode = 'none'
) {
  const institutionMap = useMemo(() => {
    const map = new Map<number, Institution>();
    institutions.forEach(inst => map.set(inst.id, inst));
    return map;
  }, [institutions]);

  const groupedResources = useMemo(() => {
    if (mode === 'none') {
      return [{
        groupKey: 'all',
        groupLabel: 'Hamısı',
        resources,
        count: resources.length
      }];
    }

    if (mode === 'sector') {
      return groupBySector(resources, institutionMap);
    }

    if (mode === 'title') {
      return groupByTitle(resources);
    }

    if (mode === 'link_type') {
      return groupByLinkType(resources);
    }

    if (mode === 'date') {
      return groupByDate(resources);
    }

    return [];
  }, [resources, institutionMap, mode]);

  return {
    groupedResources,
    totalGroups: groupedResources.length,
    totalResources: resources.length
  };
}

// Grouping algorithms
function groupBySector(
  resources: Resource[],
  institutionMap: Map<number, Institution>
): GroupedResources[] {
  const groups = new Map<number, Resource[]>();

  resources.forEach(resource => {
    const institutionId = resource.institution_id;
    if (!institutionId) {
      // Ümumi group
      const existing = groups.get(0) || [];
      groups.set(0, [...existing, resource]);
      return;
    }

    const institution = institutionMap.get(institutionId);
    const sectorId = findSectorId(institution, institutionMap);

    const existing = groups.get(sectorId) || [];
    groups.set(sectorId, [...existing, resource]);
  });

  // Convert to array and sort
  return Array.from(groups.entries())
    .map(([sectorId, resources]) => {
      const institution = institutionMap.get(sectorId);
      return {
        groupKey: `sector-${sectorId}`,
        groupLabel: institution?.name || 'Ümumi',
        resources,
        count: resources.length,
        metadata: { institution }
      };
    })
    .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel, 'az'));
}

function findSectorId(
  institution: Institution | undefined,
  institutionMap: Map<number, Institution>
): number {
  if (!institution) return 0;

  // Already a sector
  if (institution.level === 3) return institution.id;

  // School → find parent sector
  if (institution.level === 4 && institution.parent_id) {
    return institution.parent_id;
  }

  // Regional → treat as sector
  if (institution.level === 2) return institution.id;

  return 0;
}

function groupByTitle(resources: Resource[]): GroupedResources[] {
  const azAlphabet = ['A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F', 'G', 'Ğ', 'H',
                      'X', 'I', 'İ', 'J', 'K', 'Q', 'L', 'M', 'N', 'O', 'Ö',
                      'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'];

  const groups = new Map<string, Resource[]>();

  resources.forEach(resource => {
    const firstChar = resource.title.charAt(0).toUpperCase();
    const letter = azAlphabet.includes(firstChar) ? firstChar : '#';

    const existing = groups.get(letter) || [];
    groups.set(letter, [...existing, resource]);
  });

  // Sort within groups
  groups.forEach((resources, letter) => {
    resources.sort((a, b) => a.title.localeCompare(b.title, 'az'));
  });

  // Return in alphabet order
  return azAlphabet
    .filter(letter => groups.has(letter))
    .map(letter => ({
      groupKey: `letter-${letter}`,
      groupLabel: letter,
      resources: groups.get(letter)!,
      count: groups.get(letter)!.length,
      metadata: { letter }
    }));
}

function groupByLinkType(resources: Resource[]): GroupedResources[] {
  const typeLabels: Record<string, string> = {
    external: 'Xarici Linklər',
    video: 'Video',
    form: 'Formalar',
    document: 'Sənədlər'
  };

  const groups = new Map<string, Resource[]>();

  resources.forEach(resource => {
    const type = resource.link_type || 'external';
    const existing = groups.get(type) || [];
    groups.set(type, [...existing, resource]);
  });

  return Array.from(groups.entries())
    .map(([type, resources]) => ({
      groupKey: `type-${type}`,
      groupLabel: typeLabels[type] || type,
      resources,
      count: resources.length,
      metadata: { linkType: type }
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

function groupByDate(resources: Resource[]): GroupedResources[] {
  const groups = new Map<string, Resource[]>();

  resources.forEach(resource => {
    const date = new Date(resource.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('az-AZ', { year: 'numeric', month: 'long' });

    const existing = groups.get(monthKey) || [];
    groups.set(monthKey, [...existing, resource]);
  });

  return Array.from(groups.entries())
    .map(([dateKey, resources]) => {
      const date = new Date(dateKey + '-01');
      return {
        groupKey: `date-${dateKey}`,
        groupLabel: date.toLocaleDateString('az-AZ', { year: 'numeric', month: 'long' }),
        resources,
        count: resources.length,
        metadata: { date: dateKey }
      };
    })
    .sort((a, b) => b.groupKey.localeCompare(a.groupKey)); // Newest first
}
```

---

#### 2.2 Simplified Filter Panel Component
**File:** `/frontend/src/components/resources/LinkFilterPanelMinimalist.tsx` (YENİ)

```typescript
import React, { useState, useMemo } from 'react';
import { Filter, X, Building2, Tag, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export interface MinimalistFilters {
  institution_ids?: number[];  // Multi-select
  link_type?: string;
  status?: string;
}

interface LinkFilterPanelMinimalistProps {
  filters: MinimalistFilters;
  onFiltersChange: (filters: MinimalistFilters) => void;
  availableInstitutions?: Array<{ id: number; name: string }>;
  isOpen: boolean;
  onToggle: () => void;
}

export function LinkFilterPanelMinimalist({
  filters,
  onFiltersChange,
  availableInstitutions = [],
  isOpen,
  onToggle,
}: LinkFilterPanelMinimalistProps) {
  const [institutionSearch, setInstitutionSearch] = useState('');

  const filteredInstitutions = useMemo(() => {
    const query = institutionSearch.toLowerCase().trim();
    if (!query) return availableInstitutions;
    return availableInstitutions.filter(inst =>
      inst.name.toLowerCase().includes(query)
    );
  }, [availableInstitutions, institutionSearch]);

  const updateFilter = <K extends keyof MinimalistFilters>(
    key: K,
    value: MinimalistFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' || value === '' ? undefined : value,
    });
  };

  const toggleInstitution = (institutionId: number) => {
    const current = filters.institution_ids || [];
    const updated = current.includes(institutionId)
      ? current.filter(id => id !== institutionId)
      : [...current, institutionId];

    updateFilter('institution_ids', updated.length > 0 ? updated : undefined);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setInstitutionSearch('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.institution_ids && filters.institution_ids.length > 0) count++;
    if (filters.link_type) count++;
    if (filters.status) count++;
    return count;
  }, [filters]);

  if (!isOpen) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={onToggle}
          className="w-full justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtr</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">Göstər</span>
        </Button>
      </div>
    );
  }

  const selectedInstitutionNames = useMemo(() => {
    if (!filters.institution_ids || filters.institution_ids.length === 0) return [];
    return availableInstitutions
      .filter(inst => filters.institution_ids!.includes(inst.id))
      .map(inst => inst.name);
  }, [filters.institution_ids, availableInstitutions]);

  return (
    <div className="mb-4 border rounded-lg p-4 bg-white shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-gray-900">Filtr</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {activeFilterCount} aktiv
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Təmizlə
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-gray-600"
          >
            Gizlət
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Institution Multi-Select */}
        {availableInstitutions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Müəssisə
            </Label>

            {/* Search */}
            <Input
              placeholder="Müəssisə adı ilə axtar..."
              value={institutionSearch}
              onChange={(e) => setInstitutionSearch(e.target.value)}
              className="h-9"
            />

            {/* Institution List */}
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
              {filteredInstitutions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  Heç nə tapılmadı
                </p>
              ) : (
                filteredInstitutions.map((inst) => (
                  <label
                    key={inst.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.institution_ids?.includes(inst.id) || false}
                      onCheckedChange={() => toggleInstitution(inst.id)}
                    />
                    <span className="text-sm">{inst.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Link Type & Status - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Link Type */}
          <div>
            <Label htmlFor="filter-link-type" className="text-sm font-medium flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              Link Növü
            </Label>
            <Select
              value={filters.link_type || 'all'}
              onValueChange={(val) => updateFilter('link_type', val)}
            >
              <SelectTrigger id="filter-link-type" className="h-9">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="external">Xarici Link</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="document">Sənəd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="filter-status" className="text-sm font-medium flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Status
            </Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(val) => updateFilter('status', val)}
            >
              <SelectTrigger id="filter-status" className="h-9">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="expired">Müddəti bitmiş</SelectItem>
                <SelectItem value="disabled">Deaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="pt-3 border-t space-y-2">
          <Label className="text-xs text-gray-600 font-medium">Aktiv filtrlər:</Label>
          <div className="flex flex-wrap gap-2">
            {filters.institution_ids && filters.institution_ids.length > 0 && (
              <div className="space-y-1">
                {selectedInstitutionNames.slice(0, 3).map((name, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {name}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer hover:text-blue-900"
                      onClick={() => {
                        const id = availableInstitutions.find(i => i.name === name)?.id;
                        if (id) toggleInstitution(id);
                      }}
                    />
                  </Badge>
                ))}
                {selectedInstitutionNames.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedInstitutionNames.length - 3} daha
                  </Badge>
                )}
              </div>
            )}

            {filters.link_type && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-50 text-green-700 border border-green-200"
              >
                Növ: {filters.link_type}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:text-green-900"
                  onClick={() => updateFilter('link_type', undefined)}
                />
              </Badge>
            )}

            {filters.status && (
              <Badge
                variant="secondary"
                className="text-xs bg-amber-50 text-amber-700 border border-amber-200"
              >
                Status: {filters.status}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:text-amber-900"
                  onClick={() => updateFilter('status', undefined)}
                />
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

#### 2.3 Grouped Resource Display Component
**File:** `/frontend/src/components/resources/GroupedResourceDisplay.tsx` (YENİ)

```typescript
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Resource } from '@/types/resources';
import { ResourceGrid } from './ResourceGrid';
import { Badge } from '@/components/ui/badge';

interface GroupedResourceDisplayProps {
  groups: Array<{
    groupKey: string;
    groupLabel: string;
    resources: Resource[];
    count: number;
    metadata?: any;
  }>;
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
  institutionDirectory?: Record<number, string>;
  userDirectory?: Record<number, string>;
  defaultExpanded?: boolean;
}

export function GroupedResourceDisplay({
  groups,
  onResourceAction,
  institutionDirectory = {},
  userDirectory = {},
  defaultExpanded = true,
}: GroupedResourceDisplayProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      return new Set(groups.map(g => g.groupKey));
    }
    return new Set();
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groups.map(g => g.groupKey)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">Heç bir link tapılmadı</p>
        <p className="text-sm mt-2">Filterləri dəyişdirin və ya yeni link əlavə edin</p>
      </div>
    );
  }

  // Single group - no grouping UI
  if (groups.length === 1 && groups[0].groupKey === 'all') {
    return (
      <ResourceGrid
        resources={groups[0].resources}
        onResourceAction={onResourceAction}
        institutionDirectory={institutionDirectory}
        userDirectory={userDirectory}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Expand/Collapse All */}
      <div className="flex justify-end gap-2">
        <button
          onClick={expandAll}
          className="text-sm text-primary hover:underline"
        >
          Hamısını aç
        </button>
        <span className="text-gray-400">|</span>
        <button
          onClick={collapseAll}
          className="text-sm text-primary hover:underline"
        >
          Hamısını bağla
        </button>
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.groupKey);

        return (
          <div
            key={group.groupKey}
            className="border rounded-lg overflow-hidden bg-white shadow-sm"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.groupKey)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {group.groupLabel}
                </h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {group.count} link
                </Badge>
              </div>
            </button>

            {/* Group Content */}
            {isExpanded && (
              <div className="p-4">
                <ResourceGrid
                  resources={group.resources}
                  onResourceAction={onResourceAction}
                  institutionDirectory={institutionDirectory}
                  userDirectory={userDirectory}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

#### 2.4 Grouping Toolbar Component
**File:** `/frontend/src/components/resources/ResourceGroupingToolbar.tsx` (YENİ)

```typescript
import React from 'react';
import { Layers, SortAsc } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GroupingMode } from '@/hooks/useResourceGrouping';

interface ResourceGroupingToolbarProps {
  groupingMode: GroupingMode;
  onGroupingModeChange: (mode: GroupingMode) => void;
  sortBy: 'created_at' | 'title';
  sortDirection: 'asc' | 'desc';
  onSortChange: (sortBy: 'created_at' | 'title', direction: 'asc' | 'desc') => void;
}

export function ResourceGroupingToolbar({
  groupingMode,
  onGroupingModeChange,
  sortBy,
  sortDirection,
  onSortChange,
}: ResourceGroupingToolbarProps) {
  const groupingLabels: Record<GroupingMode, string> = {
    none: 'Qruplaşdırma yoxdur',
    sector: 'Sektor üzrə',
    title: 'Başlıq (Əlifba)',
    link_type: 'Link növü',
    date: 'Tarix',
  };

  const sortLabels = {
    created_at_desc: 'Yenidən köhnəyə',
    created_at_asc: 'Köhnədən yeniyə',
    title_asc: 'Başlıq (A-Z)',
    title_desc: 'Başlıq (Z-A)',
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      {/* Grouping Mode */}
      <div className="flex-1">
        <Label htmlFor="grouping-mode" className="text-sm font-medium flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-primary" />
          Qruplaşdırma
        </Label>
        <Select
          value={groupingMode}
          onValueChange={(val) => onGroupingModeChange(val as GroupingMode)}
        >
          <SelectTrigger id="grouping-mode" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupingLabels).map(([mode, label]) => (
              <SelectItem key={mode} value={mode}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort */}
      <div className="flex-1">
        <Label htmlFor="sort" className="text-sm font-medium flex items-center gap-2 mb-2">
          <SortAsc className="h-4 w-4 text-primary" />
          Sıralama
        </Label>
        <Select
          value={`${sortBy}_${sortDirection}`}
          onValueChange={(val) => {
            const [by, dir] = val.split('_') as ['created_at' | 'title', 'asc' | 'desc'];
            onSortChange(by, dir);
          }}
        >
          <SelectTrigger id="sort" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

---

#### 2.5 Update Main Resources Page
**File:** `/frontend/src/pages/Resources.tsx` (MODIFY)

```typescript
// ... existing imports
import { LinkFilterPanelMinimalist, MinimalistFilters } from '@/components/resources/LinkFilterPanelMinimalist';
import { GroupedResourceDisplay } from '@/components/resources/GroupedResourceDisplay';
import { ResourceGroupingToolbar } from '@/components/resources/ResourceGroupingToolbar';
import { useResourceGrouping, GroupingMode } from '@/hooks/useResourceGrouping';

export default function Resources() {
  // ... existing state

  // NEW: Grouping state
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('sector'); // Default: sector grouping

  // NEW: Minimalist filters
  const [minimalistFilters, setMinimalistFilters] = useState<MinimalistFilters>({});

  // ... existing queries for resources and institutions

  // NEW: Apply grouping
  const { groupedResources, totalGroups, totalResources } = useResourceGrouping(
    resources || [],
    remoteInstitutionOptions || [],
    groupingMode
  );

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <ResourceHeader
        canCreateLinks={canCreateLinks}
        canBulkUploadLinks={canBulkUploadLinks}
        onOpenCreateModal={() => setIsResourceModalOpen(true)}
        onOpenBulkUploadModal={() => setIsBulkUploadModalOpen(true)}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList>
          <TabsTrigger value="links">
            <Link className="h-4 w-4 mr-2" />
            Linklər ({tabTotals.links})
          </TabsTrigger>
          {/* ... other tabs */}
        </TabsList>

        <TabsContent value="links">
          {/* NEW: Grouping Toolbar */}
          <ResourceGroupingToolbar
            groupingMode={groupingMode}
            onGroupingModeChange={setGroupingMode}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={(by, dir) => {
              setSortBy(by);
              setSortDirection(dir);
            }}
          />

          {/* NEW: Minimalist Filter */}
          <LinkFilterPanelMinimalist
            filters={minimalistFilters}
            onFiltersChange={setMinimalistFilters}
            availableInstitutions={remoteInstitutionOptions || []}
            isOpen={filterPanelOpen}
            onToggle={toggleFilterPanel}
          />

          {/* NEW: Grouped Display */}
          {isLoadingResources ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-gray-600">Yüklənir...</p>
            </div>
          ) : (
            <GroupedResourceDisplay
              groups={groupedResources}
              onResourceAction={handleResourceAction}
              institutionDirectory={institutionDirectoryMap}
              userDirectory={userDirectoryMap}
              defaultExpanded={groupingMode !== 'none'}
            />
          )}
        </TabsContent>

        {/* ... other tab contents */}
      </Tabs>

      {/* Modals */}
      {/* ... existing modals */}
    </div>
  );
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// tests/useResourceGrouping.test.ts
describe('useResourceGrouping', () => {
  it('groups by sector correctly', () => {
    const resources = [...];
    const institutions = [...];
    const { groupedResources } = useResourceGrouping(resources, institutions, 'sector');

    expect(groupedResources).toHaveLength(3);
    expect(groupedResources[0].groupLabel).toBe('Bakı Sektor 1');
  });

  it('groups by title alphabetically', () => {
    const resources = [
      { title: 'Zəng cədvəli' },
      { title: 'Attestasiya' },
      { title: 'Ə harfi' }
    ];
    const { groupedResources } = useResourceGrouping(resources, [], 'title');

    expect(groupedResources[0].groupLabel).toBe('A');
    expect(groupedResources[1].groupLabel).toBe('Ə');
    expect(groupedResources[2].groupLabel).toBe('Z');
  });
});
```

### Integration Tests
```typescript
// tests/ResourcesPage.integration.test.tsx
describe('Resources Page - Grouping', () => {
  it('displays grouped resources by sector', async () => {
    render(<Resources />);

    // Select sector grouping
    const groupingSelect = screen.getByLabelText('Qruplaşdırma');
    await userEvent.click(groupingSelect);
    await userEvent.click(screen.getByText('Sektor üzrə'));

    // Verify groups displayed
    expect(screen.getByText(/Bakı Sektor 1/)).toBeInTheDocument();
    expect(screen.getByText(/15 link/)).toBeInTheDocument();
  });

  it('filters and groups simultaneously', async () => {
    render(<Resources />);

    // Apply filter
    const filterButton = screen.getByText('Filtr');
    await userEvent.click(filterButton);

    const institutionCheckbox = screen.getByLabelText('1 nömrəli məktəb');
    await userEvent.click(institutionCheckbox);

    // Verify filtered groups
    expect(screen.queryByText('Sumqayıt Sektor 1')).not.toBeInTheDocument();
  });
});
```

---

## 📋 Implementation Checklist

### Backend (Optional - frontend-də də olar)
- [ ] Create `LinkSharingService::getGroupedLinks()` method
- [ ] Add `LinkShareControllerRefactored::indexGrouped()` endpoint
- [ ] Add route `/api/link-shares/grouped`
- [ ] Test grouping algorithms
- [ ] Performance test (1000+ links)

### Frontend (Priority)
- [ ] Create `useResourceGrouping.ts` hook
- [ ] Create `LinkFilterPanelMinimalist.tsx` component
- [ ] Create `GroupedResourceDisplay.tsx` component
- [ ] Create `ResourceGroupingToolbar.tsx` component
- [ ] Update `Resources.tsx` main page
- [ ] Remove old `LinkFilterPanel.tsx` (or keep as backup)
- [ ] Add tests
- [ ] Performance optimization (memoization, virtual scrolling)

### UI/UX
- [ ] Design review: Spacing, colors, typography
- [ ] Responsive design: Mobile grouping UI
- [ ] Accessibility: Keyboard navigation, ARIA labels
- [ ] Loading states: Skeleton loaders
- [ ] Empty states: No results messages

### Documentation
- [ ] Update CLAUDE.md with new components
- [ ] User guide screenshots
- [ ] Developer documentation

---

## ⚡ Performance Considerations

### Frontend Performance
```typescript
// Memoization strategy
const groupedResources = useMemo(() => {
  return groupBySector(resources, institutionMap);
}, [resources, institutionMap, groupingMode]);

// Virtual scrolling for large groups (100+ links per group)
import { useVirtualizer } from '@tanstack/react-virtual';

// Lazy load institution data
const { data: institutions } = useQuery({
  queryKey: ['institutions'],
  queryFn: fetchInstitutions,
  staleTime: 10 * 60 * 1000, // 10 minutes
});
```

### Backend Performance
```php
// Eager load relationships
$links = LinkShare::query()
    ->with(['institution', 'sharedBy', 'accessLogs'])
    ->get();

// Cache institution hierarchy
Cache::remember('institution_hierarchy', 3600, function () {
    return Institution::all()->keyBy('id');
});

// Pagination for large datasets
return $query->paginate(50);
```

---

## 🎯 Success Metrics

### User Experience
- **Task Completion Time:** Find specific link < 30 seconds
- **Grouping Discovery:** 90%+ users discover grouping feature
- **Filter Usage:** 60%+ users apply at least 1 filter
- **Mobile Usability:** 95%+ Lighthouse mobile score

### Technical Performance
- **Grouping Speed:** < 200ms for 500 links
- **Memory Usage:** < 100MB additional heap for grouping
- **Bundle Size:** < 50KB additional JS for grouping
- **API Response:** < 300ms with grouping enabled

### Business Impact
- **Support Tickets:** -40% for "can't find link" issues
- **User Satisfaction:** 4.5/5 average rating
- **Daily Active Usage:** +25% increase

---

## 🚀 Deployment Plan

### Phase 1: Development (Week 1-2)
```bash
Day 1-3: Backend grouping logic (if needed)
Day 4-7: Frontend hooks and minimalist filter
Day 8-10: Grouped display components
Day 11-12: Integration and testing
Day 13-14: Bug fixes and polish
```

### Phase 2: Testing (Week 3)
```bash
Day 1-2: Unit and integration tests
Day 3-4: QA team testing
Day 5-6: Performance testing
Day 7: Security audit
```

### Phase 3: Deployment (Week 4)
```bash
Day 1: Staging deployment
Day 2-3: User acceptance testing
Day 4: Production deployment (gradual rollout)
Day 5-7: Monitoring and hotfixes
```

---

## 📞 Support & Rollback

### Feature Flag
```typescript
// Use feature flag for gradual rollout
const ENABLE_GROUPING = import.meta.env.VITE_ENABLE_GROUPING === 'true';

if (ENABLE_GROUPING) {
  return <GroupedResourceDisplay />;
} else {
  return <ResourceGrid />; // Fallback
}
```

### Rollback Plan
```bash
# If issues detected:
1. Disable feature flag
2. Revert to previous ResourceGrid display
3. Database unchanged (no migrations)
4. No data loss risk
```

---

## ✅ Summary

Bu plan **sektor/başlıq qruplaşdırması** və **minimalist filter**i əhatə edir:

### Əsas Dəyişikliklər
1. ✅ **Sektor Qruplaşdırması** - Institution hierarchy əsasında
2. ✅ **Başlıq Qruplaşdırması** - Azərbaycan əlifbası ilə
3. ✅ **Minimalist Filter** - 3 əsas filter: Müəssisə, Link növü, Status
4. ✅ **Sadə UI** - Collapse/expand groups, easy navigation

### Texniki Yanaşma
- **Frontend-focused** - Backend dəyişikliyi minimal (və ya yoxdur)
- **Progressive Enhancement** - Köhnə sistem işləməyə davam edir
- **Performance Optimized** - Memoization, lazy loading
- **Production Safe** - Feature flag, rollback plan

### Timeline
- **2 həftə** development
- **1 həftə** testing
- **1 həftə** deployment
- **Ümumi: 4 həftə**

**Risk:** Aşağı (frontend-only changes, no DB migrations)
**Impact:** Yüksək (user productivity ↑↑)
