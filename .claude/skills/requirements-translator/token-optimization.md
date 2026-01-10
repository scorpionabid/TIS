# Token Optimization Strategies

Bu fayl requirements-translator skill-in **minimal token istifadə edərək maksimum məlumat əldə etmə** strategiyalarını izah edir.

---

## 🎯 Əsas Prinsip: Progressive Discovery

**❌ YANLISH: Blind Full Read**
```
Bütün potensial faylları tam oxu → 5000+ token
```

**✅ DOĞRU: Progressive Discovery**
```
1. Fayl tap (Glob) → 5 token
2. Keyword yoxla (Grep) → 15 token
3. Context oxu (Grep -A -B) → 30 token
4. Lazım olarsa targeted Read → 100 token
Total: 150 token (33x daha az!)
```

---

## 📊 Tool Hierarchy (Token Cost)

| Tool | Use Case | Token Cost | When to Use |
|------|----------|------------|-------------|
| **Glob** | Fayl adı ilə tap | 5-10 | Fayl adı bilinəndə |
| **Grep (files-with-matches)** | Keyword varmı yoxla | 10-20 | Funksionallıq yoxlaması |
| **Grep (content + context)** | Kod konteksti gör | 30-80 | Context lazım olduqda |
| **Read (offset+limit)** | Spesifik hissə oxu | 100-300 | Struktur lazım olduqda |
| **Read (full)** | Bütün fayl oxu | 500-2000+ | ❌ Yalnız ÇOX zəruri |

---

## ✅ Best Practices

### 1. Glob-First Strategy

**Always start with Glob**:
```bash
# ✅ BEST: Fayl adı pattern ilə tap
Glob pattern="**/Survey*.tsx" path="frontend/src/pages"
# Cost: ~5 token
# Result: SurveyList.tsx, SurveyCreate.tsx, SurveyEdit.tsx
```

```bash
# ❌ BAD: Read ilə hər faylı yoxla
Read "frontend/src/pages/surveys/SurveyList.tsx"
Read "frontend/src/pages/surveys/SurveyCreate.tsx"
# Cost: 1500+ token
```

---

### 2. Grep for Existence Check

**Check if feature exists**:
```bash
# ✅ BEST: files-with-matches (yalnız fayl adları)
Grep pattern="export" path="frontend/src/pages/surveys" output_mode="files_with_matches"
# Cost: ~15 token
# Result: No matches found → Export funksionallıq YOX
```

```bash
# ❌ BAD: Full file read to check
Read "frontend/src/pages/surveys/SurveyList.tsx"
# Search manually in 400 lines
# Cost: 1800 token
```

---

### 3. Grep with Context

**When you need surrounding code**:
```bash
# ✅ GOOD: Context lines ilə
Grep pattern="columns" path="TaskTable.tsx" -A 10 -B 2 output_mode="content"
# Cost: ~50 token
# Result: Column definition + 10 lines after, 2 before
# Görürsən: columns: ["title", "assigned_to", "due_date"]
```

```bash
# ❌ BAD: Bütün faylı oxu
Read "TaskTable.tsx"
# Cost: 1500 token
# Result: 400 sətr, amma sənə yalnız 10 sətr lazım idi
```

---

### 4. Targeted Read with Offset

**When structure is needed**:
```bash
# ✅ GOOD: Yalnız başlıq oxu
Read "UserModal.tsx" offset=0 limit=50
# Cost: ~200 token
# Result: İmports, component structure, first render logic
```

```bash
# ❌ BAD: Full read
Read "UserModal.tsx"
# Cost: 1800 token (400 lines)
# Result: Sənə bütün return JSX lazım deyildi
```

---

## 🎯 Real-World Scenarios

### Scenario 1: "Survey səhifəsinə export button əlavə et"

**❌ Pis yol (3500 token):**
```bash
1. Read "frontend/src/pages/surveys/SurveyList.tsx"       # 1500 token
2. Read "backend/app/Http/Controllers/SurveyController.php" # 1200 token
3. Read "backend/database/seeders/PermissionSeeder.php"   # 800 token
Total: 3500 token
```

