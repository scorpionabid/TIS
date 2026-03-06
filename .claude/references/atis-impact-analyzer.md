# ATİS Impact Analysis Guide

**Məqsəd**: Kod dəyişikliklərinin digər faylara və funksionallıqlara təsirini analiz etmək.

## 🎯 NƏYƏ GÖRƏ LAZIMDIR?

Siz sadə bir request verirsiz:
> "User modalına telefon field əlavə et"

Claude bilməlidir:
1. ✅ Hansı fayllar dəyişəcək?
2. ⚠️ Başqa hansı səhifələr təsirlənəcək?
3. 🔴 Database migration lazımdır?
4. 🟡 Permission yoxlamaq lazımdır?
5. 📊 Test etmək lazımdır?

## 📊 İMPACT SEVİYYƏLƏRİ

### 🟢 AŞAĞI RISK (Isolated Changes)
```
Xüsusiyyətlər:
- Yalnız 1-2 fayl dəyişir
- Mövcud API-ya toxunmur
- Database dəyişikliyi yoxdur
- Başqa komponentlərə təsir etmir
- Test etmək asan

Nümunələr:
- Button color dəyişikliyi
- Yeni icon əlavə etmək
- Text dəyişdirmək
- Loading state əlavə etmək
```

**Template**:
```markdown
⚠️ İMPACT ANALİZİ: 🟢 AŞAĞI

📁 Dəyişən Fayllar (1):
- frontend/src/pages/Users.tsx (1 button dəyişikliyi)

🔗 Təsir Olunan Səhifələr: YOX

📊 Test Tələbi: MINIMAL
- UI görünüş testi

⏱️ Təxmini Vaxt: 5-10 dəqiqə
```

---

### 🟡 ORTA RISK (Connected Changes)
```
Xüsusiyyətlər:
- 3-5 fayl dəyişir
- API endpoint dəyişikliyi VAR
- Database migration OLAR
- Bir neçə komponentə təsir edir
- Integration test lazımdır

Nümunələr:
- Yeni filter əlavə etmək (frontend + backend)
- User modal-a field əlavə etmək (+ migration)
- Permission check əlavə etmək
- Export funksionallığı
```

**Template**:
```markdown
⚠️ İMPACT ANALİZİ: 🟡 ORTA

📁 Dəyişən Fayllar (4):
1. frontend/src/pages/Users.tsx (modal update)
2. frontend/src/services/userService.ts (API call update)
3. backend/app/Http/Controllers/UserController.php (validation)
4. backend/database/migrations/xxxx_add_phone_to_users.php (NEW)

🔗 Təsir Olunan Səhifələr (2):
1. User detail page (phone display)
2. User profile page (phone edit)

📊 Test Tələbi: ORTA
- Unit test: UserController@update
- Integration test: User update workflow
- Frontend: UserModal component test

⚠️ XƏBƏRDARLİQ:
- Migration production-da çalışacaq (DİQQƏT!)
- Phone validation tələb olunur (format check)

⏱️ Təxmini Vaxt: 1-2 saat
```

---

### 🔴 YÜKSƏK RISK (System-Wide Changes)
```
Xüsusiyyətlər:
- 6+ fayl dəyişir
- Core system-ə toxunur (auth, permission, hierarchy)
- Database schema dəyişikliyi
- Çoxlu komponentə təsir edir
- E2E test lazımdır
- Production data-ya TƏSİR EDƏ BİLƏR!

Nümunələr:
- Permission system dəyişikliyi
- Institution hierarchy dəyişikliyi
- Authentication flow dəyişikliyi
- Role system refactoring
```

