# User Permission Assignment Preview — Rollout Checklist

**Versiya:** 1.0  
**Tarix:** December 10, 2025  
**Məqsəd:** Permission assignment modal-ında dry-run & preview xüsusiyyətini istiqamətləndirilmiş şəkildə həyata keçirmə.

---

## 📋 Rollout Mərhələləri

### **Mərhələ 1: Pre-Rollout Yoxlama (Staging)**

- [ ] **Docker konteynerləri yoxla**

  ```bash
  docker ps | grep atis
  ```

  Gözlənirlər: `atis_backend`, `atis_frontend`, `atis_postgres`, `atis_redis`

- [ ] **Backend health-check**

  ```bash
  curl -s http://localhost:8000/health | jq
  ```

  Gözlənirlər: `{"status": "ok"}`

- [ ] **Frontend yüklənməsi**
  - Brauzer açıb `http://localhost:5173` ziyarət et
  - Region Admin panelini aç → User Management
  - Modal açmaya çalış (hər hansı user-ə kliklə)

---

### **Mərhələ 2: Feature Flag Açılması (Staging)**

#### **Seçən A: Environment Variable ilə (Tövsiyə edilən)**

```bash
# Backend konteynerində env dəyişənini dəyiş
docker exec -it atis_backend bash

# .env faylını redaktə et
vi /app/.env

# Aşağıdakı sətri tap və dəyiş:
# FEATURE_PERMISSION_PREVIEW=false  →  FEATURE_PERMISSION_PREVIEW=true
```

Və ya birbaşa:

```bash
docker exec -it atis_backend bash -c \
  "sed -i 's/FEATURE_PERMISSION_PREVIEW=false/FEATURE_PERMISSION_PREVIEW=true/' /app/.env"
```

#### **Seçən B: Laravel Config ilə (Tez sınama üçün)**

```bash
docker exec -it atis_backend php artisan config:clear
docker exec -it atis_backend php artisan config:cache
```

#### **Backend-i Yenidən Başlat**

```bash
docker restart atis_backend

# Gözlə 3-5 saniyə...
docker logs -f atis_backend
```

Log-da `Application ready` görünəndə davam et.

---

### **Mərhələ 3: Manual Testing (Staging)**

#### **Test 1: Metadata Endpoint Yoxlaması**

```bash
curl -s "http://localhost:8000/api/regionadmin/users/permissions/meta" \
  -H "Authorization: Bearer <YOUR_TOKEN>" | jq '.data.features'
```

**Gözlənirlər:**

```json
{
  "permission_preview": true
}
```

#### **Test 2: Modal-da Preview Açılması**

1. Brauzer-də Region Admin → User Management
2. Hər hansı user-ə kliklə (edit modal açılsın)
3. **Permissions** tab-ə keç
4. Hər hansı permission seç/əks-seç (1-2 test)
5. **Continue** / **Davam et** düyməsinə kliklə

**Gözlənirlər:**

- Preview overlay açılmalı (gözəl dizayn, Azerbaijanca)
- Əlavə edilən icazələr görsənən rəng ilə (`green`/badge)
- Silinən icazələr xəbərdarlıq rəngi ilə (`red`)
- **Apply Changes** / **Dəyişiklikləri Tətbiq Et** düymə varsa düymə + **Cancel**

#### **Test 3: Risky Changes Sınamaması**

1. Hər hansı permission seç (məs. `users.create`)
2. Preview overlay açılsın
3. "Asılılıqlar çatışmır" xəbərdarlığı gözükməsə ...  
   → Sifara `missing_dependencies` əlavə edin (`backend/tests/Feature/RegionAdminPermissionValidateDetailedTest.php` görin)
4. Preview-də **xəbərdarlıq səviyyəsində** göstərildiyini yoxla
5. **Apply** düyməsinə (riski qeyd edib) kliklə
6. Modal bağlansın, user güncəllənsən

---

### **Mərhələ 4: Feature Flag Bağlanması (Rollback)**

Əgər problem yaransa, **bir kliklə** feature flag-i bağla:

```bash
docker exec -it atis_backend bash -c \
  "sed -i 's/FEATURE_PERMISSION_PREVIEW=true/FEATURE_PERMISSION_PREVIEW=false/' /app/.env"

docker restart atis_backend
```

Frontend-də modal açıldıqda:

- Preview overlay **görünməməli**
- Əvəzində Alert: "İcazə preview-ı mövcud deyil"
- Eski davranış (birbaşa save) davam etməli

---

### **Mərhələ 5: Production Hazırlığı**

#### **Pre-Deploy Checklist**

- [ ] Staging-də bütün testlər keçib
- [ ] Backend testləri keçib:

  ```bash
  docker exec -it atis_backend php artisan test --filter="RegionAdminPermissionValidate"
  ```

  **Gözlənirlər:** `5 passed (21 assertions)`