**✅ Yaxşı yol (25 token):**
```bash
1. Glob "**/Survey*.tsx" frontend/src/pages               # 5 token
2. Grep "export" frontend/src/pages/surveys files-only    # 10 token
3. Grep "survey\\.export" backend/database/seeders        # 10 token
Total: 25 token

Result:
- SurveyList.tsx tapıldı
- Export funksionallıq YOX
- survey.export permission YOX
```

**Qənaət: 140x daha az token!**

---

### Scenario 2: "Task table-a priority column əlavə et və status filter"

**❌ Pis yol (4500 token):**
```bash
1. Read "frontend/src/components/tasks/TaskTable.tsx"     # 1800 token
2. Read "backend/app/Models/Task.php"                     # 1200 token
3. Read "backend/database/migrations/*tasks.php"          # 1500 token
Total: 4500 token
```

**✅ Yaxşı yol (80 token):**
```bash
1. Glob "**/TaskTable*.tsx" frontend/src                  # 5 token
2. Grep "columns" TaskTable.tsx -A 10 -B 2 content        # 40 token
   Result: columns definition (15 lines)
3. Grep "priority" backend/app/Models/Task.php            # 15 token
   Result: $fillable-də priority VAR
4. Grep "filter|useState" TaskTable.tsx -A 5              # 20 token
   Result: Search bar VAR, status filter YOX
Total: 80 token

Result:
- TaskTable-də columns: title, assignee, due_date
- Priority column YOX (əlavə edilməli)
- Model-də priority field VAR
- Status filter YOX (yaratmalı)
```

**Qənaət: 56x daha az!**

---

### Scenario 3: "User modalına telefon field-i əlavə et"

**❌ Pis yol (3800 token):**
```bash
1. Read "frontend/src/components/users/UserModal.tsx"     # 1500 token
2. Read "backend/app/Http/Requests/StoreUserRequest.php"  # 800 token
3. Read "backend/database/migrations/*users.php"          # 1500 token
Total: 3800 token
```

**✅ Yaxşı yol (30 token):**
```bash
1. Glob "**/UserModal*.tsx" frontend/src                  # 5 token
2. Grep "phone" UserModal.tsx files-only                  # 10 token
   Result: No match → phone field YOX
3. Grep "phone" backend/database/migrations/*users*       # 15 token
   Result: Match found → $table->string('phone')->nullable()
Total: 30 token

Result:
- UserModal-da phone field YOX
- Database-də phone column VAR
- Validation yoxlanmalıdır (optional)
```

**Qənaət: 126x daha az!**

---

## 🚨 When Full Read is Justified

**✅ Full Read YALNIZ bu hallarda:**

### 1. Refactoring Request
```
User: "TaskTable komponentini refactor et, çox köhnəlib"

Justification:
- Bütün struktur anlaşılmalıdır
- Multiple patterns görməli
- Dependencies yoxlanmalıdır

✅ OK to Read full file
```

### 2. Scattered Logic
```
Grep result: 8+ matches across whole file

Justification:
- Logic bir yerdə deyil, hər yerdə
- Context hər yerdən lazımdır
- Grep -A -B ilə çox token xərclənəcək

✅ OK to Read full file (amma offset+limit ilə parts halında)
```

### 3. User Explicitly Asks
```
User: "Explain this file: TaskTable.tsx"

Justification:
- İstifadəçi bütün faylın izahını istəyir
- Code review məqsədi

✅ OK to Read full file
```

### 4. Complex Component
```
Component has:
- Multiple HOCs
- Complex state management
- Many custom hooks
- Unclear structure

Justification:
- Grep ilə tam context anlaşılmır
- Struktur mürəkkəbdir

✅ OK to Read, amma parts halında:
Read offset=0 limit=100   # İmports + setup
Read offset=100 limit=100 # State logic
Read offset=200 limit=100 # Render logic
```

---

## 📏 Token Budgets per Task Type

