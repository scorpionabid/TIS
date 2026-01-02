# 📊 RESOURCES/LINKS SƏHİFƏSİ TƏKMİLLƏŞDİRMƏ PLANI (V2 - DƏQİQLƏŞDİRİLMİŞ)

**📅 Tarix**: 2025-12-29
**🎯 Məqsəd**: Link Seçimi əsaslı, institution-aware, funksional link idarəetmə sistemi
**📈 Status**: Production Analysis Complete - Focused Plan Ready
**🔄 Versiya**: 2.0 (User requirements refined)

---

## 📋 ƏSAS DEYİŞİKLİKLƏR (v1 → v2)

### v1 Fokus:
- ❌ Ümumi təkmilləşdirmələr (8 sahə)
- ❌ Çox geniş scope
- ❌ Link Selection sadə dizayn

### v2 FOKUS (REFINED):
- ✅ **PRIMARY**: Link Seçimi hissəsi (sol panel + sağ table)
- ✅ **CORE FEATURE**: Başlıq-əsaslı qruplaşdırma və institution details
- ✅ **CRITICAL ACTIONS**: Edit/Delete başlıq səviyyəsində
- ✅ **TABLE VIEW**: Institution breakdown + click status + URL links
- ✅ Əlavə təkmilləşdirmələr (search, analytics, mobile) saxlanılıb

---

## 🎯 ƏSAS REQUİREMENT ANALİZİ

### Database Facts (Yenidən Nəzərdən Keçirilmiş):

**14 Başlıq Breakdown**:
```
1. Məktəb pasportu             354 link  |  1 inst  |  8,024 clicks
2. SWOT təhlil sualları        354 link  |  1 inst  |  1,327 clicks
3. Dərsdinləmə vərəqi onlayn     1 link  |  1 inst  |    891 clicks
4. Gündəlik davamiyyət 2025-26   1 link  |  1 inst  |    759 clicks
5. Gündəlik Davamiyyət qeyd...   1 link  |  1 inst  |    703 clicks
6. E-qanun                       1 link  |  1 inst  |    296 clicks
7. knsd (TEST)                   1 link  |  1 inst  |     18 clicks
8. jjjj (TEST)                   1 link  |  1 inst  |      8 clicks
9. Fcaebook (TYPO)               1 link  |  1 inst  |      2 clicks
10. eüüeeü (TEST)               1 link  |  1 inst  |      1 clicks
11-14. Facebook/face/etc (DUPL)  4 link  |  1 inst  |      0 clicks
```

**Kritik Məlumat**:
- ✅ Bütün linklər eyni institutiondandır: "Şəki Zaqatala RTİ" (id: 2)
- ⚠️ "Məktəb pasportu" 354 link = 354 fərqli URL (hər biri unique Google Sheets link)
- ⚠️ "SWOT təhlil sualları" 354 link = 354 fərqli URL
- ✅ Hər link ayrı `target_institutions` JSON arrayinə sahibdir (hansı məktəblər üçün)
- ✅ `link_access_logs` table-də 12,029 access qeydiyyatı var

**User Story Anlaşılması**:
> İstifadəçi 14 başlıqdan birini seçəndə, həmin başlıq altında **hansı məktəblərə** (target_institutions) link təyin edilibsə onları table-də görməlidir. Hər məktəb üçün:
> - Məktəb adı
> - Link URL-i
> - Açılıb/açılmayıb statusu (click_count > 0)
> - Kliklənmə sayı
> - Redaktə/Sil düymələri

---

## 🏗️ YENİ ARXITEKTURA: 2-PANEL LAYOUT

### Sol Panel: Link Seçimi (Title List)
### Sağ Panel: Institution Breakdown Table

```
┌──────────────────────────────────────────────────────────────────┐
│                       LINKLƏR                                     │
├─────────────────┬────────────────────────────────────────────────┤
│  LINK SEÇİMİ    │  INSTITUTION BREAKDOWN TABLE                   │
│  (Sol Panel)    │  (Sağ Panel - Selected Title Details)         │
├─────────────────┼────────────────────────────────────────────────┤
│                 │                                                 │
│ 🔘 Məktəb       │  ╔══════════════════════════════════════════╗  │
│    pasportu     │  ║ Məktəb pasportu - 354 məktəb             ║  │
│    354 link     │  ║ Total: 8,024 kliklənmə                   ║  │
│    8,024 clicks │  ╚══════════════════════════════════════════╝  │
│    [Edit]       │                                                 │
│    [Delete]     │  ┌─────┬──────────┬────────┬────────┬──────┐  │
│                 │  │ #   │ Məktəb   │ URL    │ Status │ Əməl │  │
│ ○ SWOT təhlil   │  ├─────┼──────────┼────────┼────────┼──────┤  │
│   sualları      │  │ 365 │ Məktəb 1 │ [Aç]   │ ✅ 175 │ [⋮]  │  │
│   354 link      │  │ 186 │ Məktəb 2 │ [Aç]   │ ✅ 162 │ [⋮]  │  │
│   1,327 clicks  │  │ 327 │ Məktəb 3 │ [Aç]   │ ✅ 115 │ [⋮]  │  │
│                 │  │ ... │ ...      │ ...    │ ...    │ ...  │  │
│ ○ Dərsdinləmə   │  │ 50  │ Məktəb N │ [Aç]   │ ❌ 0   │ [⋮]  │  │
│   vərəqi        │  └─────┴──────────┴────────┴────────┴──────┘  │
│   1 link        │                                                 │
│   891 clicks    │  [Export Excel] [Bulk Edit] [Analytics]        │
│                 │                                                 │
│ ○ ...           │                                                 │
│                 │                                                 │
│ [➕ Yeni Link]  │                                                 │
│                 │                                                 │
└─────────────────┴────────────────────────────────────────────────┘
```

