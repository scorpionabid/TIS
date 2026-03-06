# Report Table Entry — Data Input Improvements Plan

**Tarix:** 2026-03-03
**Məqsəd:** `EditableTable` komponentinin data daxil etmə təcrübəsini təkmilləşdirmək

---

## Mövcud Vəziyyətin Analizi

`EditableTable.tsx` hazırda güclü əsas funksionallıq təqdim edir:
- Excel-bənzər klaviatura naviqasiyası (Tab, Enter, Arrow, Ctrl+Home/End...)
- 9 sütun tipi (text, number, date, select, boolean, calculated, file, signature, gps)
- TSV paste (Excel/Sheets-dən yapışdırma)
- Formula engine (30+ funksiya)
- Sətir-level submit/approve axını
- Mobile kart görünüşü

**Müəyyən edilmiş çatışmazlıqlar:**

| # | Problem | Təsir |
|---|---------|-------|
| 1 | Boş sətirləri auto-save edir | Server-də boş response yaranır |
| 2 | Rəqəm cəmi yoxdur | İstifadəçi data düzgünlüyünü yoxlaya bilmir |
| 3 | Sətir kopyalama yoxdur | Oxşar data üçün yenidən yazma lazımdır |
| 4 | Fill Down (Ctrl+D) yoxdur | Excel-dəki ən çox istifadə edilən shortcut |
| 5 | Xəta naviqasiyası yoxdur | "3 xəta var" — amma harda? |
| 6 | Sütun genişlikləri eynidir | Rəqəm sütunları text sütunları ilə eyni eni alır |
| 7 | Freeze column yoxdur | Geniş cədvəllərdə ad sütunu itir |

---

## Planlaşdırılan Dəyişikliklər

### 1 — Auto-save Təkmilləşdirməsi

**Fayl:** `frontend/src/components/reporttables/TableEntryCard.tsx`

**Cari kod problemi:**
```ts
// Hal-hazırda: rows.length === 0 yoxlanır, amma boş sətirləri keçmir
useEffect(() => {
  const fullyLocked = responseStatus === 'submitted' && !hasEditableRows;
  if (fullyLocked || !hasUnsaved || rows.length === 0) return;
  const timer = setTimeout(() => saveMutation.mutate(rows), 3_000);
  return () => clearTimeout(timer);
}, [rows, ...]);
```

**Düzəliş:**
```ts
// hasNonEmptyRows: ən azı bir sütunda dəyər olan sətir
const hasNonEmptyRows = useMemo(
  () => rows.some(r =>
    Object.values(r).some(v => v !== null && v !== '' && v !== undefined)
  ),
  [rows]
);

useEffect(() => {
  const fullyLocked = responseStatus === 'submitted' && !hasEditableRows;
  if (fullyLocked || !hasUnsaved || !hasNonEmptyRows) return; // ← dəyişdi
  const timer = setTimeout(() => saveMutation.mutate(rows), 3_000);
  return () => clearTimeout(timer);
}, [rows, responseStatus, hasEditableRows, hasUnsaved, hasNonEmptyRows, saveMutation]);
```

---

### 2 — Cəm Sətiri (Totals Row)

**Fayl:** `frontend/src/components/reporttables/EditableTable.tsx`

**Davranış:**
- Desktop cədvəlin altında `<tfoot>` elementi
- Yalnız `number` və `calculated` tipli sütunlar üçün dəyər göstər
- `number` sütunlar → SUM (doldurulmuş xanaların cəmi)
- `calculated` sütunlar → hesablanmış dəyərlərin SUM-u (string deyilsə)
- Digər sütunlar → boş cell
- Sol xanada "Cəm" label
- Görünmə şərti: `rows.length > 1` VƏ ən azı bir number/calculated sütun var
- Toggle düyməsi: toolbar-da "Statistika" düyməsi (BarChart icon), yalnız uyğun sütunlar olduqda görünür

