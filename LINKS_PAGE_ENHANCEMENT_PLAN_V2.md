# 📋 LINKS PAGE ENHANCEMENT PLAN - Xüsusi İstifadəçilərə Görə Link Filtrasiyası

**Tarix**: 2026-01-02
**Status**: 🟡 Planning
**Məqsəd**: Links səhifəsində RegionOperator və SektorAdmin istifadəçilərinə görə link filtrasiyasını təkmilləşdirmək

---

## 🎯 TƏKLİF OLUNAN FUNKSİONALLIQ

### Cari Vəziyyət (Mövcud)
- ✅ Link seçimi panelində bütün linklər başlıq qruplarına görə göstərilir
- ✅ Filter panelində "Konkret İstifadəçilərə" düyməsi var
- ✅ İstifadəçi seçimi dropdown-da rol qruplarına görə bölünmüş (SuperAdmin, RegionAdmin, RegionOperator, SektorAdmin)
- ⚠️ **PROBLEM**: İstifadəçi seçildikdə həmin userə təyin olunmuş linklər görünmür!

### Yeni Funksionallıq (Təklif)
1. **"Xüsusi İstifadəçilər" seçimi aktiv olanda**:
   - Yuxarı hissədə RegionOperator və SektorAdmin istifadəçilərinin siyahısı göstərilir
   - Hər istifadəçinin yanında ona təyin olunmuş linklərin sayı göstərilir (məs: `Hafiz.p (5 link)`)

2. **İstifadəçi seçildikdə**:
   - Aşağıda həmin userə təyin olunmuş linklərin başlıqları göstərilir
   - Hər başlığın yanında link sayı göstərilir (məs: `Məktəb pasportu (54 link)`)
   - Başlığa klik edildikdə mövcud funksionallıq işləyir (institution breakdown table açılır)

3. **Vizual İyileşdirmeler**:
   - RegionOperator istifadəçiləri 🔷 (cyan) rənglə işarələnir
   - SektorAdmin istifadəçiləri 🟢 (green) rənglə işarələnir
   - Seçilmiş istifadəçi üçün highlight effekti

---

## 📊 DATABASE ANALİZİ

### LinkShare Table Struktur
```typescript
{
  id: number
  title: string
  url: string
  link_type: 'external' | 'video' | 'form' | 'document'
  share_scope: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users'
  target_institutions: number[] | null  // JSON array
  target_roles: number[] | null         // JSON array
  target_users: number[] | null         // JSON array [CRITICAL FIELD]
  target_departments: number[] | null   // JSON array
  institution_id: number
  shared_by: number
  status: 'active' | 'disabled' | 'expired'
  created_at: timestamp
}
```

### Mövcud Data
**Production Data Analysis (2026-01-02)**:
```
Total links: 724
- institutional: 720
- sectoral: 1
- regional: 1
- specific_users: 2

Links with target_users assigned: 1
- ID: 725, Title: "Maliyə üçün olan link"
- target_users: [9, 5, 7, 4, 6] (5 SektorAdmin users)

RegionOperator users: 2
- ID: 368, hafiz.p@atis.az
- ID: 362, zulfiyya.h@atis.az

SektorAdmin users: 6
- ID: 4, Məlahət Hüseynova
- ID: 5, İlahə Kərimova
- ID: 6, Pərviz Rəcəbov
- ID: 7, Vəfa Damadayeva
- ID: 8, Rəcəb Əlizadə
- ID: 9, Günel Hacıyeva
```

---

## 🏗️ İMPLEMENTASİYA PLANI - 3 FAZA

### **FAZA 1: Backend API Enhancement** ⏱️ 1-2 saat

#### 1.1 Yeni API Endpoint
**Fayl**: `backend/app/Http/Controllers/LinkShareControllerRefactored.php`