---

## 🎨 KOMPONENTƏin DETALLI DİZAYNI

### 1. SOL PANEL: LinkSelectionPanel.tsx

#### 1.1 Component Structure

```tsx
// frontend/src/components/resources/LinkSelectionPanel.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit, Trash2, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { resourceService } from '@/services/resources';
import type { GroupedLink } from '@/utils/linkGrouping';

interface LinkSelectionPanelProps {
  selectedTitle: string | null;
  onSelectTitle: (title: string | null) => void;
  onEditGroup: (group: GroupedLink) => void;
  onDeleteGroup: (group: GroupedLink) => void;
  onCreateNew: () => void;
}

export function LinkSelectionPanel({
  selectedTitle,
  onSelectTitle,
  onEditGroup,
  onDeleteGroup,
  onCreateNew,
}: LinkSelectionPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch grouped links
  const { data: groupedLinks, isLoading } = useQuery({
    queryKey: ['grouped-links'],
    queryFn: async () => {
      const response = await resourceService.getLinksPaginated({ per_page: 1000 });
      return groupLinksByTitle(response.data);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Filter by search
  const filteredGroups = groupedLinks?.filter(group =>
    group.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Helper functions
  const isTestData = (title: string) => {
    const testPatterns = ['jjjj', 'knsd', 'eüüeeü', 'test link'];
    return testPatterns.some(pattern =>
      title.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  const isDuplicate = (title: string) => {
    const duplicatePatterns = ['facebook', 'face', 'fcaebook'];
    return duplicatePatterns.some(pattern =>
      title.toLowerCase() === pattern.toLowerCase()
    );
  };

  const getGroupBadgeVariant = (group: GroupedLink) => {
    if (isTestData(group.title)) return 'warning';
    if (isDuplicate(group.title)) return 'secondary';
    if (group.total_count > 100) return 'success';
    return 'default';
  };

  const getGroupIcon = (group: GroupedLink) => {
    if (group.total_count > 100) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    if (isTestData(group.title)) {
      return <AlertCircle className="h-4 w-4 text-amber-600" />;
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 space-y-3">
        <CardTitle className="text-lg font-semibold">
          Link Seçimi
          <Badge variant="outline" className="ml-2">
            {filteredGroups.length} başlıq
          </Badge>
        </CardTitle>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Başlıq axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-muted-foreground">Cəmi Link</div>
            <div className="text-lg font-semibold">
              {groupedLinks?.reduce((sum, g) => sum + g.total_count, 0) || 0}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-muted-foreground">Kliklənmə</div>
            <div className="text-lg font-semibold">
              {groupedLinks?.reduce((sum, g) =>
                sum + g.links.reduce((s, l) => s + (l.click_count || 0), 0), 0
              ) || 0}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Link Groups List */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm ? 'Nəticə tapılmadı' : 'Link mövcud deyil'}
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredGroups.map((group) => {
                const isActive = selectedTitle === group.title;
                const totalClicks = group.links.reduce(
                  (sum, link) => sum + (link.click_count || 0),
                  0
                );

                return (
                  <button
                    key={group.title}
                    type="button"
                    onClick={() => onSelectTitle(isActive ? null : group.title)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-all',
                      'hover:border-primary/50 hover:shadow-sm',
                      isActive && 'border-primary bg-primary/5 shadow-sm'
                    )}
                  >
                    {/* Title Row */}
                    <div className="flex items-start gap-2">
                      {getGroupIcon(group)}
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          'font-medium truncate',
                          isActive && 'text-primary'
                        )}>
                          {group.title}
                        </h4>
                      </div>
                      <Badge variant={getGroupBadgeVariant(group)} className="text-xs">
                        {group.total_count}
                      </Badge>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        {group.total_count} link
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {totalClicks} kliklənmə
                      </span>
                    </div>

                    {/* Warning Badges */}
                    {(isTestData(group.title) || isDuplicate(group.title)) && (
                      <div className="flex gap-2 mt-2">
                        {isTestData(group.title) && (
                          <Badge variant="warning" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Test data
                          </Badge>
                        )}
                        {isDuplicate(group.title) && (
                          <Badge variant="secondary" className="text-xs">
                            Dublikat
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action Buttons (Show on Hover/Active) */}
                    {isActive && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditGroup(group);
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Redaktə
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteGroup(group);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Sil ({group.total_count})
                        </Button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Footer: Create New Link Button */}
      <div className="p-4 border-t">
        <Button
          className="w-full"
          onClick={onCreateNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Link Yarat
        </Button>
      </div>
    </Card>
  );
}
```

