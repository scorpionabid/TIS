# ATIS DB — Boş Cədvəllər Analizi və Təkmilləşdirmə Planı

> **Tarix:** 2026-03-16
> **Hazırladı:** Claude Code (Sonnet 4.6)
> **Məqsəd:** 126 boş cədvəlin təsnifatı, risk qiymətləndirməsi və prioritetli təmizlik/aktivasiya planı

---

## 1. Ümumi Vəziyyət

`pg_stat_user_tables` sorğusuna görə 181 cədvəldən **126-sı tamamilə boşdur (n_live_tup = 0)**.

### Fəal cədvəllər (məlumat var)
| Cədvəl | Sətir sayı | Qeyd |
|--------|-----------|------|
| `telescope_entries` | ~14.9M | Log — çox böyük, bax §5 |
| `telescope_entries_tags` | ~15.7M | Log |
| `activity_logs` | ~36K | |
| `report_table_responses` | ~7.3K | Əsas iş axını |
| `notifications` | ~29.7K | |
| `users` | ~1041 | |
| `report_tables` | 46 | |
| `tasks` | 48 | |
| `documents` | ~714 | |

---

## 2. Boş Cədvəllərin Qruplaşdırılması

### 🟢 QRU D — İnfrastruktur (boş olması normaldır)

Bu cədvəllər yalnız müvafiq proseslər işlədikdə doldurulur. **Heç bir əməliyyat tələb olunmur.**

| Cədvəl | İzahat |
|--------|--------|
| `cache`, `cache_locks` | Laravel cache driver (file/redis rejimindədirsə boş qalar) |
| `job_batches` | `Bus::batch()` istifadə olunanda doldurulur |
| `password_reset_tokens` | Şifrə sıfırlama sorğusu olduqda |
| `telescope_monitoring` | Telescope monitoring feature aktivdirsə |
| `session_activities` | Session-based activity tracking |
| `access_tracking` | Request-level tracking, yüklənmə zamanı |
| `account_lockouts` | Brute-force kilidlənmələr olduqda |

---

### 🟡 QRUP B — Qurulmuş amma aktivləşdirilməmiş funksionallıq

Model + Controller + Route mövcuddur, lakin məlumat yoxdur. Bu xüsusiyyətlər hazırlanıb amma istifadəyə verilməyib.

#### B1. Qiymətləndirmə Sistemi (Assessment) — 12 cədvəl
> BSQ/KSQ nəticələri, müəllim qiymətləndirmə mərhələləri

| Cədvəl | Prioritet |
|--------|-----------|
| `assessment_types` | Yüksək |
| `assessment_stages` | Yüksək |
| `assessment_entries` | Yüksək |
| `bsq_results` | Yüksək |
| `ksq_results` | Yüksək |
| `school_assessments` → 1 sətir var | — |
| `assessment_excel_imports` | Orta |
| `assessment_analytics` | Aşağı |
| `assessment_result_fields` | Orta |
| `assessment_type_institutions` | Orta |
| `bulk_assessment_sessions` | Orta |
| `class_assessment_results` | Orta |
| `teacher_assessment_scores` | Orta |
| `growth_bonus_configs` | Aşağı |

**Planlaşdırılan əməliyyat:** BSQ/KSQ funksionallığı artıq frontend-də mövcuddursa, seed data ilə `assessment_types` cədvəlini doldurmaq. Hazır deyilsə, frontend Routes-dan gizlətmək.

---

#### B2. Davamiyyət Sistemi (Attendance) — 8 cədvəl
> Sinif, məktəb, məktəbəqədər davamiyyət

| Cədvəl | Prioritet |
|--------|-----------|
| `class_attendance` | Yüksək |
| `school_attendance` | Yüksək |
| `daily_attendance_summary` | Orta |
| `preschool_attendance` | Orta |
| `preschool_attendance_photos` | Aşağı |
| `attendance_records` | Orta |
| `attendance_reports` | Aşağı |
| `attendance_patterns` | Aşağı |

**Planlaşdırılan əməliyyat:** Əgər davamiyyət modulu istifadəyə verilməyibsə, onboarding planına daxil etmək.

---

#### B3. Dərs Cədvəli Sistemi (Schedule) — 8 cədvəl
> Dərs saatları, şablonlar, konflikt yoxlaması

