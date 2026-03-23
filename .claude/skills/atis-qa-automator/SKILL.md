---
name: atis-qa-automator
description: |
  ATİS proyektinin kod keyfiyyətini (Linting) və düzgünlüyünü (Unit/Feature Tests) yoxlayan bacarıq.
  Bu skill mənə Docker mühitində frontend və backend testlərini icra etməyə, xətaları tapmağa və aradan qaldırmağa kömək edir.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# ATİS QA Automator - Keyfiyyət və Test İdarəçisi

## 🎯 MƏQSƏD
Bu bacarığın məqsədi proyektin hər iki tərəfində (Laravel & React) kodun standartlara uyğunluğunu (Lint) və funksional olaraq düzgün işlədiyini (Test) avtomatik yoxlamaqdır.

---

## 🛠️ İSTİFADƏ QAYDALARI

### 🚨 VACİB QAYDA:
Hər commit-dən əvvəl və ya böyük bir funksiya əlavə etdikdən sonra mütləq bütün testlər keçməlidir.

---

## 💻 ƏSAS ƏMRLƏR (Docker vasitəsilə)

### 1. BACKEND (Laravel) Yoxlanışları:
- **Bütün testləri qaçır:**
  ```bash
  docker exec atis_backend php artisan test
  ```
- **Fayl üzrə spesifik test qaçır:**
  ```bash
  docker exec atis_backend php artisan test {{path_to_test_file}}
  ```
- **Kod standartlarını yoxla (Pint):**
  ```bash
  docker exec atis_backend ./vendor/bin/pint --test
  ```
- **Kod standartlarını avtomatik düzəlt:**
  ```bash
  docker exec atis_backend ./vendor/bin/pint
  ```

### 2. FRONTEND (React) Yoxlanışları:
- **Lint yoxla:**
  ```bash
  docker exec atis_frontend npm run lint
  ```
- **Typecheck (TypeScript) yoxla:**
  ```bash
  docker exec atis_frontend npm run typecheck
  ```
- **Audit (Təhlükəsizlik):**
  ```bash
  docker exec atis_frontend npm audit --audit-level=moderate
  ```

---

## 📋 QA HESABAT ŞABLONU
Yoxlanışdan sonra istifadəçiyə bu formatda cavab ver:

```markdown
✅ QA YOXLANIŞI:
- Backend Testlər: [Keçdi / Xəta]
- Frontend Lint: [Təmiz / Xətalı]
- TypeScript Yoxlanışı: [Uğurlu / Xətalı]

🔧 TAPILAN PROBLEMLƏR:
[Varsa spesifik test xətaları və ya lint xəbərdarlıqlarını bura qeyd et]

🚀 NÖVBƏTİ ADDIM:
[Xəta varsa necə düzəltməli, yoxdursa növbəti mərhələyə keçid]
```

---

## 🦷 TRİGGER SCENARIOS
- Yeni bir Controller və ya Komponent yaradıldıqda.
- Kodda refactoring (kodun təmizlənməsi) aparıldıqda.
- "Giti commit et" əmri verildikdə (əvvəlcədən avtomatik yoxlamaq üçün).
- Sirli bir xətanın səbəbini axtararkən.