#### 1.2 Features Breakdown

**Sol Panel Xüsusiyyətləri**:
- ✅ **14 başlıq siyahısı** (alfabetik və ya popularity sırası)
- ✅ **Axtarış** (real-time filter)
- ✅ **Badge indicators**:
  - Test data warning (amber)
  - Duplicate indicator (gray)
  - Popular badge (green) - 100+ links
  - Link count badge
- ✅ **Quick stats**: Total links + Total clicks
- ✅ **Active state**: Seçilmiş başlıq highlight olunur
- ✅ **Edit/Delete buttons**: Yalnız seçilmiş başlıqda göstərilir
- ✅ **Virtual scrolling**: 14+ başlıq olsa performanslı
- ✅ **Create new**: Alt hissədə "+ Yeni Link Yarat" button

---

### 2. SAĞ PANEL: InstitutionBreakdownTable.tsx

#### 2.1 Component Structure

```tsx
// frontend/src/components/resources/InstitutionBreakdownTable.tsx

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ExternalLink,
  Copy,
  MoreVertical,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVirtualizer } from '@tanstack/react-virtual';
import { resourceService } from '@/services/resources';
import { useToast } from '@/hooks/use-toast';

interface InstitutionBreakdownTableProps {
  selectedTitle: string;
  onEditLink: (link: Resource) => void;
  onDeleteLink: (link: Resource) => void;
}

export function InstitutionBreakdownTable({
  selectedTitle,
  onEditLink,
  onDeleteLink,
}: InstitutionBreakdownTableProps) {
  const { toast } = useToast();
  const [sortColumn, setSortColumn] = useState<'institution' | 'clicks'>('clicks');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch links for selected title
  const { data: linksData, isLoading } = useQuery({
    queryKey: ['link-institutions', selectedTitle],
    queryFn: async () => {
      const response = await resourceService.getLinksPaginated({
        per_page: 500,
        search: selectedTitle,
      });
      return response.data.filter(link => link.title === selectedTitle);
    },
    enabled: !!selectedTitle,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch target institutions for each link
  const { data: institutionsData } = useQuery({
    queryKey: ['link-target-institutions', selectedTitle],
    queryFn: async () => {
      if (!linksData || linksData.length === 0) return [];

      // Fetch sharing overview to get institution breakdown
      const overview = await resourceService.getGroupedLinkSharingOverview(selectedTitle);
      return overview?.institutions || [];
    },
    enabled: !!linksData && linksData.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Prepare table rows
  const tableRows = useMemo(() => {
    if (!linksData || !institutionsData) return [];

    // Combine link data with institution data
    const rows = linksData.map(link => {
      // Find target institutions for this specific link
      const targetInsts = link.target_institutions || [];
      const institutionNames = institutionsData
        .filter(inst => targetInsts.includes(inst.id))
        .map(inst => inst.name)
        .join(', ') || 'Bütün institutionlar';

      return {
        id: link.id,
        link: link,
        institution_names: institutionNames,
        url: link.url,
        click_count: link.click_count || 0,
        status: link.status,
        created_at: link.created_at,
        is_clicked: (link.click_count || 0) > 0,
      };
    });

    // Sort rows
    rows.sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'institution') {
        comparison = a.institution_names.localeCompare(b.institution_names, 'az');
      } else if (sortColumn === 'clicks') {
        comparison = a.click_count - b.click_count;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return rows;
  }, [linksData, institutionsData, sortColumn, sortDirection]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = tableRows.length;
    const clicked = tableRows.filter(row => row.is_clicked).length;
    const notClicked = total - clicked;
    const totalClicks = tableRows.reduce((sum, row) => sum + row.click_count, 0);
    const avgClicks = total > 0 ? (totalClicks / total).toFixed(1) : '0';

    return { total, clicked, notClicked, totalClicks, avgClicks };
  }, [tableRows]);

  // Virtual scrolling setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  // Helper functions
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'URL kopyalandı',
      description: 'Link URL buferə kopyalandı',
    });
  };

  const handleToggleSort = (column: 'institution' | 'clicks') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleExportExcel = async () => {
    // Export table data to Excel
    const blob = await exportToExcel(tableRows, selectedTitle);
    downloadBlob(blob, `${selectedTitle}_institutions.xlsx`);
    toast({
      title: 'Excel yükləndi',
      description: `${tableRows.length} sətir Excel faylına ixrac edildi`,
    });
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header with Stats */}
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {selectedTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.total} məktəb • {stats.totalClicks} kliklənmə
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Cəmi</div>
            <div className="text-xl font-semibold">{stats.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-700">Açılıb</div>
            <div className="text-xl font-semibold text-green-900">
              {stats.clicked}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-red-700">Açılmayıb</div>
            <div className="text-xl font-semibold text-red-900">
              {stats.notClicked}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-700">Orta</div>
            <div className="text-xl font-semibold text-blue-900">
              {stats.avgClicks}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Table */}
      <CardContent className="flex-1 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tableRows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Bu başlıq altında link tapılmadı
          </div>
        ) : (
          <div ref={parentRef} className="h-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleToggleSort('institution')}
                  >
                    Məktəb
                    {sortColumn === 'institution' && (
                      <span className="ml-2">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-[120px]">URL</TableHead>
                  <TableHead
                    className="w-[100px] cursor-pointer hover:bg-muted/50"
                    onClick={() => handleToggleSort('clicks')}
                  >
                    Status
                    {sortColumn === 'clicks' && (
                      <span className="ml-2">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-[120px]">Kliklənmə</TableHead>
                  <TableHead className="w-[80px] text-right">Əməl</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = tableRows[virtualRow.index];
                  return (
                    <TableRow
                      key={row.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className={cn(
                        'transition-colors',
                        !row.is_clicked && 'bg-red-50/30'
                      )}
                    >
                      {/* Row Number */}
                      <TableCell className="text-sm text-muted-foreground">
                        {virtualRow.index + 1}
                      </TableCell>

                      {/* Institution Name */}
                      <TableCell>
                        <div className="font-medium text-sm truncate max-w-xs">
                          {row.institution_names}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          #{row.id}
                        </div>
                      </TableCell>

                      {/* URL Quick Action */}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                          >
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Aç
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopyUrl(row.url)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        {row.is_clicked ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Açılıb
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Açılmayıb
                          </Badge>
                        )}
                      </TableCell>

                      {/* Click Count */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{row.click_count}</span>
                          {row.click_count > 50 && (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => window.open(row.url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Linki aç
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyUrl(row.url)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              URL kopyala
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onEditLink(row.link)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Redaktə et
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDeleteLink(row.link)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 2.2 Features Breakdown

**Sağ Panel (Table) Xüsusiyyətləri**:
- ✅ **Header with stats**:
  - Cəmi məktəb sayı
  - Açılmış linklərin sayı
  - Açılmamış linklərin sayı
  - Orta kliklənmə
- ✅ **Sortable columns**:
  - Məktəb adı (A-Z)
  - Kliklənmə sayı (0-∞)
- ✅ **Table columns**:
  1. `#` - Row number
  2. `Məktəb` - Institution name + Link ID
  3. `URL` - [Aç] button + Copy button
  4. `Status` - ✅ Açılıb / ❌ Açılmayıb badge
  5. `Kliklənmə` - Click count (bold if >50)
  6. `Əməl` - Actions dropdown