| Cədvəl | Prioritet |
|--------|-----------|
| `schedules` | Yüksək |
| `schedule_templates` | Yüksək |
| `schedule_sessions` | Yüksək |
| `time_slots` | Yüksək |
| `schedule_slots` | Orta |
| `schedule_generation_settings` | Orta |
| `schedule_template_usages` | Aşağı |
| `schedule_conflicts` | Aşağı |
| `rooms` | Orta |

**Planlaşdırılan əməliyyat:** `time_slots` seed data tələb edir (standart 45 dəqiqəlik dərslər). Aktivləşdirmə üçün məktəblərlə koordinasiya lazımdır.

---

#### B4. Müəllim Profil Sistemi — 10 cədvəl
> Sertifikatlar, qiymətləndirmələr, iş yükü

| Cədvəl | Prioritet |
|--------|-----------|
| `teacher_achievements` | Orta |
| `teacher_certificates` | Yüksək |
| `teacher_certifications` | Orta |
| `teacher_evaluations` | Yüksək |
| `teacher_professional_developments` | Orta |
| `teacher_profile_approvals` | Yüksək |
| `teacher_subjects` | Yüksək |
| `teacher_verifications` | Orta |
| `teacher_workplaces` | Yüksək |
| `teacher_availability` | Aşağı |
| `teaching_loads` | Orta |
| `school_staff` | Yüksək |

**Qeyd:** `teacher_profiles` cədvəlində artıq 1 sətir var — sistem müəllim profili üçün hazırdır. `school_staff` ilk populyasiya edilməlidir.

---

#### B5. Təsdiq İş Axını (Approval Workflow) — 7 cədvəl
> Çox səviyyəli sənəd/qərar təsdiq prosesləri

| Cədvəl |
|--------|
| `approval_workflows` |
| `approval_workflow_templates` |
| `approval_templates` |
| `approval_delegations` |
| `approval_delegates` |
| `approval_notifications` |
| `approval_audit_logs` |

**Qeyd:** `approval_actions` cədvəlində 1 sətir var — baza qurulumu var. Bu modul mürəkkəbdir, ayrıca planlaşdırma tələb edir.

---

#### B6. Akademik Təqvim — 5 cədvəl

| Cədvəl | Prioritet |
|--------|-----------|
| `academic_years` | Yüksək |
| `academic_terms` | Yüksək |
| `academic_calendars` | Orta |
| `academic_assessments` | Orta |
| `academic_performance_summaries` | Aşağı |

**Planlaşdırılan əməliyyat:** `academic_years` (2024-2025, 2025-2026) ilə seed data yaratmaq. Bir çox modul buna bağlıdır.

---

#### B7. Şagird və Sinif İdarəetməsi — 5 cədvəl

| Cədvəl | Prioritet |
|--------|-----------|
| `students` | Yüksək |
| `classes` | Yüksək |
| `student_enrollments` | Yüksək |
| `grade_tags` | Orta |
| `grade_grade_tag` | Aşağı |

**Qeyd:** Bu sistem fəal olmadan davamiyyət, qiymət, cədvəl modulları işləyə bilməz. **Əsas prerekvizitdir.**

---

#### B8. Psixologiya Dəstəyi — 3 cədvəl

| Cədvəl | Prioritet |
|--------|-----------|
| `psychology_assessments` | Orta |
| `psychology_sessions` | Orta |
| `psychology_notes` | Aşağı |

---

#### B9. Anbar / Texniki Xidmət — 3 cədvəl

| Cədvəl | Prioritet |
|--------|-----------|
| `inventory_items` | Orta |
| `inventory_transactions` | Aşağı |
| `maintenance_records` | Aşağı |

---

#### B10. Monitorinq / Analitika — 6 cədvəl

| Cədvəl |
|--------|
| `performance_metrics` |
| `region_performance_cache` |
| `report_results` |
| `report_schedules` |
| `reports` |
| `statistics` |
| `indicator_values` |
| `indicators` |
| `rating_configs` |

---

#### B11. Digər Qurulmuş Modullar

