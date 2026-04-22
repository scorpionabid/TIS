---
name: safe-to-deploy
description: |
  Production pull etməzdən əvvəl tam keyfiyyət yoxlaması.
  Typecheck → Build → Lint → Tests → Migration status → Risk hesabatı.
  PASS/FAIL nəticəsi ilə production-a pull etməyin təhlükəsiz olub-olmadığını bildirir.
allowed-tools:
  - Bash
  - Read
  - Grep
---

# ATİS Safe-to-Deploy — Production Yoxlama Protokolu

## 🎯 MƏQSƏD
Production serverə `./pull.sh` çalışdırmadan əvvəl bu yoxlamalar KEÇMƏLİDİR.
Hər yoxlama üçün ✅ PASS / ❌ FAIL nəticəsi ver. Sonunda ümumi PASS/FAIL bil.

---

## 📋 YOXLAMA PROTOKOLU

### 1. Git Vəziyyəti
```bash
git log --oneline origin/main..HEAD
git status
```
- Local commit-lər var?
- Unstaged dəyişikliklər var?

### 2. Frontend — TypeScript
```bash
docker exec atis_frontend npm run typecheck 2>&1
```
✅ PASS: Çıxış kodu 0
❌ FAIL: Hər hansı type xətası var

### 3. Frontend — Build
```bash
docker exec atis_frontend npm run build 2>&1 | tail -20
```
✅ PASS: "built in X.Xs" mesajı görünür
❌ FAIL: Build xətası var

### 4. Frontend — Lint
```bash
docker exec atis_frontend npm run lint 2>&1
```
✅ PASS: Xəta yoxdur (warnings OK)
❌ FAIL: Error-level lint problemi var

### 5. Backend — Tests
```bash
docker exec atis_backend php artisan test --stop-on-failure 2>&1 | tail -30
```
✅ PASS: Bütün testlər keçdi
❌ FAIL: Hər hansı test uğursuz oldu

### 6. Backend — Migration Status
```bash
docker exec atis_backend php artisan migrate:status 2>&1 | grep -E "No|Pending" | head -20
```
✅ PASS: "Pending" migration yoxdur
⚠️  DİQQƏT: Pending migration var — production-da çalışacaq, data dəyişəcək

### 7. Regression Check — Son Commit
```bash
git diff HEAD~1..HEAD --name-only
```
Bu faylların dəyişdiyi vacib komponentlərə bax:
- `routes/api.php` → API breaking change riski
- `Middleware/` → Auth/permission riski
- `migrations/` → Data dəyişikliyi
- `package.json` / `composer.json` → Dependency dəyişikliyi

### 8. Security Audit
```bash
docker exec atis_frontend npm audit --audit-level=high 2>&1 | tail -10
docker exec atis_backend composer audit 2>&1 | tail -10
```
✅ PASS: High/Critical vulnerability yoxdur
⚠️  QEYD: Moderate warnings — qeyd et amma blocker deyil

---

## 📊 NƏTİCƏ HESABATI FORMAT

Bütün yoxlamalar bitdikdən sonra bu formatda hesabat ver:

```
══════════════════════════════════════════
ATİS SAFE-TO-DEPLOY HESABATI
Tarix: [tarix]
Branch: [branch adı]
Son commit: [hash] [mesaj]
══════════════════════════════════════════

✅/❌ TypeScript Check
✅/❌ Frontend Build  
✅/❌ Frontend Lint
✅/❌ Backend Tests   (X passed, Y failed)
✅/❌ Migrations      (X pending / Yoxdur)
⚠️/✅ Security Audit

──────────────────────────────────────────
ÜMUMI NƏTİCƏ: ✅ DEPLOY TƏHLÜKƏSİZDİR
              ❌ DEPLOY QADAĞANDIR — [səbəb]
══════════════════════════════════════════
```

---

## ⚠️ BLOCKER-LAR (Deploy etmə!)
- TypeScript xətası
- Build uğursuz
- Backend test uğursuz
- Critical security vulnerability

## ⚠️ QEYD AL (Deploy edə bilərsən amma bil)
- Pending migration — production-da avtomatik çalışacaq
- Moderate npm/composer warning
- Warning-level lint mesajları