**İmplementasiya:**
```tsx
// State
const [showTotals, setShowTotals] = useState(false);

// Hesablama
const totals = useMemo(() => {
  const result: Record<string, number | null> = {};
  columns.forEach(col => {
    if (col.type === 'number') {
      const sum = rows.reduce((acc, row) => {
        const v = parseFloat(String(row[col.key] ?? ''));
        return isNaN(v) ? acc : acc + v;
      }, 0);
      result[col.key] = sum;
    } else if (col.type === 'calculated') {
      const sum = rows.reduce((acc, row, rowIdx) => {
        const v = parseFloat(computeCalculatedValue(row, rowIdx, col));
        return isNaN(v) ? acc : acc + v;
      }, 0);
      result[col.key] = sum;
    }
  });
  return result;
}, [rows, columns, computeCalculatedValue]);

const hasNumericColumns = useMemo(
  () => columns.some(c => c.type === 'number' || c.type === 'calculated'),
  [columns]
);

// Render: <tfoot> after <tbody>
// Toggle button: toolbar-da
```

---

### 3 — Sətir Kopyala (Duplicate Row)

**Fayl:** `frontend/src/components/reporttables/EditableTable.tsx`

**Davranış:**
- Hər açıq sətirdə action column-da `Copy2` (Lucide) icon düyməsi
- Kilidlənmiş sətirlərdə (submitted/approved) göstərmə
- Tıklandıqda: həmin sətrin eyni dəyərli kopyasını birbaşa altına əlavə et
- `maxRows` limitini yoxla, artarsa toast.warning

**`DesktopRow` props-una əlavə:**
```tsx
onDuplicate?: (rowIdx: number) => void;
```

**`EditableTable`-da handler:**
```ts
const handleDuplicateRow = useCallback((idx: number) => {
  const current = rows.length > 0 ? rows : [createEmptyRow()];
  if (current.length >= maxRows) {
    toast.warning(`Maksimum ${maxRows} sətir əlavə edilə bilər.`);
    return;
  }
  const copy = { ...current[idx] };
  const newRows = [
    ...current.slice(0, idx + 1),
    copy,
    ...current.slice(idx + 1),
  ];
  onChange(newRows);
}, [rows, maxRows, onChange, createEmptyRow]);
```

---

### 4 — Fill Down (Ctrl+D)

**Fayl:** `frontend/src/components/reporttables/EditableTable.tsx`

**`handleKeyDown`-a əlavə:**
```ts
case 'd':
case 'D':
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (rowIdx > 0) {
      const col = columns[colIdx];
      if (col.type !== 'calculated') {
        const valueAbove = (rows.length > 0 ? rows : [createEmptyRow()])[rowIdx - 1]?.[col.key];
        if (valueAbove !== undefined && valueAbove !== '' && valueAbove !== null) {
          handleCellChange(rowIdx, col.key, String(valueAbove));
        }
      }
    }
  }
  break;
```

**Shortcuts panelə əlavə:**
```tsx
<div className="flex items-center gap-2">
  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Ctrl+D</kbd>
  <span>Yuxarıdakı dəyəri aşağıya kopyala</span>
</div>
```

---

### 5 — Xəta Naviqasiyası (Error Navigation)

**Fayl:** `frontend/src/components/reporttables/EditableTable.tsx`

**`navigateToFirstError` funksiyası:**
```ts
const navigateToFirstError = useCallback(() => {
  for (let rowIdx = 0; rowIdx < displayRows.length; rowIdx++) {
    const errs = rowErrors[rowIdx];
    if (!errs || Object.keys(errs).length === 0) continue;
    const firstColKey = Object.keys(errs)[0];
    const colIdx = columns.findIndex(c => c.key === firstColKey);
    if (colIdx === -1) continue;
    const cell = cellRefs.current[`${rowIdx}-${colIdx}`];
    if (cell) {
      cell.scrollIntoView({ block: 'center', behavior: 'smooth' });
      cell.focus();
      return;
    }
  }
}, [rowErrors, columns, displayRows.length]);
```