- ✅ **Visual indicators**:
  - Açılmamış linklər qırmızı background
  - Çox kliklənən linklər trend icon
  - Status badges (green/red)
- ✅ **Virtual scrolling**: 354 sətir performanslı
- ✅ **Export to Excel**: Button at top
- ✅ **Row actions**:
  - Linki aç (external link)
  - URL kopyala
  - Redaktə et
  - Sil

---

### 3. MAIN PAGE: LinksPage.tsx (Refactored)

#### 3.1 Updated Component

```tsx
// frontend/src/pages/resources/LinksPage.tsx (Refactored)

import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { LinkSelectionPanel } from '@/components/resources/LinkSelectionPanel';
import { InstitutionBreakdownTable } from '@/components/resources/InstitutionBreakdownTable';
import { ResourceModal } from '@/components/modals/ResourceModal';
import { LinkBulkUploadModal } from '@/components/resources/LinkBulkUploadModal';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { resourceService } from '@/services/resources';
import type { Resource } from '@/types/resources';
import type { GroupedLink } from '@/utils/linkGrouping';

export default function LinksPage() {
  const { currentUser } = useRoleCheck();
  const linksAccess = useModuleAccess('links');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAuthenticated = !!currentUser;
  const canViewLinks = linksAccess.canView;
  const canCreateLinks = linksAccess.canCreate;

  // State
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [linkBeingEdited, setLinkBeingEdited] = useState<Resource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupedLink | null>(null);

  // Handlers
  const handleSelectTitle = useCallback((title: string | null) => {
    setSelectedTitle(title);
  }, []);

  const handleEditGroup = useCallback((group: GroupedLink) => {
    // Open edit modal for group (batch edit)
    toast({
      title: 'Qrup redaktəsi',
      description: `"${group.title}" başlığı altındakı ${group.total_count} link redaktə ediləcək`,
    });
    // TODO: Implement batch edit modal
  }, [toast]);

  const handleDeleteGroup = useCallback((group: GroupedLink) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDeleteGroup = useCallback(async () => {
    if (!groupToDelete) return;

    try {
      // Delete all links in the group
      await Promise.all(
        groupToDelete.links.map(link =>
          resourceService.delete(link.id, 'link')
        )
      );

      toast({
        title: 'Linklər silindi',
        description: `"${groupToDelete.title}" başlığı altındakı ${groupToDelete.total_count} link silindi`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['grouped-links'] });
      queryClient.invalidateQueries({ queryKey: ['link-institutions'] });

      // Clear selection
      setSelectedTitle(null);
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error?.message || 'Linklər silinə bilmədi',
        variant: 'destructive',
      });
    }
  }, [groupToDelete, queryClient, toast]);

  const handleCreateNew = useCallback(() => {
    setLinkBeingEdited(null);
    setIsLinkModalOpen(true);
  }, []);

  const handleEditLink = useCallback(async (link: Resource) => {
    try {
      const detailedLink = await resourceService.getLinkById(link.id);
      setLinkBeingEdited(detailedLink);
      setIsLinkModalOpen(true);
    } catch (error: any) {
      toast({
        title: 'Link yüklənə bilmədi',
        description: error?.message || 'Xəta baş verdi',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleDeleteLink = useCallback(async (link: Resource) => {
    if (!confirm(`"${link.title}" linkini silmək istədiyinizdən əminsiniz?`)) {
      return;
    }

    try {
      await resourceService.delete(link.id, 'link');
      toast({
        title: 'Link silindi',
        description: 'Link uğurla silindi',
      });
      queryClient.invalidateQueries({ queryKey: ['link-institutions', selectedTitle] });
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error?.message || 'Link silinə bilmədi',
        variant: 'destructive',
      });
    }
  }, [selectedTitle, queryClient, toast]);

  const handleAfterResourceSaved = useCallback(
    (resource: Resource, isEditing: boolean) => {
      toast({
        title: isEditing ? 'Link yeniləndi' : 'Link yaradıldı',
        description: isEditing ? 'Link məlumatları yeniləndi' : 'Link uğurla yaradıldı',
      });
      queryClient.invalidateQueries({ queryKey: ['grouped-links'] });
      queryClient.invalidateQueries({ queryKey: ['link-institutions'] });
      setLinkBeingEdited(null);
      setIsLinkModalOpen(false);
    },
    [queryClient, toast]
  );

  // Auth checks
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş tələb olunur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə daxil olmaq üçün sistemə giriş etməlisiniz
          </p>
        </div>
      </div>
    );
  }

  if (!canViewLinks) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu bölmədən istifadə etmək üçün səlahiyyətiniz yoxdur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Linklər</h1>
            <p className="text-sm text-muted-foreground">
              Link başlıqlarına görə məktəb paylanmasını görün və idarə edin
            </p>
          </div>
          {canCreateLinks && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsBulkUploadModalOpen(true)}
              >
                Kütləvi Yükləmə
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: 2-Column Layout */}
      <div className="flex-1 grid grid-cols-[320px_1fr] gap-4 p-4 overflow-hidden">
        {/* Left: Link Selection Panel */}
        <LinkSelectionPanel
          selectedTitle={selectedTitle}
          onSelectTitle={handleSelectTitle}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
          onCreateNew={handleCreateNew}
        />

        {/* Right: Institution Breakdown Table */}
        {selectedTitle ? (
          <InstitutionBreakdownTable
            selectedTitle={selectedTitle}
            onEditLink={handleEditLink}
            onDeleteLink={handleDeleteLink}
          />
        ) : (
          <div className="flex items-center justify-center border-2 border-dashed rounded-lg">
            <div className="text-center text-muted-foreground">
              <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Link başlığı seçin</p>
              <p className="text-sm">
                Sol paneldən başlıq seçərək məktəb paylanmasını görün
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ResourceModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setLinkBeingEdited(null);
        }}
        resourceType="link"
        resource={linkBeingEdited}
        mode={linkBeingEdited ? 'edit' : 'create'}
        onResourceSaved={(res) => handleAfterResourceSaved(res, !!linkBeingEdited)}
        lockedTab="links"
      />

      <LinkBulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onSuccess={(result) => {
          toast({
            title: 'Kütləvi yükləmə tamamlandı',
            description: `Yaradılan: ${result.created}, Uğursuz: ${result.failed}`,
          });
          queryClient.invalidateQueries({ queryKey: ['grouped-links'] });
          setIsBulkUploadModalOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDeleteGroup}
        title={`"${groupToDelete?.title}" linkini sil`}
        description={`Bu əməliyyat ${groupToDelete?.total_count} linki silə biləcək. Davam etmək istədiyinizdən əminsiniz?`}
        confirmText="Bəli, sil"
        isDestructive
      />
    </div>
  );
}
```

