---
name: atis-module-generator
description: |
  ATİS proyektinin standartlarına uyğun yeni modulları (Backend Service/Controller və Frontend Page/Component) sürətlə yaratmaq üçün bacarıq.
  Bu skill .claude/templates qovluğundakı şablonlardan istifadə edir və avtomatik olaraq 'Institution Hierarchy' və 'Role-based Access' məntiqlərini tətbiq edir.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# ATİS Module Generator - Sürətli Modul Yaradıcısı

## 🎯 MƏQSƏD
Yeni funksionallıq (məsələn: İnventar, Kitabxana, Tədbirlər) əlavə edilərkən, bütün faylları sıfırdan yazmaq əvəzinə, proyektin təsdiqlənmiş şablonlarından istifadə edərək hazır CRUD strukturu yaratmaq.

---

## 🛠️ İSTİFADƏ QAYDALARI

### ⚠️ STANDARTLARA RİAYƏT:
Yaranan hər bir modul avtomatik olaraq aşağıdakı standartlara cavab verməlidir:
1. **Backend:** Service Pattern istifadə olunmalıdır (Controller -> Service -> Model).
2. **Frontend:** React Query və Shadcn UI komponentləri istifadə olunmalıdır.
3. **Security:** Bütün sorğular `Permission` və `Institution Scope` yoxlanışından keçməlidir.

---

## 💻 ƏSAS ƏMRLƏR (Script vasitəsilə)

### Yeni Modul Yaratmaq:
```bash
# Backend və Frontend daxil olmaqla tam modul
./module-gen.sh create-module {{ModuleName}}
```

Bu əmr aşağıdakı faylları yaradır:
1. `backend/app/Models/{{ModuleName}}.php`
2. `backend/app/Services/{{ModuleName}}Service.php`
3. `backend/app/Http/Controllers/Api/{{ModuleName}}Controller.php`
4. `frontend/src/services/{{moduleName}}Service.ts`
5. `frontend/src/pages/{{ModuleName}}.tsx`

---

## 📋 GENERASİYA PROSESİ

1. **Şablonların Oxunması:** `.claude/templates` qovluğundan `laravel-service.php`, `react-component.tsx` və s. oxunur.
2. **Dəyişənlərin Əvəzlənməsi:** `{{ModelName}}`, `{{ServiceName}}` kimi yer tutucular yeni modulun adı ilə əvəzlənir.
3. **Faylların Yazılması:** Hazır kodlar uyğun qovluqlara yazılır.
4. **Qeydiyyat (Registration):** Yeni route-lar `api.php` faylına, yeni səhifə isə `App.tsx` router-inə əlavə olunur.

---

## 🦷 TRİGGER SCENARIOS
- "Yeni [X] modulu yarat" əmri gəldikdə.
- "Sisteme [X] funksionallığını əlavə et" dedikdə (əgər bu yeni bir entity tələb edirsə).
