---
name: atis-db-explorer
description: |
  ATİS proyektinin PostgreSQL verilənlər bazasını araşdırmaq və məlumatları analiz etmək üçün xüsusi bacarıq.
  Bu skill mənə Docker mühitində 'atis_postgres' konteynerinə qoşulub SQL sorğuları icra etməyə imkan verir.
allowed-tools:
  - run_command
  - command_status
---

# ATİS DB Explorer - Verilənlər Bazası Analitiki

## 🎯 MƏQSƏD
Bu bacarıq proyektin canlı verilənlər bazasını (PostgreSQL) təhlükəsiz şəkildə araşdırmaq, cədvəllərin strukturunu anlamaq və məlumatlar üzərində analiz aparmaq üçündür.

---

## 🛠️ İSTİFADƏ QAYDALARI

### 🚨 VACİB TƏHLÜKƏSİZLİK QAYDASI:
1. **YALNIZ SELECT:** Canlı bazada məlumatları dəyişmək (`UPDATE`, `DELETE`, `DROP`, `TRUNCATE`) qəti qadağandır!
2. **LIMIT:** Hər bir sorğuda mütləq `LIMIT 100` və ya daha az istifadə edilməlidir ki, sistem yüklənməsin.
3. **READ-ONLY:** Yalnız məlumatları oxumaq və təhlil etmək olar.

---

## 💻 ƏSAS ƏMRLƏR (Docker vasitəsilə)

### 1. Cədvəllərin siyahısını görmək:
```bash
docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "\dt"
```

### 2. Spesifik bir cədvəlin strukturunu görmək:
```bash
docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "\d {{table_name}}"
```

### 3. Məlumatları oxumaq (Analiz üçün):
```bash
docker exec atis_postgres psql -U atis_dev_user -d atis_dev -c "SELECT * FROM {{table_name}} ORDER BY created_at DESC LIMIT 10;"
```

---

## 📋 ANALİZ ŞABLONU
Məlumatı aldıqdan sonra istifadəçiyə bu formatda cavab ver:

```markdown
📊 DATABASE ANALİZİ:
- Cədvəl: [cədvəl adı]
- Tapılan qeyd sayı: [say]
- Son yenilənmə: [tarix]

💡 MÜŞAHİDƏ:
[Burada bazadakı məlumatların vəziyyəti haqqında qısa texniki şərh yaz]

✅ TƏKLİF:
[Məlumatlara əsasən atılmalı olan növbəti addım]
```

---

## 🦷 TRİGGER SCENARIOS (Nə vaxt istifadə edilir?)
- İstifadəçi statistik məlumat soruşduqda (məs: "Nə qədər müəllim qeydiyyatdan keçib?").
- Bir xətanın izini bazada axtararkən (məs: "Niyə istifadəçi profilini görə bilmir?").
- Yeni funksiya əlavə etdikdən sonra məlumatların düzgün yazıldığını yoxlayarkən.

---

## 🗣️ LÜĞƏT (Terms)
- `Schema` -> Struktur/Ssxem
- `Query` -> Sorğu
- `Record/Row` -> Sətir/Yazı
- `Column/Field` -> Sütun/Sahə
- `Constraint` -> Məhdudiyyət
