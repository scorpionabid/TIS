# 🎯 Filter Panel Location Guide

## Where to Find the Filter Panel

### Visual Layout:

```
┌─────────────────────────────────────────────────────────────┐
│ Resurslar                                    [Yeni Resurs ▼]│
│ Linklər və sənədlərin vahid idarə edilməsi                  │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Resurs axtarın...]                    [Ən yeni      ▼] │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────┬───────────┬───────────┬───────────┐          │
│ │ Ümumi     │ Linklər   │ Sənədlər  │ Folderlər │          │
│ │ Resurslər │           │           │           │          │
│ └───────────┴───────────┴───────────┴───────────┘          │
├─────────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════════╗  │
│ ║  📌 FILTER PANEL BURADADIr (Linklər tab-ında)         ║  │
│ ╠═══════════════════════════════════════════════════════╣  │
│ ║  [🔽 Filtr seçimləri]                            (0)  ║  │
│ ║                                                       ║  │
│ ║  ⬇️ CLICK HERE TO EXPAND ⬇️                           ║  │
│ ║                                                       ║  │
│ ║  When expanded, you'll see:                          ║  │
│ ║  - Link Növü dropdown                                ║  │
│ ║  - Paylaşma Səviyyəsi dropdown                       ║  │
│ ║  - Status dropdown                                   ║  │
│ ║  - Müəssisə dropdown (if applicable)                 ║  │
│ ║  - Başlanğıc tarix (date picker)                     ║  │
│ ║  - Bitmə tarix (date picker)                         ║  │
│ ║  - ☑️ Yalnız mənim linklər                           ║  │
│ ║  - ☑️ Önə çıxanlar                                   ║  │
│ ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 📋 Link List / Resource Grid                        │    │
│ │                                                     │    │
│ │ [Link 1] [Link 2] [Link 3] ...                     │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step: How to See the Filter Panel

### 1️⃣ Navigate to Resources Page
```
http://localhost:3000/resources
```

### 2️⃣ Click on "Linklər" Tab
The filter panel is only visible in:
- ✅ "Hamısı" (All) tab
- ✅ "Linklər" (Links) tab
- ❌ NOT in "Sənədlər" (Documents) tab

### 3️⃣ Look for the Filter Button
```
┌─────────────────────────────────────────┐
│ [📊 Filtr seçimləri]           Badge: 0 │
│                                         │
│ ⬇️ Click this button to expand          │
└─────────────────────────────────────────┘
```

### 4️⃣ Expanded Filter Panel View
```
╔═══════════════════════════════════════════════════════════╗
║ 📊 Filtrlər                          [Təmizlə] [Gizlət]  ║
╠═══════════════════════════════════════════════════════════╣
║ Grid Layout (4 columns on desktop):                      ║
║                                                           ║
║ ┌─────────┬─────────┬─────────┬─────────┐               ║
║ │ Link    │ Paylaşma│ Status  │ Müəssisə│               ║
║ │ Növü    │ Səviyyəsi│         │         │               ║
║ └─────────┴─────────┴─────────┴─────────┘               ║
║                                                           ║
║ ┌─────────┬─────────┐                                    ║
║ │ Başlanğıc│ Bitmə   │                                   ║
║ │ tarix   │ tarix   │                                    ║
║ └─────────┴─────────┘                                    ║
║                                                           ║
║ ──────────────────────────────────────────               ║
║ Sürətli filtrlər:                                        ║
║ ☑️ Yalnız mənim linklər                                  ║
║ ☑️ Önə çıxanlar                                          ║
║                                                           ║
║ ──────────────────────────────────────────               ║
║ Aktiv filtrlər:                                          ║
║ [Növ: video ❌] [Səviyyə: institutional ❌]              ║
╚═══════════════════════════════════════════════════════════╝
```

---

## What the Filter Panel Looks Like (Collapsed)

### Before Clicking:
```
┌────────────────────────────────────────┐
│ [📊] Filtr seçimləri        [Göstər]   │
└────────────────────────────────────────┘
```

### With Active Filters:
```
┌────────────────────────────────────────┐
│ [📊] Filtr seçimləri  🔵 3  [Göstər]   │
└────────────────────────────────────────┘
       ↑ Badge shows number of active filters
