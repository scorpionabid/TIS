# Natural Language Pattern Recognition

Bu fayl requirements-translator skill-in istifadəçinin sadə Azərbaycan dilindəki request-lərini
necə parse edib texniki requirement-ə çevirdiyini izah edir.

---

## 🎯 Pattern Matching Strategiyası

### 1. Trigger Word Detection

Skill avtomatik olaraq bu sözləri aşkar edəndə aktivləşir:

#### Action Words (Əməliyyat)
```
"əlavə et" | "add" | "create"
"dəyişdir" | "modify" | "update" | "change"
"sil" | "remove" | "delete"
"göstər" | "show" | "display" | "list"
"yarat" | "create" | "generate"
"filter" | "axtarış" | "search"
"yenilə" | "refresh" | "update"
```

#### Entity Words (Obyekt)
```
"səhifə" | "page" | "ekran" | "screen"
"modal" | "dialog" | "pəncərə"
"button" | "düymə"
"table" | "cədvəl"
"form"
"field" | "sahə"
"filter"
```

#### Domain Entities (ATİS-ə aid)
```
"user" | "istifadəçi"
"survey" | "sorğu"
"task" | "tapşırıq"
"permission" | "səlahiyyət"
"institution" | "qurum"
"role" | "rol"
```

---

## 📋 Pattern Templates

### Pattern 1: "X-ə Y əlavə et" (ADD Y TO X)

**Structure**: [Location] + "ə/a" + [Entity] + "əlavə et"

**Examples:**
```
Input: "Survey səhifəsinə export düyməsi əlavə et"
Parse:
  └─ Location: "Survey səhifəsi" → SurveyList page
  └─ Entity: "export düyməsi" → export button
  └─ Action: "əlavə et" → ADD

Technical Output:
  └─ ADD export button TO SurveyList page
  └─ Files: frontend/src/pages/surveys/SurveyList.tsx
  └─ Component: <Button> with export functionality
```

```
Input: "User modalına telefon field-i əlavə et"
Parse:
  └─ Location: "User modalı" → UserModal component
  └─ Entity: "telefon field-i" → phone input field
  └─ Action: "əlavə et" → ADD

Technical Output:
  └─ ADD phone field TO UserModal
  └─ Files: frontend/src/components/users/UserModal.tsx
  └─ Component: <FormField name="phone">
```

---

### Pattern 2: "X-i dəyişdir" (MODIFY/UPDATE X)

**Structure**: [Entity] + "i/ı/u/ü" + "dəyişdir"

**Examples:**
```
Input: "Task table-ı dəyişdir, priority column əlavə et"
Parse:
  └─ Entity: "Task table" → TaskTable component
  └─ Action: "dəyişdir" → MODIFY
  └─ Sub-action: "priority column əlavə et" → ADD priority column

Technical Output:
  └─ MODIFY TaskTable component
  └─ ADD priority column
  └─ Files: frontend/src/components/tasks/TaskTable.tsx
```

---

### Pattern 3: "X-də filter" (FILTER IN X)

**Structure**: [Entity] + "də/da" + [Criteria] + "filter"

**Examples:**
```
Input: "Permission səhifəsində kateqoriya filter-i olsun"
Parse:
  └─ Location: "Permission səhifəsi" → Permissions page
  └─ Criteria: "kateqoriya" → category
  └─ Action: "filter olsun" → ADD filter

Technical Output:
  └─ ADD category filter TO Permissions page
  └─ Files: frontend/src/pages/Permissions.tsx
  └─ Component: <Select> for category filtering
```

```
Input: "User cədvəlində institution-a görə filter"
Parse:
  └─ Location: "User cədvəli" → Users table
  └─ Criteria: "institution" → institution
  └─ Action: "filter" → FILTER BY

Technical Output:
  └─ ADD institution filter TO Users table
  └─ Backend: Query scope for institution filtering
```

---

### Pattern 4: "X yaradacaq" (CREATE X)

**Structure**: [Entity] + "yaradacaq"

**Examples:**
```
Input: "Task üçün yeni migration yaradacaq"
Parse:
  └─ Entity: "migration" → database migration
  └─ Purpose: "Task üçün" → for Task model
  └─ Action: "yaradacaq" → CREATE

Technical Output:
  └─ CREATE new migration for Task model
  └─ Command: php artisan make:migration
```

---