### Simple Task (1-2 fayllar, UI only)
```
Budget: 50-100 token
Method: Glob + Grep files-with-matches

Example: "Button əlavə et"
- Glob fayl tap: 5 token
- Grep keyword check: 15 token
- Plan hazırla: 30 token
Total: 50 token
```

### Medium Task (3-4 fayllar, Backend + Frontend)
```
Budget: 150-300 token
Method: Glob + Grep content + targeted context

Example: "Export funksionallığı əlavə et"
- Glob frontend: 5 token
- Grep export check: 20 token
- Grep backend controller: 30 token
- Grep permission: 20 token
- Grep with context (column structure): 50 token
- Plan hazırla: 25 token
Total: 150 token
```

### Complex Task (5+ fayllar, Migration, Permission, etc.)
```
Budget: 500-800 token
Method: Multiple Grep + selective targeted Read

Example: "Task assignment system yarat"
- Glob all task files: 10 token
- Grep task model: 40 token
- Grep controller methods: 60 token
- Read migration (offset+limit): 150 token
- Grep permissions: 30 token
- Read relevant components (offset): 200 token
- Plan hazırla: 10 token
Total: 500 token

Note: Hələ də full read istifadə ETMƏDİK!
```

### Very Complex (Refactor, System-wide)
```
Budget: 1000-2000 token
Method: Selective full reads + comprehensive Grep

Example: "Bütün permission sistemini yenilə"
- Glob all permission files: 20 token
- Grep permission usage: 100 token
- Read key files (3-4 with offset): 600 token
- Read CLAUDE.md plan: 200 token
- Comprehensive analysis: 80 token
Total: 1000 token

Note: Full read yox, amma targeted reads çoxdur
```

---

## 🎓 Practical Guidelines

### Rule 1: Glob Before Grep
```bash
# Always find files first
Glob pattern="**/User*.tsx"
# Then search in those files
Grep pattern="phone" path="[found_file]"
```

### Rule 2: files-with-matches Before content
```bash
# First check IF exists
Grep pattern="export" output_mode="files_with_matches"
# If found, THEN get context
Grep pattern="export" -A 5 -B 5 output_mode="content"
```

### Rule 3: Context Before Full Read
```bash
# Try context first
Grep pattern="columns" -A 10 -B 2
# If insufficient, targeted read
Read offset=100 limit=50
# Last resort: full read
Read  # ❌ Avoid!
```

### Rule 4: offset+limit Before Full
```bash
# Read in chunks
Read offset=0 limit=100    # Header section
Read offset=100 limit=100  # Logic section
# Better than:
Read  # Full 500 lines
```

---

## 📊 Token Cost Comparison Table

| Task | Bad Approach | Good Approach | Savings |
|------|-------------|---------------|---------|
| Check if feature exists | Read full file (1500 token) | Grep files-only (15 token) | 100x |
| Find column definition | Read full file (1800 token) | Grep -A 10 (50 token) | 36x |
| Check DB field | Read migration (1200 token) | Grep field name (20 token) | 60x |
| Find permission | Read seeder (800 token) | Grep permission (15 token) | 53x |
| Get component structure | Read full (1500 token) | Read offset 0-100 (200 token) | 7.5x |

**Average savings: 40-60x less tokens with smart search!**

---

## 🎯 Summary Checklist

Before doing ANY file operation:

- [ ] Can I use Glob to find files? (5-10 token)
- [ ] Can I use Grep files-with-matches to check existence? (10-20 token)
- [ ] Can I use Grep with context to get specific code? (30-80 token)
- [ ] Can I use Read with offset+limit instead of full? (100-300 token)
- [ ] Is full read REALLY necessary? (500-2000 token)

**Default answer should be NO to full read!**

---

## 💡 Final Tips

1. **Grep is your best friend**: 90% of cases Grep is sufficient
2. **offset+limit for structure**: Need structure? Don't read all, read chunks
3. **files-with-matches first**: Check existence before getting content
4. **Progressive disclosure**: Start small (Glob), expand only if needed
5. **Question before read**: If unsure, ask user instead of reading speculatively

**Remember: Every unnecessary token costs money and time. Smart search = efficient AI!**
