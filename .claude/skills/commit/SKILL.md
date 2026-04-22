---
name: commit
description: |
  ATİS proyektinin standart commit workflow-unu icra edən skill.
  Lint → Typecheck → Test → Gitignore yoxlama → Commit → Push ardıcıllığını avtomatik edir.
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

# ATİS Commit & Push — Standart Workflow

## 🎯 MƏQSƏD
Hər commit-dən əvvəl keyfiyyət yoxlamalarını keçir, gitignore problemlərini önlə, sonra commit+push et.

---

## 📋 ARDICIЛ ADDIMLAR

### 1. Git Status — Nə dəyişib?
```bash
git status
git diff --stat
```
Dəyişiklikləri qısa analiz et.

### 2. Gitignore Yoxlama (KRİTİK)
Staged fayllar arasında bunların olmadığını yoxla:
- `.env`, `.env.testing`, `.env.local` — heç vaxt commit edilməməli
- `*.log` faylları
- `node_modules/`, `vendor/` içindəki fayllar
- `storage/logs/` içindəki fayllar

```bash
git status --porcelain | grep -E '\.(env|log)$|node_modules|vendor/' || echo "✅ Sensitive fayl yoxdur"
```

### 3. Frontend Keyfiyyət Yoxlaması
```bash
docker exec atis_frontend npm run lint
docker exec atis_frontend npm run typecheck
```
Xəta varsa — əvvəlcə düzəlt, sonra davam et.

### 4. Backend Keyfiyyət Yoxlaması
```bash
docker exec atis_backend ./vendor/bin/pint --test
docker exec atis_backend php artisan test --stop-on-failure
```
Xəta varsa — əvvəlcə düzəlt, sonra davam et.

### 5. Staged Faylları Hazırla
Yalnız dəyişdirilən lazımlı faylları stage et (heç vaxt `git add -A` işlətmə):
```bash
git add <specific-files>
git diff --cached --stat
```

### 6. Commit Mesajı — Conventional Commits Format
```
feat: <qısa açıqlama>     — yeni feature
fix: <qısa açıqlama>      — bug fix
refactor: <açıqlama>      — kod strukturu dəyişikliyi
docs: <açıqlama>          — dokumentasiya
test: <açıqlama>          — test əlavəsi/düzəltməsi
chore: <açıqlama>         — konfiqurasiya, dependency
```

```bash
git commit -m "$(cat <<'EOF'
feat: your commit message here

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7. Push
```bash
git push origin $(git rev-parse --abbrev-ref HEAD)
```

### 8. Nəticə Hesabatı
```bash
git log --oneline -3
```
Son 3 commit-i göstər, işin tamamlandığını təsdiqlə.

---

## ⚠️ XƏBƏRDARLIQLAR
- Pre-commit hook xəta verərsə `--no-verify` işlətmə — xətanı düzəlt
- Merge conflict varsa — əvvəlcə resolve et
- Əgər branch main-dirsə — push etməzdən əvvəl soruş