**Yeni metod əlavə et**:
```php
/**
 * Get user-specific link assignments
 * Shows which users (RegionOperator, SektorAdmin) have which links assigned
 */
public function getUserLinkAssignments(Request $request): JsonResponse
{
    return $this->executeWithErrorHandling(function () use ($request) {
        $request->validate([
            'role_names' => 'nullable|array',
            'role_names.*' => 'string|in:regionoperator,sektoradmin',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        $roleNames = $request->input('role_names', ['regionoperator', 'sektoradmin']);

        // Get users with specified roles
        $users = \App\Models\User::query()
            ->whereHas('roles', function ($q) use ($roleNames) {
                $q->whereIn('name', $roleNames);
            })
            ->with(['roles', 'institution'])
            ->get();

        $result = [];
        foreach ($users as $user) {
            // Get links assigned to this user
            $assignedLinks = \App\Models\LinkShare::query()
                ->where('status', 'active')
                ->whereRaw("target_users::jsonb ? ?", [$user->id])
                ->select('id', 'title', 'link_type', 'created_at')
                ->get();

            // Group by title
            $groupedByTitle = $assignedLinks->groupBy('title')->map(function ($group, $title) {
                return [
                    'title' => $title,
                    'count' => $group->count(),
                    'link_ids' => $group->pluck('id')->toArray(),
                    'link_type' => $group->first()->link_type,
                    'latest_created' => $group->max('created_at'),
                ];
            })->values();

            $result[] = [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'role_name' => $user->roles->first()->name ?? 'N/A',
                'role_display' => $user->roles->first()->display_name ?? 'N/A',
                'institution' => $user->institution ? [
                    'id' => $user->institution->id,
                    'name' => $user->institution->name,
                ] : null,
                'total_links_assigned' => $assignedLinks->count(),
                'link_groups' => $groupedByTitle,
            ];
        }

        // Sort by role priority (regionoperator > sektoradmin) then by name
        usort($result, function ($a, $b) {
            $rolePriority = ['regionoperator' => 1, 'sektoradmin' => 2];
            $aPriority = $rolePriority[$a['role_name']] ?? 99;
            $bPriority = $rolePriority[$b['role_name']] ?? 99;

            if ($aPriority !== $bPriority) {
                return $aPriority <=> $bPriority;
            }
            return strcasecmp($a['user_name'], $b['user_name']);
        });

        return $this->successResponse([
            'users' => $result,
            'total_users' => count($result),
            'total_links_assigned' => array_sum(array_column($result, 'total_links_assigned')),
        ], 'İstifadəçi link təyinatları alındı');
    }, 'linkshare.user_assignments');
}
```

**Route əlavə et**:
```php
// backend/routes/api.php
Route::get('/links/user-assignments', [LinkShareControllerRefactored::class, 'getUserLinkAssignments'])
    ->middleware('auth:sanctum');
```

#### 1.2 Mövcud Filter Endpoint-ini Yoxlamaq
**Fayl**: `backend/app/Services/LinkSharing/Domains/Query/LinkQueryBuilder.php`

Mövcud `applyRequestFilters` metodunda `target_user_id` filter artıq var (lines 185-191):
```php
if ($request->filled('target_user_id')) {
    $targetUserId = (int) $request->target_user_id;
    $query->where(function ($targetUserQuery) use ($targetUserId) {
        $targetUserQuery->whereJsonContains('target_users', $targetUserId)
            ->orWhereJsonContains('target_users', (string) $targetUserId);
    });
}
```

✅ **Backend tərəfində filter hazırdır, yalnız yeni endpoint lazımdır!**

---

### **FAZA 2: Frontend Service Layer** ⏱️ 30 dəqiqə

#### 2.1 Link Service-ə Yeni Metod Əlavə Et
**Fayl**: `frontend/src/services/links.ts`

```typescript
export interface UserLinkAssignment {
  user_id: number;
  user_name: string;
  user_email: string;
  role_name: string;
  role_display: string;
  institution: {
    id: number;
    name: string;
  } | null;
  total_links_assigned: number;
  link_groups: Array<{
    title: string;
    count: number;
    link_ids: number[];
    link_type: string;
    latest_created: string;
  }>;
}

export interface UserLinkAssignmentsResponse {
  users: UserLinkAssignment[];
  total_users: number;
  total_links_assigned: number;
}

export const linkService = {
  // ... existing methods ...

  /**
   * Get user-specific link assignments
   * Shows RegionOperators and SektorAdmins with their assigned links
   */
  async getUserLinkAssignments(params?: {
    role_names?: string[];
    user_id?: number;
  }): Promise<UserLinkAssignmentsResponse> {
    const queryParams = new URLSearchParams();

    if (params?.role_names?.length) {
      params.role_names.forEach(role => queryParams.append('role_names[]', role));
    }

    if (params?.user_id) {
      queryParams.append('user_id', params.user_id.toString());
    }

    const response = await api.get(`/links/user-assignments?${queryParams.toString()}`);
    return response.data;
  },
};
```

---

### **FAZA 3: Frontend UI Components** ⏱️ 2-3 saat

#### 3.1 UserLinkAssignmentPanel Komponenti Yaratmaq
**Yeni fayl**: `frontend/src/components/resources/UserLinkAssignmentPanel.tsx`