**Banner dəyişikliyi:**
```tsx
// Əvvəl: <div>
// İndi: <button onClick={navigateToFirstError}>
<button
  onClick={navigateToFirstError}
  className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full text-left hover:bg-red-100 transition-colors"
>
  <AlertCircle className="h-4 w-4 shrink-0" />
  {errorCount} xanada xəta var — birinciyə keç →
</button>
```

---

### 6 — Sütun Genişliyi Optimallaşdırması

**Fayl:** `frontend/src/components/reporttables/EditableTable.tsx`

**Köməkçi funksiya (component-dən kənarda):**
```ts
function colMinWidth(type: string): string {
  switch (type) {
    case 'number':
    case 'boolean':
    case 'calculated': return 'min-w-[110px]';
    case 'date':       return 'min-w-[140px]';
    case 'select':     return 'min-w-[150px]';
    case 'file':
    case 'signature':  return 'min-w-[180px]';
    case 'gps':        return 'min-w-[170px]';
    default:           return 'min-w-[180px]'; // text
  }
}
```

**İstifadə:** `<th>` elementlərindəki sabit `min-w-[140px]` → `colMinWidth(col.type)` ilə əvəz et.

---

### 7 — İlk Sütunu Sabitlə (Freeze First Column)

**Fayl:** `frontend/src/components/reporttables/EditableTable.tsx`

**State:**
```ts
const [freezeFirstCol, setFreezeFirstCol] = useState(false);
```

**Toggle button** (toolbar-da, yalnız `columns.length > 3` olduqda):
```tsx
{columns.length > 3 && (
  <button
    onClick={() => setFreezeFirstCol(prev => !prev)}
    className={cn(
      'flex items-center gap-1.5 text-xs transition-colors',
      freezeFirstCol ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-500 hover:text-gray-700'
    )}
  >
    <Pin className="h-3.5 w-3.5" />
    {freezeFirstCol ? 'Sabitləni ləğv et' : 'İlk sütunu sabitlə'}
  </button>
)}
```

**CSS tətbiqi:**
- `#` sütunu (row number): həmişə `sticky left-0 z-20 bg-white border-r border-gray-200`
- Birinci data sütunu `freezeFirstCol && 'sticky left-10 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]'`
- Həm `<thead><th>` həm `<tbody><td>` üçün tətbiq edilməlidir
- `<tfoot><td>` üçün də (totals row-a da tətbiq)
- Mobile card view-a tətbiq edilmir

---

## Fayllar Xülasəsi

| Fayl | Dəyişikliklər |
|------|---------------|
| `frontend/src/components/reporttables/TableEntryCard.tsx` | Auto-save fix (1 kiçik) |
| `frontend/src/components/reporttables/EditableTable.tsx` | 6 yenilik |

## İcra Ardıcıllığı (tövsiyə)

1. `TableEntryCard.tsx` — auto-save fix (ən kiçik, müstəqil, risk yoxdur)
2. `EditableTable.tsx` — bu ardıcıllıqla:
   - Sütun genişliyi (1 sətirlik dəyişiklik)
   - Fill Down Ctrl+D (kiçik keyboard case)
   - Xəta naviqasiyası (orta)
   - Sətir kopyala (orta)
   - Cəm sətiri (orta)
   - Freeze first column (ən mürəkkəb)

## Yoxlama Senariləri

| Yenilik | Test |
|---------|------|
| Auto-save | Boş cədvəl aç, 4s gözlə → network request göndərilməməlidir |
| Auto-save | Dəyər daxil et, 4s gözlə → save request göndərilməlidir |
| Totals | 3 sətirdə rəqəm daxil et → cəm aşağıda anında görünür |
| Duplicate | Kopyala düyməsi → eyni dəyərli yeni sətir altında görünür |
| Fill Down | `Ctrl+D` ikinci sətirdə → üstdəki dəyər kopyalanır |
| Error nav | Xətalı xana yarat → banneri klik → həmin xanaya fokuslanır |
| Freeze | Toggle aktiv → geniş cədvəldə sola sürüşdükdə 1-ci sütun sabit qalır |