```

---

## What the Filter Panel Looks Like (Expanded)

```
╔══════════════════════════════════════════════════════════╗
║ [📊] Filtrlər                🔵 3 aktiv                  ║
║                                                          ║
║                           [❌ Təmizlə] [Gizlət]         ║
║                                                          ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ 🏷️ Link Növü                                       │  ║
║ │ [Hamısı              ▼]                            │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ 🏢 Paylaşma Səviyyəsi                              │  ║
║ │ [Hamısı              ▼]                            │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ Status                                             │  ║
║ │ [Hamısı              ▼]                            │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ 🏢 Müəssisə                                        │  ║
║ │ [Hamısı              ▼]                            │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║ ┌─────────────────────┐  ┌─────────────────────┐       ║
║ │ 📅 Başlanğıc tarix  │  │ 📅 Bitmə tarix      │       ║
║ │ [2025-01-01    ]    │  │ [2025-12-31    ]    │       ║
║ └─────────────────────┘  └─────────────────────┘       ║
║                                                          ║
║ ─────────────────────────────────────────────────       ║
║ Sürətli filtrlər                                        ║
║                                                          ║
║ ☑️ Yalnız mənim linklər                                 ║
║ ☑️ Önə çıxanlar                                         ║
║                                                          ║
║ ─────────────────────────────────────────────────       ║
║ Aktiv filtrlər:                                         ║
║                                                          ║
║ [Növ: video ❌] [Səviyyə: institutional ❌]             ║
║ [Status: active ❌]                                     ║
╚══════════════════════════════════════════════════════════╝
```

---

## Code Location (for developers)

**File:** `frontend/src/pages/Resources.tsx`

**Lines 437-460:**
```typescript
<TabsContent value="all" className="mt-6 space-y-4">
  {/* Filter Panel for All tab */}
  <LinkFilterPanel
    filters={linkFilters}
    onFiltersChange={setLinkFilters}
    isOpen={filterPanelOpen}
    onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
  />
  <ResourceGrid resources={resourcesData} />
</TabsContent>

<TabsContent value="links" className="mt-6 space-y-4">
  {/* Advanced Link Filters */}
  <LinkFilterPanel
    filters={linkFilters}
    onFiltersChange={setLinkFilters}
    isOpen={filterPanelOpen}
    onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
  />
  <ResourceGrid resources={resourcesData.filter(r => r.type === 'link')} />
</TabsContent>
```

---

## Why You Might Not See It

### ❌ Common Issues:

1. **Wrong Tab:**
   - Filter panel ONLY in "Hamısı" and "Linklər" tabs
   - NOT in "Sənədlər" or "Folderlər" tabs

2. **TypeScript Compilation Error:**
   - Check browser console (F12)
   - Run: `npm run typecheck`

3. **Component Import Error:**
   - LinkFilterPanel might not be importing correctly
   - Check: `import { LinkFilterPanel } from "@/components/resources/LinkFilterPanel"`

4. **CSS Issue:**
   - Panel might be rendering but invisible
   - Check browser DevTools → Inspect element

5. **React State Issue:**
   - Panel might be stuck in collapsed state
   - Try setting `const [filterPanelOpen, setFilterPanelOpen] = useState(true);`
     to default to OPEN state

---

## Testing Visibility

### Quick Test:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `document.querySelector('[data-testid="link-filter-panel"]')`
   - If null → Component not rendering
   - If element → Component exists, might be styling issue

### Manual Inspection:
1. Right-click on the page near where filter should be
2. Select "Inspect Element"
3. Look for `<div class="mb-4 border rounded-lg p-4 bg-gray-50 space-y-4">`
4. This is the expanded filter panel container

---

## Default State Recommendation

To make the filter panel MORE visible on first use, consider changing:

**File:** `frontend/src/pages/Resources.tsx`
**Line 68:**

```typescript
// Current (collapsed by default):
const [filterPanelOpen, setFilterPanelOpen] = useState(false);

// Recommended (expanded by default for better visibility):
const [filterPanelOpen, setFilterPanelOpen] = useState(true);
```

This will make the filter panel **open by default** when users first visit the page, making it immediately visible and discoverable.

---

## Summary

✅ **Filter panel is located:**
- Inside "Hamısı" (All) tab
- Inside "Linklər" (Links) tab
- Between the tab triggers and the resource grid
- Collapsible with a button at top

✅ **To see it:**
1. Navigate to Resources page
2. Click "Linklər" tab
3. Look for "Filtr seçimləri" button
4. Click to expand

✅ **If not visible:**
- Check browser console for errors
- Verify you're on correct tab
- Check if component is rendering (DevTools)
- Consider defaulting to open state

**The filter panel is implemented and ready to use! 🎉**