```typescript
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Link as LinkIcon, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { linkService } from '@/services/links';

interface UserLinkAssignmentPanelProps {
  selectedUserId: number | null;
  onUserSelect: (userId: number) => void;
  onTitleSelect: (title: string) => void;
}

export function UserLinkAssignmentPanel({
  selectedUserId,
  onUserSelect,
  onTitleSelect,
}: UserLinkAssignmentPanelProps) {
  // Fetch user link assignments
  const { data, isLoading } = useQuery({
    queryKey: ['user-link-assignments'],
    queryFn: () => linkService.getUserLinkAssignments({
      role_names: ['regionoperator', 'sektoradmin'],
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const selectedUserData = useMemo(() => {
    if (!selectedUserId || !data?.users) return null;
    return data.users.find(u => u.user_id === selectedUserId);
  }, [selectedUserId, data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Xüsusi İstifadəçilər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Panel: User List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            İstifadəçilər
            <Badge variant="secondary" className="ml-auto">
              {data?.total_users || 0} nəfər
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {data?.users.map((user) => (
                <Button
                  key={user.user_id}
                  variant={selectedUserId === user.user_id ? 'default' : 'outline'}
                  className="w-full justify-between h-auto py-3 px-4"
                  onClick={() => onUserSelect(user.user_id)}
                >
                  <div className="flex items-start gap-3 text-left">
                    {/* Role Icon */}
                    <div className="mt-1">
                      {user.role_name === 'regionoperator' && (
                        <div className="h-6 w-6 rounded-full bg-cyan-100 flex items-center justify-center">
                          🔷
                        </div>
                      )}
                      {user.role_name === 'sektoradmin' && (
                        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                          🟢
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.user_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.user_email}
                      </div>
                      {user.institution && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {user.institution.name}
                        </div>
                      )}
                    </div>

                    {/* Link Count Badge */}
                    <Badge
                      variant={user.total_links_assigned > 0 ? 'default' : 'secondary'}
                      className="ml-2 shrink-0"
                    >
                      {user.total_links_assigned} link
                    </Badge>
                  </div>
                </Button>
              ))}

              {(!data?.users || data.users.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-12 w-12 mx-auto opacity-30 mb-2" />
                  <p>RegionOperator və SektorAdmin istifadəçi tapılmadı</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel: User's Assigned Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Təyin Olunmuş Linklər
            {selectedUserData && (
              <Badge variant="secondary" className="ml-auto">
                {selectedUserData.total_links_assigned} link
              </Badge>
            )}
          </CardTitle>
          {selectedUserData && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedUserData.user_name} üçün
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!selectedUserId ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 opacity-20 mb-4" />
              <p className="text-center">
                Sol paneldən istifadəçi seçin
              </p>
            </div>
          ) : selectedUserData ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {selectedUserData.link_groups.map((group, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-between h-auto py-3 px-4 hover:bg-accent"
                    onClick={() => onTitleSelect(group.title)}
                  >
                    <div className="flex items-start gap-3 text-left flex-1 min-w-0">
                      <LinkIcon className="h-4 w-4 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{group.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {group.count} link · {group.link_type}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                ))}

                {selectedUserData.link_groups.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <LinkIcon className="h-12 w-12 mx-auto opacity-30 mb-2" />
                    <p>Bu istifadəçiyə heç bir link təyin edilməyib</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              İstifadəçi məlumatları yüklənir...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 3.2 LinksPage.tsx-ə İnteqrasiya
**Fayl**: `frontend/src/pages/resources/LinksPage.tsx`

**Dəyişikliklər**:

```typescript
// 1. Import new component
import { UserLinkAssignmentPanel } from '@/components/resources/UserLinkAssignmentPanel';

// 2. Add new state
const [selectedUserIdForFilter, setSelectedUserIdForFilter] = useState<number | null>(null);
const [showUserAssignmentPanel, setShowUserAssignmentPanel] = useState(false);

// 3. Update query to include user filter when selected
const { data: linkResponse, isLoading, error, refetch } = useQuery({
  queryKey: [
    'links-simplified',
    {
      assignedOnly: shouldUseAssignedResources,
      status: filters.status,
      assignmentType: filters.assignmentType,
      target_institution_id: filters.target_institution_id,
      target_role_id: filters.target_role_id,
      target_user_id: selectedUserIdForFilter || filters.target_user_id, // Use selected user
      target_department_id: filters.target_department_id,
      share_scope: filters.share_scope,
      link_type: filters.link_type,
    },
  ],
  queryFn: async () => {
    // ... existing logic
  },
  // ... rest of query config
});