| Cədvəl | Qrup |
|--------|------|
| `system_configs` | Konfiqurasiya |
| `notification_templates` | Bildiriş şablonları |
| `olympiad_level_configs` | Olimpiada |
| `departments` | Şöbə idarəetmə |
| `education_sectors` | Sektor |
| `institution_audit_logs` | Audit |
| `institution_import_history` | Import tarixçəsi |
| `institution_types` | Qurum növləri |
| `security_alerts` | Təhlükəsizlik |
| `security_incidents` | Təhlükəsizlik |
| `uploads` | Fayl yükləmə |
| `user_sessions` | Sessiya idarəetmə |
| `user_storage_quotas` | Disk kvotası |
| `survey_deadline_logs` | Sorğu |
| `task_checklists` | Tapşırıq |
| `task_comments` | Tapşırıq |
| `task_notifications` | Tapşırıq |
| `task_delegation_history` | Tapşırıq |
| `task_templates` | Tapşırıq |
| `task_reports` | Tapşırıq |
| `document_shares` | Sənəd |
| `document_authority_matrix` | Sənəd |
| `absence_requests` | Qayıb sorğuları |

---

### 🔴 QRUP C — Yetim Schema (Model/Controller yoxdur)

Bu cədvəllər üçün backend kodu yazılmayıb — yalnız migration mövcuddur.

#### C1. Tam yetim — Silmək tövsiyə edilir

| Cədvəl | Qeyd |
|--------|------|
| `academic_performance_summaries` | Analitika — `academic_assessments`-dən hesablanmalıdır |
| `approval_analytics` | Analitika — digər approval cədvəllərindən hesablanmalıdır |
| `assessment_comparisons` | Hec bir model/controller yoxdur |
| `assessment_notifications` | `approval_notifications` ilə üst-üstə düşür |
| `assessment_participants` | Yetim |
| `assessment_targets` | Yetim |
| `attendance_patterns` | `attendance_records`-dən törəmə olmalı idi |
| `competency_frameworks` | Yetim — böyük feature, tamamlanmayıb |
| `compliance_monitoring` | Yetim |
| `data_visibility` | Yetim — row-level security üçün nəzərdə tutulmuş ola bilər |
| `monitoring_dashboards` | Yetim |
| `performance_trends` | Analitika — `performance_metrics`-dən hesablanmalıdır |
| `task_authority_matrix` | Yetim |

#### C2. Pivot/Junction cədvəllər (boş olması normaldır)

| Cədvəl | Bağlantı |
|--------|---------|
| `permission_role` | Spatie roles (bu adla deyil, `role_has_permissions` istifadə olunur) |
| `role_user` | Spatie roles (bu adla deyil, `model_has_roles` istifadə olunur) |
| `grade_grade_tag` | Grades ↔ GradeTags (cədvəl boşdur çünki grade_tags boşdur) |
| `subject_enrollments` | Students ↔ Subjects (students boşdur) |
| `task_dependencies` | Task ↔ Task |
| `task_sub_delegations` | Delegation iyerarxiyası |

**Qeyd:** `permission_role` və `role_user` artıq istifadə edilmir — Spatie library əvəzinə `role_has_permissions` və `model_has_roles` aktivdir. Bu iki cədvəl silinə bilər.

---

## 3. ⚠️ Kritik Müşahidə: `institutions` cədvəli

`regions` və `sectors` cədvəlləri boşdur, lakin **app faktiki olaraq `institutions` iyerarxiyasından istifadə edir:**

```
Level 1 → ministry         (1 qurum: Agentlik)
Level 2 → regional_education_department  (2 qurum: Şəki-Zaqatala, LARTİ)
Level 3 → sector_education_office        (Rayon sektorları)
Level 4 → secondary_school              (Məktəblər)
```

`regions` → `sectors` → `institutions` strukturu hazırlanmış amma heç vaxt istifadəyə verilməmişdir. App `institutions.parent_id` iyerarxiyası ilə işləyir.

**Tövsiyə:** `regions` və `sectors` cədvəllərini migration-da saxla, amma `institution_types` cədvəlini doldurmaq üçün seed hazırla.

---

## 4. 🚀 Aktivasiya Prioritet Planı

### Faza 1 — Əsas Prerekvizitlər (Dərhal)
Bu olmadan digər modullar işləyə bilməz:

- [ ] **`academic_years`** seed data — 2023-2024, 2024-2025, 2025-2026
- [ ] **`institution_types`** seed data — məktəb növlərini doldur
- [ ] **`system_configs`** — tətbiq parametrləri (URL, ad, logo, smtp)
- [ ] **`notification_templates`** — email/push şablonları

### Faza 2 — Müəllim Modulu
- [ ] **`school_staff`** — məktəb personalı əlavə etmək mexanizmi
- [ ] **`teacher_workplaces`** — müəllim ↔ məktəb bağlantısı
- [ ] **`teacher_subjects`** — fənn müəllimləri
- [ ] **`teacher_evaluations`** — qiymətləndirmə forması

