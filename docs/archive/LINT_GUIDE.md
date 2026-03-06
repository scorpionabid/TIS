# 🔍 ATİS Lint Guide

## Lint Komandaları

### Root-dan (TIS/) Çalışdırmaq

```bash
# Hər iki layihəni yoxla (frontend + backend)
npm run lint

# Hər iki layihəni düzəlt
npm run lint:fix

# Yalnız frontend
npm run lint:frontend

# Yalnız backend
npm run lint:backend

# TypeScript type checking
npm run typecheck

# Testlər
npm test
```

---

## Frontend (TypeScript/React)

### Direktiv: `frontend/`

```bash
# ESLint yoxlama
npm run lint

# ESLint düzəltmə (auto-fix)
npm run lint:fix

# TypeScript type checking
npm run typecheck

# Hər ikisi birlikdə
npm run lint && npm run typecheck
```

### ESLint Config
Fayl: `frontend/eslint.config.js`

**Aktiv Qaydalar:**
- React Hooks rules
- React Refresh rules
- TypeScript recommended

**Disabled Qaydalar:**
- `@typescript-eslint/no-unused-vars` - OFF
- `@typescript-eslint/no-explicit-any` - OFF
- `no-undef` - OFF (TypeScript handles this)

### TypeScript Config
Fayl: `frontend/tsconfig.json`

**Strict Mode:** Partially disabled for development
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedParameters: false`

---

## Backend (PHP/Laravel)

### Direktiv: `backend/`

```bash
# Laravel Pint - Code style düzəltmə
composer lint

# Yalnız yoxla (fix etmə)
composer lint:check

# Testlər
composer test
```

### Laravel Pint Config
Fayl: `backend/pint.json`

**Preset:** Laravel
**Əsas Qaydalar:**
- Single quotes
- Trailing commas
- No unused imports
- PSR-12 compliance
- Method chaining indentation

---

## CI/CD Pipeline üçün

### GitHub Actions / GitLab CI

```yaml
# Frontend
- name: Lint Frontend
  run: cd frontend && npm run lint

- name: TypeCheck Frontend
  run: cd frontend && npm run typecheck

# Backend
- name: Lint Backend
  run: cd backend && composer lint:check
```

---

## Pre-commit Hook

`.git/hooks/pre-commit` faylı yaradın:

```bash
#!/bin/sh

echo "🔍 Running linters..."

# Frontend
cd frontend
npm run lint --silent
if [ $? -ne 0 ]; then
  echo "❌ Frontend lint failed"
  exit 1
fi

# Backend
cd ../backend
composer lint:check --quiet
if [ $? -ne 0 ]; then
  echo "❌ Backend lint failed"
  exit 1
fi

echo "✅ All linters passed"
exit 0
```

---

## IDE Integration

### VS Code

**.vscode/settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[php]": {
    "editor.defaultFormatter": "bmewburn.vscode-intelephense-client"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Tövsiyə olunan Extensionlar:**
- ESLint
- PHP Intelephense
- Laravel Pint

---

## Xəta Kodları

### Frontend ESLint

| Kod | Təsvir | Həll |
|-----|--------|------|
| `react-hooks/exhaustive-deps` | Hook dependency array natamam | Dependencies əlavə et |
| `@typescript-eslint/no-unused-vars` | İstifadə olunmayan variable | Sil və ya `_` prefix əlavə et |
| `react-refresh/only-export-components` | Component export problemi | Default export istifadə et |

### Backend Pint

| Kod | Təsvir | Həll |
|-----|--------|------|
| `no_unused_imports` | İstifadə olunmayan import | `composer lint` avtomatik düzəldəcək |
| `single_quote` | Double quote istifadə olunub | `composer lint` düzəldəcək |
| `concat_space` | String concat spacing | `composer lint` düzəldəcək |

---

## Performans

### Lint Müddətləri (average)

- **Frontend:** ~5-10 saniyə
- **Backend:** ~3-5 saniyə
- **TypeCheck:** ~15-20 saniyə
- **Total:** ~25-35 saniyə

### Optimizasiya

```bash
# Yalnız dəyişdirilmiş faylları yoxla (Git)
npm run lint -- --cache

# Parallel işlətmək
npm run lint:frontend & npm run lint:backend
```

---

## Troubleshooting

### Problem: ESLint cache problemi
```bash
cd frontend
rm -rf node_modules/.cache
npm run lint
```

### Problem: Pint vendor yoxdur
```bash
cd backend
composer install
composer lint
```

### Problem: TypeScript errors
```bash
cd frontend
rm -rf node_modules
npm install
npm run typecheck
```

---

## Əlavə Resurslar

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Laravel Pint Docs](https://laravel.com/docs/pint)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