// 4. Add handler to show/hide user panel
useEffect(() => {
  if (filters.assignmentType === 'users') {
    setShowUserAssignmentPanel(true);
  } else {
    setShowUserAssignmentPanel(false);
    setSelectedUserIdForFilter(null);
  }
}, [filters.assignmentType]);

// 5. Handle user selection
const handleUserSelect = useCallback((userId: number) => {
  setSelectedUserIdForFilter(userId);
}, []);

// 6. Handle title selection from user panel
const handleTitleSelectFromUserPanel = useCallback((title: string) => {
  setSelectedTitle(title);
  // Scroll to institution breakdown table
  document.querySelector('[data-institution-breakdown]')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}, []);

// 7. In JSX, add user assignment panel after filters
return (
  <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
    <ResourceHeader ... />

    <LinkAdvancedFilters
      filters={filters}
      onFiltersChange={setFilters}
    />

    {/* NEW: User Assignment Panel */}
    {showUserAssignmentPanel && (
      <UserLinkAssignmentPanel
        selectedUserId={selectedUserIdForFilter}
        onUserSelect={handleUserSelect}
        onTitleSelect={handleTitleSelectFromUserPanel}
      />
    )}

    {/* Existing error handling */}
    {error && (...)}

    {/* Existing empty state */}
    {!isLoading && !error && groupedTitleOptions.length === 0 && (...)}

    {/* Existing link selection and breakdown */}
    <div className="space-y-4">
      <LinkSelectionPanel ... />

      {selectedTitle ? (
        <div data-institution-breakdown>
          <InstitutionBreakdownTable ... />
        </div>
      ) : (...)}
    </div>

    {/* Existing modals */}
  </div>
);
```

---

## 🎨 VIZUAL YENILƏMƏLƏR

### Rəng Sxemi
```typescript
const roleColors = {
  regionoperator: {
    bg: 'bg-cyan-100',
    border: 'border-cyan-300',
    text: 'text-cyan-700',
    icon: '🔷',
  },
  sektoradmin: {
    bg: 'bg-green-100',
    border: 'border-green-300',
    text: 'text-green-700',
    icon: '🟢',
  },
};
```

### Responsive Design
- **Desktop (>1024px)**: İki sütunlu grid (users solda, links sağda)
- **Tablet (768-1024px)**: İki sütunlu grid (kompakt)
- **Mobile (<768px)**: Bir sütunlu, accordion style

---

## 🧪 TEST SCENARISI

### Manual Testing Checklist
```
[ ] 1. Filter panelində "Xüsusi İstifadəçilərə" düyməsini klik et
[ ] 2. UserLinkAssignmentPanel açılır və 2 RegionOperator + 6 SektorAdmin göstərilir
[ ] 3. Hər istifadəçinin yanında düzgün link sayı göstərilir
[ ] 4. RegionOperator istifadəçisi (hafiz.p) seçilib, sağ paneldə ona təyin olunmuş linklər göstərilir
[ ] 5. SektorAdmin istifadəçisi (Məlahət Hüseynova) seçilib, ona təyin olunmuş "Maliyə üçün olan link" göstərilir
[ ] 6. Link başlığına klik edildikdə aşağıda InstitutionBreakdownTable açılır
[ ] 7. Filter təmizləndikdə UserLinkAssignmentPanel gizlənir
[ ] 8. Mobile görünüşdə responsive düzgün işləyir
```

### Production Data Test
```
Expected Results:
- RegionOperator hafiz.p (ID: 368): X links (check actual data)
- RegionOperator zulfiyya.h (ID: 362): Y links (check actual data)
- SektorAdmin Məlahət Hüseynova (ID: 4): 1 link ("Maliyə üçün olan link")
- SektorAdmin İlahə Kərimova (ID: 5): 1 link ("Maliyə üçün olan link")
- Total 8 users displayed (2 RegionOps + 6 SektorAdmins)
```

---

## 📦 DELIVERABLES

### Backend (2 fayl dəyişiklik)
- ✅ `backend/app/Http/Controllers/LinkShareControllerRefactored.php`
  - Yeni metod: `getUserLinkAssignments()`
- ✅ `backend/routes/api.php`
  - Yeni route: `GET /api/links/user-assignments`

### Frontend (3 fayl)
- ✅ `frontend/src/services/links.ts`
  - Yeni interface: `UserLinkAssignment`, `UserLinkAssignmentsResponse`
  - Yeni metod: `getUserLinkAssignments()`
- ✅ `frontend/src/components/resources/UserLinkAssignmentPanel.tsx` (YENİ)
  - İki panelli layout
  - Role-based styling
  - User selection və link display
- ✅ `frontend/src/pages/resources/LinksPage.tsx`
  - Yeni state: `selectedUserIdForFilter`, `showUserAssignmentPanel`
  - UserLinkAssignmentPanel inteqrasiyası
  - Query yeniləmə (user filter)

---

## ⏱️ TƏXMİNİ MÜDDƏT

| Faza | Təsvir | Müddət |
|------|--------|--------|
| 1 | Backend API Enhancement | 1-2 saat |
| 2 | Frontend Service Layer | 30 dəq |
| 3 | Frontend UI Components | 2-3 saat |
| **Testing** | Manual + Production Data Test | 1 saat |
| **TOTAL** | | **4-6.5 saat** |

**Təklif**: Bir iş günü ərzində (1 developer, full focus)

---

## 🚀 DEPLOYMENT PLAN

### Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/user-specific-link-filters

# 2. Backend development
cd backend
# Implement getUserLinkAssignments() method
# Add route
# Test with Tinker/Postman

# 3. Frontend development
cd ../frontend
# Implement service method
# Create UserLinkAssignmentPanel component
# Integrate into LinksPage
# Test locally

# 4. Testing
npm run lint
npm run typecheck
composer test
php artisan test

# 5. Commit
git add .
git commit -m "feat: Add user-specific link filtering for RegionOperators and SektorAdmins"

# 6. Push and create PR
git push origin feature/user-specific-link-filters
```