### Pattern 5: "X-da Y görsənsin" (SHOW/DISPLAY Y IN X)

**Structure**: [Location] + "da/də" + [Entity] + "görsənsin"

**Examples:**
```
Input: "User səhifəsində telefon nömrəsi görsənsin"
Parse:
  └─ Location: "User səhifəsi" → Users page
  └─ Entity: "telefon nömrəsi" → phone number
  └─ Action: "görsənsin" → DISPLAY

Technical Output:
  └─ DISPLAY phone number IN Users page/table
  └─ Files: frontend/src/pages/Users.tsx
  └─ Table column: phone
```

---

### Pattern 6: "X-ı sil" (DELETE/REMOVE X)

**Structure**: [Entity] + "ı/i" + "sil"

**Examples:**
```
Input: "Bu field-i sil"
Parse:
  └─ Entity: "field" → input field
  └─ Action: "sil" → DELETE/REMOVE

Technical Output:
  └─ REMOVE specified field
  └─ Context: User must specify which field (ambiguous - need clarification)
```

---

## 🔍 Ambiguity Detection

### When to Ask Clarification Questions

**Trigger 1: Vague Location**
```
Input: "Export button əlavə et"
❌ Location missing - hansı səhifə?

Clarification:
"Hansı səhifəyə export button əlavə edilsin?
1. Survey səhifəsi
2. Task səhifəsi
3. User səhifəsi
4. Başqa?"
```

**Trigger 2: Vague Action**
```
Input: "User sistemi düzəlt"
❌ "düzəlt" çox geniş - nə düzəltmək lazımdır?

Clarification:
"'User sistemi düzəlt' - Konkret olaraq nə düzəltmək lazımdır?
1. Bug fix (hansı problem?)
2. Yeni funksionallıq (hansı?)
3. UI dəyişikliyi (nə dəyişsin?)
4. Performance optimization?"
```

**Trigger 3: Multiple Interpretations**
```
Input: "Filter əlavə et"
❌ Hansı entity-yə? Hansı criteria?

Clarification:
"Hansı səhifə/cədvəl üçün filter?
Hansı field-a görə filter edilsin (status, date, category, etc.)?"
```

---

## 🧩 Complex Pattern Parsing

### Multi-Step Requests

**Example 1:**
```
Input: "Task table-a priority column və status filter əlavə et"

Parse:
  └─ Location: "Task table" → TaskTable
  └─ Action 1: "priority column əlavə et" → ADD column
  └─ Action 2: "status filter əlavə et" → ADD filter

Technical Output:
  ├─ Step 1: ADD priority column TO TaskTable
  │   └─ Backend: Task model, migration (if needed)
  │   └─ Frontend: Table column definition
  │
  └─ Step 2: ADD status filter TO TaskTable
      └─ Frontend: Select component for status
      └─ Backend: API query parameter
```

**Example 2:**
```
Input: "Survey export funksionallığı yarat: excel və PDF formatlarında, permission yoxlaması olsun"

Parse:
  └─ Entity: "Survey export funksionallığı"
  └─ Format 1: "excel"
  └─ Format 2: "PDF"
  └─ Constraint: "permission yoxlaması"

Technical Output:
  ├─ Feature: Survey export
  ├─ Formats: Excel (PhpSpreadsheet), PDF (DomPDF)
  ├─ Permission: survey.export
  │   └─ Backend: Middleware check
  │   └─ Frontend: hasPermission() UI guard
  └─ Files:
      ├─ Backend: SurveyController@export
      ├─ Frontend: ExportButton component
      └─ Seeder: Add survey.export permission
```

---

## 📊 Context Inference

### Inferring Technical Requirements from Natural Language

**Example 1: "İstifadəçi öz taskları görsün"**
```
Parse:
  └─ Actor: "İstifadəçi" → authenticated user
  └─ Scope: "öz taskları" → user's own tasks (filtered)
  └─ Action: "görsün" → VIEW/LIST

Inferred Technical Requirements:
  ├─ Authentication: Required (user must be logged in)
  ├─ Authorization: User can only see own tasks
  ├─ Filter: WHERE assigned_to = current_user_id
  ├─ Permission: task.view.own (vs task.view.all)
  └─ UI: "My Tasks" page or filter on Tasks page
```