- [ ] Frontend typecheck keçib:

  ```bash
  cd frontend && npm run typecheck
  ```

- [ ] Logs yoxlanıb (error yoxdur):
  ```bash
  docker logs atis_backend | tail -20
  docker logs atis_frontend | tail -20
  ```

#### **Production Deploy**

1. **Prod `.env` hazırlama:**

   ```bash
   # Əgər staging-dən copy edirsə, əmin ol:
   FEATURE_PERMISSION_PREVIEW=false  # Başlanğıcda false (canary)
   ```

2. **Deploy**

   ```bash
   # (Sizin deployment prosesində - docker push, k8s, və s.)
   ```

3. **Post-Deploy Yoxlama:**
   - [ ] Prod modal açılır
   - [ ] Permission preview **görünmür** (flag=false)
   - [ ] Alerts normal göstərilir
   - [ ] Permissions işləri davam edir (eski davranış)

#### **Staged Rollout (Canary)**

**Gün 1:** 10% traffic/users

```bash
# Prod-da sınama qrupunda feature enabled
FEATURE_PERMISSION_PREVIEW=true  # Yalnız test users-ə

# Manual test
curl -s "https://prod-api.atis.az/api/regionadmin/users/permissions/meta" \
  -H "Authorization: Bearer <TEST_USER_TOKEN>" | jq '.data.features'
```

**Gün 2-3:** 50% traffic

- Monitor logs: `Permission validation errors`, `dryRunValidate calls`
- Feedback topla

**Gün 4+:** 100% traffic

- Tam enable edilib

---

## 🔄 Rollback Proseduru

**Vəziyyət:** Feature flag production-da activated, lakin bugs aşkar olub.

1. **Fərli bağla:**

   ```bash
   # K8s/Docker/Server-ə erişib
   FEATURE_PERMISSION_PREVIEW=false
   # və ya
   export FEATURE_PERMISSION_PREVIEW=false
   ```

2. **Konteyner yenidən başlat:**

   ```bash
   kubectl rollout restart deployment/atis-backend
   # və ya
   docker restart atis_backend
   ```

3. **Yoxla:**

   - Frontend-də modal açıl
   - Preview overlay **yoxdur**
   - Xəbərdarlıq banner görünür

4. **Monitoring:**
   - 1 saat gözlə
   - Error rates normal olduğunu yoxla

---

## 📊 Monitoring & Alerts (Post-Rollout)

### **Gözləniləcək Metrikalar**

- **Dry-run API çağırışları:** `POST /api/regionadmin/users/permissions/validate`
  - Gözlənirlər: 10-20% permission assignments-dan
  - Success rate: >99%
- **Permission save success rate:**

  - Gözlənirlər: >=99%
  - Əgər <98% → Alert

- **Error logs:**
  - `missing_dependencies` warnings normal (info level)
  - Sql/DB errors **olmamağı**
  - 500 errors → Alert

### **Log Search Queries**

```bash
# Backend logs - permission validations
docker logs atis_backend | grep -i "permission.*validat"

# Frontend console - dry-run calls
# Browser DevTools → Console → filter by "validat"

# Audit events
# Database query:
# SELECT * FROM audit_logs WHERE entity_type = 'User' AND action = 'permission_sync' LIMIT 20;
```

---

## 🔗 Related Files

- **Feature Flag Config:** `/backend/config/feature_flags.php`
- **API Endpoint:** `/backend/app/Http/Controllers/RegionAdmin/RegionAdminUserController.php::validatePermissions()`
- **Service Logic:** `/backend/app/Services/RegionAdmin/RegionAdminPermissionService.php::dryRunValidate()`
- **Frontend Hook:** `/frontend/src/hooks/usePermissionDiff.ts`
- **Frontend Component:** `/frontend/src/components/modals/UserModal/components/PermissionDiffPreview.tsx`
- **Feature Docs:** `/documentation/FEATURE_PERMISSION_PREVIEW.md`

---

## ❓ FAQ

**Q: Feature flag off olduqda performance-da fərq olacaqmı?**

- A: Yox. Dry-run endpoint call-u skipped olacaq, preview overlay görünməyəcək. Eski davranış tam davam edəcək.

**Q: İlk deploy-də false başlanmalımı?**

- A: **Evet**, canary/staging üçün. Bunu 1-2 gün test etdikdən sonra 100% enable edin.

**Q: Rollback-dən sonra data loss olacaqmı?**

- A: Yox. Feature flag UI davranışını əngəlləyir, databasə salmış permissions dəyişməz.

**Q: Eger prodda error gəlsə nə etməli?**

- A: Dərhal rollback edin (Mərhələ 2 bölüm "Production-da Rollback"). Logs-ı toplansın, team-ə göndərsin.

---

**Hazırlanmış:** GitHub Copilot  
**Təsdiq edən:** [Op Manager / Tech Lead]  
**Tarix:** 2025-12-10