### Faza 3 — Şagird Modulu
- [ ] **`students`** + **`classes`** + **`student_enrollments`**
- Bu olmadan davamiyyət, cədvəl, qiymət modulları işləyə bilməz

### Faza 4 — Davamiyyət Modulu
- [ ] `class_attendance`
- [ ] `daily_attendance_summary`
- [ ] `attendance_reports`

### Faza 5 — Dərs Cədvəli
- [ ] `time_slots` seed (dərs saatı şablonları)
- [ ] `schedule_templates`
- [ ] `schedules`

### Faza 6 — Qiymətləndirmə (BSQ/KSQ)
- [ ] `assessment_types` seed
- [ ] `assessment_stages` seed
- [ ] BSQ/KSQ nəticə girişi

### Faza 7 — Analytics & Reporting
- Yuxarıdakı modullar aktiv olduqdan sonra avtomatik dolacaq

---

## 5. 🧹 Təmizlik Planı

### 5.1 Telescope Entries — ACİL

```sql
-- Mövcud vəziyyət:
-- telescope_entries:      ~14.9M sətir
-- telescope_entries_tags: ~15.7M sətir

-- Disk istifadəsi yoxla:
SELECT pg_size_pretty(pg_total_relation_size('telescope_entries'));
SELECT pg_size_pretty(pg_total_relation_size('telescope_entries_tags'));
```

**Tövsiyə:**
1. `config/telescope.php`-da `prune` cədvəlini konfiqurasiya et (48 saatdan köhnə log sil)
2. Cron job: `php artisan telescope:prune --hours=48`
3. Yaxud production-da Telescope-u tamamilə deaktiv et

### 5.2 Silinməsi Tövsiyə Edilən Yetim Cədvəllər

Aşağıdakı cədvəllər üçün migration yaz (`dropIfExists`):

```php
// Tam yetim — model, controller, route yoxdur:
Schema::dropIfExists('academic_performance_summaries');
Schema::dropIfExists('approval_analytics');
Schema::dropIfExists('assessment_comparisons');
Schema::dropIfExists('assessment_notifications');
Schema::dropIfExists('assessment_participants');
Schema::dropIfExists('assessment_targets');
Schema::dropIfExists('attendance_patterns');
Schema::dropIfExists('competency_frameworks');
Schema::dropIfExists('compliance_monitoring');
Schema::dropIfExists('data_visibility');
Schema::dropIfExists('monitoring_dashboards');
Schema::dropIfExists('performance_trends');
Schema::dropIfExists('task_authority_matrix');

// Köhnə Spatie pivot cədvəlləri (artıq model_has_roles istifadə olunur):
Schema::dropIfExists('permission_role');
Schema::dropIfExists('role_user');
```

> ⚠️ **Silmədən əvvəl:**
> - `grep -r "permission_role\|role_user" backend/app/` ilə heç bir kod istinadı olmadığını yoxla
> - Backup al: `pg_dump ... > backup_before_cleanup.sql`

### 5.3 Deaktiv Edilməsi Tövsiyə Edilən Cədvəllər

`regions` və `sectors` cədvəlləri — məlumat yoxdur, amma digər cədvəllər bağlıdır. **Silmə, sadəcə boş saxla.** App `institutions` iyerarxiyasından istifadə edir.

---

## 6. 📊 Xülasə Cədvəli

| Qrup | Cədvəl sayı | Tövsiyə |
|------|------------|---------|
| 🟢 D — İnfrastruktur | 7 | Heç nə etmə |
| 🟡 B — Qurulmuş, aktivləşdirilməmiş | ~95 | Faza planına əsasən aktivləşdir |
| 🔴 C1 — Tam yetim | 13 | Migration ilə sil |
| 🔴 C2 — Köhnə pivot | 6 | 2-sini sil (permission_role, role_user), 4-ü saxla |

---

## 7. Növbəti Addım

1. **Bu həftə:** Telescope prune cron job əlavə et (disk sahəsi azaldır)
2. **Bu ay:** Faza 1 seed data yaz (`academic_years`, `institution_types`, `system_configs`)
3. **Növbəti sprint:** Müəllim modulu aktivasiyası (Faza 2)
4. **Ayrıca təsdiq lazımdır:** Yetim cədvəllərin silinməsi (Faza C1) — backup sonrası

---

*Bu sənəd dinamikdir — modullar aktivləşdikcə yenilənməlidir.*