---

## 🔧 BACKEND API ENDPOİNTLƏRİ (Yeni/Yenilənmiş)

### Yeni Endpoint: Grouped Sharing Overview

```php
// backend/app/Http/Controllers/LinkShareControllerRefactored.php

/**
 * Get merged sharing overview for all links with the same title
 *
 * Used for showing institution breakdown in the table view
 * Example: "Məktəb pasportu" with 354 links → merged institution list
 */
public function groupedSharingOverview(Request $request): JsonResponse
{
    return $this->executeWithErrorHandling(function () use ($request) {
        $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $title = $request->get('title');

        // Get all links with this title
        $links = LinkShare::where('title', $title)->get();

        if ($links->isEmpty()) {
            return $this->successResponse([
                'institutions' => [],
                'total_count' => 0,
            ], 'No links found');
        }

        // Merge target_institutions from all links
        $allInstitutionIds = collect();
        foreach ($links as $link) {
            $targets = json_decode($link->target_institutions, true) ?? [];
            $allInstitutionIds = $allInstitutionIds->merge($targets);
        }

        // Get unique institution IDs
        $uniqueInstitutionIds = $allInstitutionIds->unique()->values();

        // Fetch institution details
        $institutions = Institution::whereIn('id', $uniqueInstitutionIds)
            ->select('id', 'name', 'code')
            ->orderBy('name', 'asc')
            ->get();

        // For each institution, find which link is assigned and click stats
        $institutionData = $institutions->map(function ($inst) use ($links) {
            // Find link that targets this institution
            $linkForInst = $links->first(function ($link) use ($inst) {
                $targets = json_decode($link->target_institutions, true) ?? [];
                return in_array($inst->id, $targets);
            });

            return [
                'id' => $inst->id,
                'name' => $inst->name,
                'code' => $inst->code,
                'link_id' => $linkForInst?->id,
                'url' => $linkForInst?->url,
                'click_count' => $linkForInst?->click_count ?? 0,
                'is_clicked' => ($linkForInst?->click_count ?? 0) > 0,
                'status' => $linkForInst?->status ?? 'unknown',
            ];
        });

        return $this->successResponse([
            'institutions' => $institutionData,
            'total_count' => $institutionData->count(),
            'total_links' => $links->count(),
            'total_clicks' => $links->sum('click_count'),
        ], 'Qrup link paylaşım xülasəsi uğurla alındı');

    }, 'linkshare.grouped_sharing_overview');
}
```

