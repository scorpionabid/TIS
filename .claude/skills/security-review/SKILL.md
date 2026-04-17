---
name: security-review
description: |
  ATİS proyektinin dəyişdirilmiş kodunu təhlükəsizlik baxımından yoxlayan skill.
  IDOR, injection, authorization bypass, hardcoded secrets, rate limiting boşluqlarını aşkar edir.
  Branch diff-i, spesifik fayl və ya tam modul yoxlamaq üçün istifadə et.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
user-invocable: true
---

# ATİS Security Review

## Məqsəd

Bu branch/commit/faylda təhlükəsizlik boşluqları var? OWASP Top 10 + ATİS-spesifik risklər əsasında yoxla.

## Yoxlama Sırası

### 1. Scope Müəyyən Et

```bash
# Dəyişdirilmiş faylları gör
git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached
```

Faylları tip üzrə ayır: Controllers / Models / Migrations / Routes / Frontend pages / Services

---

### 2. IDOR (Insecure Direct Object Reference) — Prioritet: 🔴 HIGH

Hər resource endpoint-i üçün:

```bash
# Authorization yoxla — $this->authorize() olmayan controller metodları
grep -rn "public function" backend/app/Http/Controllers/Api/ | grep -v "authorize"
```

**Yoxlama sualları:**
- [ ] User başqa institution-un ID-sini URL-də göndərə bilər?
- [ ] `institution_id` user-in öz institution-u ilə filter edilib?
- [ ] `whereHas('institution', ...)` scope işlədilir?

**Risqli pattern:**
```php
// ❌ IDOR riski — hər hansı ID qəbul edir
$model = Model::findOrFail($request->id);

// ✅ Düzgün — institution scope ilə
$model = Model::whereHas('institution', fn($q) =>
    $q->where('id', auth()->user()->institution_id)
)->findOrFail($id);
```

---

### 3. Authorization Bypass

```bash
# authorize() olmayan public metodlar
grep -rn "public function" backend/app/Http/Controllers/Api/ -A 3 | grep -B 1 -v "authorize"

# Policy-si olmayan modellər
ls backend/app/Policies/
ls backend/app/Models/ | grep -v "^$(ls backend/app/Policies/ | sed 's/Policy.php//')"
```

- [ ] Hər controller method-u `$this->authorize()` çağırır?
- [ ] Policy `before()` metodu SuperAdmin-ə düzgün icazə verir?
- [ ] `RegionAdmin` başqa region-un datasını görə bilər?

---

### 4. Input Validation

```bash
# FormRequest olmayan store/update metodları
grep -rn "function store\|function update" backend/app/Http/Controllers/Api/ -A 2 | grep "Request \$request"
```

- [ ] Hər `store()` / `update()` FormRequest işlədirmi?
- [ ] File upload varsa — MIME type + size yoxlanılır?
- [ ] `$request->all()` birbaşa istifadə edilmir?

---

### 5. SQL Injection / Mass Assignment

```bash
# Raw query-lər
grep -rn "DB::statement\|DB::select\|whereRaw\|orderByRaw" backend/app/ --include="*.php"

# $fillable olmayan modellər (guarded boş)
grep -rn "protected \$guarded = \[\]" backend/app/Models/ --include="*.php"
```

- [ ] Bütün raw query-lər `?` placeholder istifadə edir?
- [ ] Model-lərdə `$fillable` explicitely müəyyən edilib?

---

### 6. Hardcoded Secrets / Credentials

```bash
# Kod içində hardcoded şifrə/token
grep -rn "password\s*=\s*['\"]" backend/app/ --include="*.php" | grep -v "config\|env\|test\|hash"
grep -rn "api_key\s*=\s*['\"]" backend/ --include="*.php"
grep -rn "secret\s*=\s*['\"]" frontend/src/ --include="*.ts" --include="*.tsx"
```

- [ ] `.env` dəyərlər `config()` vasitəsilə istifadə edilir?
- [ ] Frontend-də API key hardcode edilmir?

---

### 7. Rate Limiting

```bash
# Route qruplarında throttle middleware
grep -rn "throttle" backend/routes/ --include="*.php"
```

- [ ] Yalnız login-in rate limit-i var, digər endpointlər açıqdır?
- [ ] Bulk əməliyyatlar rate limit-ə malikdir?

---

### 8. ATİS-Spesifik Yoxlamalar

```bash
# SecurityEvent log-u — kritik əməliyyatlarda yazılır?
grep -rn "SecurityEvent::logEvent\|SecurityEvent::log" backend/app/ --include="*.php"
```

- [ ] Permission denied (403) cavabları `SecurityEvent`-ə log olunur?
- [ ] Bulk delete əməliyyatları audit trail-də qeydə alınır?
- [ ] `POST /api/register` public endpoint-i hələ də açıqdır? (TASK 3.5)

---

## Nəticə Formatı

```
## Security Review Nəticəsi

**Yoxlanan:** [branch/fayllar/commit]
**Tarix:** $(date +%Y-%m-%d)

### 🔴 Kritik (dərhal düzəldilməlidir)
- [issue]: [fayl:sətir] — [izah + tövsiyə]

### 🟡 Orta (növbəti sprint)
- [issue]: [fayl:sətir] — [izah + tövsiyə]

### 🟢 Kiçik (backlog)
- [issue]: [fayl:sətir] — [izah + tövsiyə]

### ✅ Yaxşı görünür
- [nə yoxlandı və problemsiz tapıldı]

**Növbəti addım:** @.claude/references/security-remediation-plan.md-ə əlavə et
```