**Template**:
```markdown
⚠️ İMPACT ANALİZİ: 🔴 YÜKSƏK

📁 Dəyişən Fayllar (8+):
**Backend**:
1. PermissionController.php (NEW - 10 methods)
2. UserController.php (permission sync)
3. RoleController.php (permission matrix)
4. Permission model (scope methods)
5. PermissionSeeder.php (new permissions)

**Frontend**:
1. Permissions.tsx (NEW page)
2. UserModal.tsx (permission checkboxes)
3. PermissionService.ts (API calls)
4. useAuth.tsx (permission hooks)

🔗 Təsir Olunan Səhifələr (5+):
1. User management page
2. Role management page
3. All dashboards (permission-based UI)
4. Navigation menu (permission-based links)
5. Profile page (user permissions display)

🔐 TƏHLÜKƏ ZONALARI:
- 🚨 Production permission data dəyişə bilər
- 🚨 Mövcud userlərin səlahiyyətləri təsirlənə bilər
- 🚨 Backend cache invalidation lazımdır
- 🚨 Frontend permission state sync problemi

📊 Test Tələbi: MAKSİMAL
- Unit test: 10+ test cases
- Integration test: Full permission workflow
- E2E test: User role assignment flow
- Performance test: 290+ permissions load time
- Security test: Permission bypass attempts

⚠️ KRİTİK XƏBƏRDARLIQ:
1. Production-da test etmək QADAĞANDIR!
2. Development-də tam test edilməlidir
3. Rollback planı MƏCBUR
4. Maintenance window planlamaq lazımdır

⏱️ Təxmini Vaxt: 14-20 saat (CLAUDE.md plan)

📋 TƏKLİF: Bu böyük dəyişiklik üçün FAZA-FAZA plan lazımdır!
```

---

## 🔍 İMPACT ANALİZ METODOLOGİYASI

### Addım 1: Fayl Dependency Analizi

**Verilmiş request**: "User modalına telefon field əlavə et"

**Analiz**:
```bash
# 1. Əsas fayl tap
Glob "**/UserModal.tsx"
# Tapıldı: frontend/src/components/modals/UserModal.tsx

# 2. Bu faylın import-larına bax (minimal oxu)
Read UserModal.tsx offset:0 limit:20
# İmportlar:
# - userService (API calls)
# - User type (TypeScript)
# - Form components

# 3. API service-ə bax
Grep "updateUser" frontend/src/services/userService.ts
# Tapıldı: updateUser method

# 4. Backend endpoint tap
Grep "PUT.*users" backend/routes/api.php
# Tapıldı: Route::put('/users/{id}', [UserController::class, 'update'])

# 5. Controller-ə bax (validation)
Grep "class UpdateUserRequest" backend/app/Http/Requests/
# Tapıldı: UpdateUserRequest.php

# 6. Database schema yoxla
Grep "phone" backend/database/migrations/ --files-with-matches
# Tapılmadı! → Migration lazımdır
```

**Nəticə**:
```markdown
📁 FAYLLAR:
1. UserModal.tsx (form field əlavə)
2. userService.ts (olar, amma API artıq update edir)
3. UpdateUserRequest.php (validation rule əlavə)
4. xxxx_add_phone_to_users.php (YENİ migration)

🔗 TƏSİR:
- UserDetail page (display phone)
- UserProfile page (edit own phone)

⚠️ RİSK: 🟡 ORTA (migration + validation)
```

---

## 🎯 İMPACT ANALİZ CHECKLIST

Hər dəyişiklik üçün bu sualları cavablandır:

### 📁 Fayl Təsiri
- [ ] Neçə fayl dəyişəcək? (1-2: 🟢, 3-5: 🟡, 6+: 🔴)
- [ ] Yeni fayl yaradılacaq?
- [ ] Mövcud faylın core logic-i dəyişəcək?

### 🗄️ Database Təsiri
- [ ] Migration lazımdır?
- [ ] Mövcud data dəyişəcək?
- [ ] Production data-ya təsir edəcək?
- [ ] Rollback asan edilir?

### 🔌 API Təsiri
- [ ] Yeni endpoint lazımdır?
- [ ] Mövcud endpoint dəyişəcək?
- [ ] Backward compatible?
- [ ] API contract breaking change?

### 🔐 Permission Təsiri
- [ ] Yeni permission lazımdır?
- [ ] Mövcud permission logic dəyişəcək?
- [ ] Hansı rollar təsirlənəcək?
- [ ] Permission cache invalidation?

### 🔗 Component Təsiri
- [ ] Component harada istifadə olunur?
- [ ] Proplar dəyişəcək?
- [ ] State management dəyişəcək?
- [ ] Parent componentlərə təsir edəcək?

### 📊 Test Təsiri
- [ ] Unit test lazımdır?
- [ ] Integration test lazımdır?
- [ ] E2E test lazımdır?
- [ ] Performance test lazımdır?

### ⏱️ Vaxt Təsiri
- [ ] Təxmini development vaxtı?
- [ ] Testing vaxtı?
- [ ] Code review vaxtı?
- [ ] TOTAL: ? saat

---

**DİQQƏT**: Hər impact analysis-dən sonra **istifadəçiyə təsdiq almaq MƏCBUR**!