**Example 2: "Admin bütün institution-ların surveylerini export edə bilsin"**
```
Parse:
  └─ Actor: "Admin" → role-based
  └─ Scope: "bütün institution-ların" → all institutions (no filter)
  └─ Entity: "surveyləri" → surveys
  └─ Action: "export edə bilsin" → EXPORT capability

Inferred Technical Requirements:
  ├─ Role check: User must be Admin or SuperAdmin
  ├─ Permission: survey.export.all (vs survey.export.own)
  ├─ No institution filter for Admin role
  ├─ Backend: Skip institution scope for Admin
  └─ UI: Export button only visible to Admin
```

---

## 🎓 Real-World Parsing Examples

### Example 1: Simple Request
```
Input: "Survey səhifəsinə excel export düyməsi qoy"

Step 1: Tokenize
  └─ ["Survey", "səhifəsi", "nə", "excel", "export", "düyməsi", "qoy"]

Step 2: Pattern Match
  └─ Pattern: "X-ə Y əlavə et"
  └─ Location: "Survey səhifəsi" → SurveyList page
  └─ Entity: "excel export düyməsi" → export button
  └─ Action: "qoy" (synonym: "əlavə et") → ADD

Step 3: Technical Mapping
  └─ Frontend: SurveyList.tsx → Add <Button>
  └─ Backend: SurveyController → Add export() method
  └─ Library: PhpSpreadsheet for Excel generation
  └─ Permission: survey.export

Step 4: Generate Plan
  └─ [See SKILL.md Case 1 example]

Token cost: ~25 token (Grep only, no full file read)
```

### Example 2: Complex Request
```
Input: "Task yaradanda məsul şəxs seçilsin, o user öz səhifəsində görsün, notification alsın"

Step 1: Break into sub-requirements
  ├─ Req 1: "Task yaradanda məsul şəxs seçilsin"
  ├─ Req 2: "o user öz səhifəsində görsün"
  └─ Req 3: "notification alsın"

Step 2: Technical mapping
  ├─ Req 1: ADD assigned_to field TO Task creation
  │   ├─ Frontend: User selector in TaskCreate form
  │   ├─ Backend: assigned_to column in tasks table
  │   └─ Validation: assigned_to must be valid user_id
  │
  ├─ Req 2: CREATE "My Tasks" page
  │   ├─ Frontend: New page /my-tasks
  │   ├─ Backend: TaskController@myTasks() endpoint
  │   └─ Filter: WHERE assigned_to = auth()->id()
  │
  └─ Req 3: SEND notification on task assignment
      ├─ Backend: Notification class
      ├─ Event: TaskAssigned event
      └─ Channels: Email + in-app notification

Step 3: Impact analysis
  └─ Files: 5-7 files
  └─ Migration: Maybe (if assigned_to doesn't exist)
  └─ Risk: MEDIUM (touches multiple systems)

Step 4: Clarification questions
  ├─ "Notification email və ya in-app?"
  ├─ "User selector: institution hierarchy filter?"
  └─ "My Tasks-da filter lazımdır (status, date)?"

Token cost: ~150 token (multiple targeted searches)
```

---

## 🔄 Parsing Workflow

```
User Input (Azerbaijani)
        ↓
[Tokenization]
        ↓
[Pattern Matching]
  ├─ Action pattern
  ├─ Entity detection
  └─ Location inference
        ↓
[Technical Glossary Lookup]
  └─ AZ → EN term mapping
        ↓
[Context Inference]
  ├─ Permission requirements
  ├─ Authentication needs
  └─ Business logic
        ↓
[Ambiguity Check]
  ├─ Missing info? → Ask questions
  └─ Clear? → Continue
        ↓
[File/Component Discovery]
  └─ Minimal token search (Grep > Glob)
        ↓
[Technical Plan Generation]
  └─ [See SKILL.md Format]
```

---

## 📝 Notes for AI

**Priority Order:**
1. **Pattern match** first (fast, low-token)
2. **Glossary lookup** second (AZ → EN)
3. **File search** third (Grep, not Read)
4. **Context inference** fourth (smart assumptions)
5. **Ask clarification** if ambiguous

**Token Optimization:**
- Pattern matching: 0 token (rule-based)
- Glossary lookup: 0 token (in-memory)
- File search: 10-50 token (Grep only)
- Clarification: 0 token cost (just ask user)

Total: Usually 10-50 token for parsing phase!