### Backend Routes

```php
// backend/routes/api.php

Route::middleware(['auth:sanctum'])->group(function () {
    Route::prefix('links')->group(function () {
        // Existing routes...

        // NEW: Grouped sharing overview
        Route::get('/grouped-sharing-overview', [
            LinkShareControllerRefactored::class,
            'groupedSharingOverview'
        ]);

        // NEW: Bulk delete by title
        Route::delete('/bulk-delete-by-title', [
            LinkShareControllerRefactored::class,
            'bulkDeleteByTitle'
        ]);
    });
});
```

---

## 📅 İMPLEMENTASİYA TƏQVİMİ (YENİLƏNMİŞ)

### Phase 1: Core Link Selection System (1 həftə)

**Day 1-2: Backend Preparation**
- ✅ `groupedSharingOverview` endpoint
- ✅ `bulkDeleteByTitle` endpoint
- ✅ Database query optimizations
- ✅ API tests

**Day 3-4: Link Selection Panel**
- ✅ LinkSelectionPanel component
- ✅ Search functionality
- ✅ Badge indicators (test/duplicate/popular)
- ✅ Edit/Delete buttons (group-level)

**Day 5-7: Institution Breakdown Table**
- ✅ InstitutionBreakdownTable component
- ✅ Virtual scrolling (354 rows)
- ✅ Sortable columns
- ✅ Status badges
- ✅ Row actions (edit/delete individual links)
- ✅ Excel export