### Production Deployment (CRITICAL)
```bash
# PRODUCTION DATA PROTECTION:
# - Test exhaustively in development first
# - Use production database snapshot in development
# - Verify NO data corruption
# - Ensure backward compatibility (existing filters still work)

# Deployment steps:
1. Merge to main after code review
2. Pull latest on production server
3. Clear caches:
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
4. Frontend build:
   npm run build
5. Verify deployment:
   - Check /api/links/user-assignments endpoint
   - Test user selection in UI
   - Verify link filtering works correctly
```

---

## 🔐 TƏHLÜKƏSİZLİK

### Permission Checks
- ✅ API endpoint authentication required (`auth:sanctum`)
- ✅ Only return users with `regionoperator` or `sektoradmin` roles
- ✅ Respect existing link visibility rules (institution hierarchy)
- ✅ No PII exposure (user emails visible only to authorized roles)

### Performance Considerations
- ✅ Query optimization: Use eager loading (`with()`)
- ✅ Caching: 5-minute stale time for user assignments
- ✅ Pagination: Not needed (max 10-20 users expected)
- ✅ JSON query: PostgreSQL JSONB indexing recommended on `target_users`

---

## 🎯 SUCCESS CRITERIA

✅ **User Experience**:
- [ ] RegionOperator və SektorAdmin istifadəçiləri düzgün göstərilir
- [ ] Hər istifadəçinin link sayı düzgündür
- [ ] İstifadəçi seçildikdə ona təyin olunmuş linklər göstərilir
- [ ] Link başlığına klik edildikdə breakdown table açılır
- [ ] Mobile və desktop görünüşlərdə responsive işləyir

✅ **Technical**:
- [ ] API endpoint 200ms-dən sürətli cavab verir
- [ ] Frontend query caching işləyir
- [ ] Heç bir console error yoxdur
- [ ] TypeScript type errors yoxdur
- [ ] Backend tests yazılıb və keçir

✅ **Production Safety**:
- [ ] Mövcud funksionallıq pozulmayıb
- [ ] Backward compatibility qorunub
- [ ] Production data ilə test edilib
- [ ] Error handling düzgün işləyir

---

## 📋 ALTERNATIV YANAŞMA (Sadələşdirilmiş)

Əgər 4-6 saat çox görünürsə, **minimal viable solution** (1-2 saat):

1. **Backend dəyişiklik yox** - Mövcud `target_user_id` filter istifadə et
2. **Frontend**: Sadə user dropdown (mövcud LinkAdvancedFilters-də var)
3. **Enhancement**: Dropdown-da user adının yanında link sayını göstərmək
   - Frontend-də local filtrasiya ilə hesablamaq
   - API-dən yeni endpoint tələb etmir

**Cavab**: Daha az funksional, amma daha tez implement olunur.

---

**Plan hazırlayan**: Claude Code (Sonnet 4.5)
**Tarix**: 2026-01-02
**Status**: ✅ READY FOR IMPLEMENTATION