**Deliverables**:
- ✅ Working 2-panel layout
- ✅ 14 başlıq siyahısı
- ✅ Məktəb breakdown table
- ✅ Edit/Delete functionality

---

### Phase 2: Enhanced Features (3-4 gün)

**Day 1: Data Cleanup**
- ✅ Test data removal script
- ✅ Duplicate merge tool (UI)
- ✅ Execute cleanup

**Day 2-3: Search & Advanced Filters**
- ✅ Global search (both panels)
- ✅ Quick filters (Son 7 gün, Populyar, etc.)
- ✅ Advanced filter panel (collapsible)
- ✅ Filter persistence (URL params)

**Day 4: Analytics Mini Dashboard**
- ✅ Stats cards (top of table)
- ✅ Click trends (mini chart)
- ✅ Export to Excel

**Deliverables**:
- ✅ Clean database
- ✅ Advanced search/filter
- ✅ Basic analytics

---

### Phase 3: Mobile & Polish (2-3 gün)

**Day 1-2: Mobile Responsiveness**
- ✅ Mobile-optimized panels (stack vertically)
- ✅ Touch-friendly buttons
- ✅ Swipeable table rows

**Day 3: Testing & Bug Fixes**
- ✅ E2E testing
- ✅ Performance testing (354 rows)
- ✅ Bug fixes

**Deliverables**:
- ✅ Mobile-ready
- ✅ Tested & stable

---

### Phase 4: Deployment (1 gün)

**Day 1: Production Deployment**
- ✅ Production database backup
- ✅ Deploy backend changes
- ✅ Deploy frontend changes
- ✅ Smoke testing
- ✅ User training materials

**Deliverables**:
- ✅ Production-ready
- ✅ Documentation

---

## 🎯 TOPLAM TƏXMINI

| Faza | Müddət | Developer | Tərtib |
|------|--------|-----------|---------|
| Phase 1: Core System | 1 həftə | 1 full-stack | CRITICAL |
| Phase 2: Enhanced | 3-4 gün | 1 full-stack | HIGH |
| Phase 3: Mobile | 2-3 gün | 1 frontend | MEDIUM |
| Phase 4: Deployment | 1 gün | 1 devops | CRITICAL |
| **TOTAL** | **2-2.5 həftə** | | |

---

## ✅ SUCCESS CRITERIA

### Functional Requirements

**Link Seçimi (Sol Panel)**:
- ✅ 14 başlıq siyahısı göstərilir
- ✅ Başlıq seçimi aktiv highlight olunur
- ✅ Axtarış işləyir (real-time)
- ✅ Test/Duplicate badge indicators
- ✅ Edit button (başlıq səviyyəsində)
- ✅ Delete button (bütün linkləri silir)
- ✅ "+ Yeni Link" button

**Institution Breakdown (Sağ Panel)**:
- ✅ Seçilmiş başlıq üçün məktəb siyahısı
- ✅ Table columns: #, Məktəb, URL, Status, Kliklənmə, Əməl
- ✅ Açılıb/Açılmayıb status badges
- ✅ Virtual scrolling (354 sətir performanslı)
- ✅ Sortable columns (məktəb, kliklənmə)
- ✅ Quick actions: Aç, Kopyala, Redaktə, Sil
- ✅ Excel export button
- ✅ Stats cards (Cəmi, Açılıb, Açılmayıb, Orta)

### Performance Requirements

- ✅ Page load time: <2s
- ✅ Search response: <300ms
- ✅ Table render (354 rows): <1s (virtual scroll)
- ✅ Sort operation: <500ms
- ✅ Delete operation: <2s

### UX Requirements

- ✅ Mobile-friendly (stack panels)
- ✅ Keyboard navigation
- ✅ Accessible (ARIA labels)
- ✅ Loading states
- ✅ Error states
- ✅ Empty states

---

## 🚀 QUICK START (1 Gün İçində)

**Step 1: Backend Setup** (2 saat)
```bash
# 1. Create grouped sharing overview endpoint
php artisan make:controller LinkShareControllerRefactored --resource

# 2. Add route
# routes/api.php
Route::get('/links/grouped-sharing-overview', ...);

# 3. Test endpoint
curl http://localhost:8000/api/links/grouped-sharing-overview?title=Məktəb+pasportu
```

**Step 2: Frontend Components** (4 saat)
```bash
# 1. Create components
frontend/src/components/resources/LinkSelectionPanel.tsx
frontend/src/components/resources/InstitutionBreakdownTable.tsx

# 2. Update main page
frontend/src/pages/resources/LinksPage.tsx

# 3. Test locally
npm run dev
```

**Step 3: Test with Real Data** (1 saat)
- Select "Məktəb pasportu" → See 354 institutions
- Click row → Open link
- Delete link → Confirm removal
- Export Excel → Download works

**Total**: 7 saat → **Əsas funksionallıq işləyir!**

---

## 📊 ƏLAVƏ TƏKMİLLƏŞDİRMƏLƏR (v1-dən Saxlanmış)

### 1. Advanced Analytics Dashboard
- Click trends chart (30 gün)
- Top 10 most clicked links
- Institution activity heatmap
- Orphan links detection

### 2. Bulk Operations
- Multi-select links (checkboxes)
- Bulk activate/deactivate
- Bulk export
- Bulk edit modal

### 3. Enhanced Search
- Multi-criteria filter
- Quick filter chips
- Filter persistence
- Active filter display

### 4. Mobile Optimizations
- Swipeable table rows
- Mobile-optimized cards
- Touch-friendly buttons

### 5. Performance
- Code splitting
- React Query optimizations
- Bundle size reduction

*(Bunlar Phase 2-3-də tətbiq olunacaq)*

---

## ⚠️ RISK ANALİZİ

### Risk 1: 354 Sətir Performance
**Likelihood**: MEDIUM | **Impact**: MEDIUM
**Mitigation**:
- Virtual scrolling (@tanstack/react-virtual)
- Pagination fallback
- Performance monitoring

### Risk 2: Delete Əməliyyatı (354 Link Birlikdə)
**Likelihood**: LOW | **Impact**: HIGH
**Mitigation**:
- Confirmation dialog
- Soft delete (status=deleted)
- Backup before delete
- Rollback capability

### Risk 3: User Confusion (New Layout)
**Likelihood**: LOW | **Impact**: MEDIUM
**Mitigation**:
- Tooltips & helper text
- Empty state guidance
- Video tutorial
- Gradual rollout

---

## 📚 DOCUMENTATION

### User Guide
1. **Link Seçimi Necə İşləyir**
   - Sol paneldən başlıq seçin
   - Sağ table-də məktəblər göstərilir
   - Edit/Delete düymələri ilə idarə edin

2. **Açılmamış Linkləri Necə Tapmaq Olar**
   - Table-də qırmızı background satırlar
   - "Açılmayıb" badge-i ilə

3. **Excel Export Necə Edilir**
   - Sağ üst küncdəki "Excel" düyməsi
   - Bütün məktəblər və statuslar yüklənir

### Developer Guide
- Component architecture
- API endpoint documentation
- Database schema
- Testing guide

---

## 🎓 KLÜÇEVİ QƏRARLAR

### Niyə 2-Panel Layout?
- ✅ **Sol panel**: Başlıq seçimi (14 başlıq rahat görünür)
- ✅ **Sağ panel**: Detail view (354 məktəb virtual scroll ilə)
- ✅ Clear separation of concerns
- ✅ Desktop & mobile uyğun

### Niyə Delete Başlıq Səviyyəsində?
- ✅ Test datanı toplu silmək asandır ("jjjj" → delete all)
- ✅ Dublikatları birlikdə təmizləmək ("Facebook" variants)
- ✅ User intent: "Bu başlığın hamısını sil"

### Niyə Virtual Scrolling?
- ✅ 354 sətir DOM-da performance problemi yaradır
- ✅ Virtual scroll yalnız görünən sətirləri render edir
- ✅ @tanstack/react-virtual battle-tested library

### Niyə Grouped Sharing Overview?
- ✅ Hər link üçün API call çox yavaşdır (354 request)
- ✅ Bir endpoint bütün institutions qaytarır
- ✅ Backend-də birləşdirilir (efficient)

---

## 🔥 ÖNCELIKLI ADDIMLAR

1. **İndi et** (Bugün):
   - ✅ Backend endpoint yarat (`groupedSharingOverview`)
   - ✅ LinkSelectionPanel component başla

2. **Sabah et**:
   - ✅ InstitutionBreakdownTable component
   - ✅ Virtual scrolling implement et

3. **3 gün sonra**:
   - ✅ Test data cleanup
   - ✅ Excel export

4. **1 həftə sonra**:
   - ✅ Production deploy
   - ✅ User training

---

**📝 Plan hazırlayan**: Claude Code
**📅 Tarix**: 2025-12-29
**📊 Versiya**: 2.0 (Refined & Focused)
**🎯 Status**: Ready for Implementation

---

## ✅ NÖVBƏTI ADDIMLAR

1. ✅ **Review Plan**: Bu planı təsdiq et
2. ✅ **Create Branch**: `feature/links-selection-panel`
3. ✅ **Start Backend**: Grouped sharing overview endpoint
4. ✅ **Build Frontend**: LinkSelectionPanel component
5. ✅ **Test**: 354 sətir performance test
6. ✅ **Deploy**: Production-ready in 2 weeks

**Sualın var? Başlamağa hazırsan? 🚀**
