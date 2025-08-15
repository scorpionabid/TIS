# Frontend-Backend İnteqrasiya Planı

## 📊 Mövcud Vəziyyət
- ✅ **35% Tam İnteqrasiya**: 7 səhifə tam funksional
- ⚠️ **10% Qismən İnteqrasiya**: 2 səhifə qismən bağlı
- ❌ **55% İnteqrasiya Yoxdur**: 12 səhifə mock data

## 🎯 Məqsəd: 100% Tam Funksional Sistem

---

## **FAZA 1: Yüksək Prioritet (1-2 həftə)**

### 1. SchoolWorkload.tsx → workloadService.ts
**Backend:** TeachingLoadApiController (mövcud)  
**Endpoints:** `/api/teaching-loads`
```typescript
// Yaradılacaq: frontend/src/services/workload.ts
- getTeacherWorkloads()
- getWorkloadByTeacher() 
- updateWorkload()
- getWorkloadStatistics()
```

### 2. SchoolSchedules.tsx → scheduleService.ts  
**Backend:** ScheduleController (mövcud)  
**Endpoints:** `/api/schedules`
```typescript
// Yaradılacaq: frontend/src/services/schedule.ts
- getSchedules()
- createSchedule()
- updateSchedule() 
- deleteSchedule()
- getScheduleByClass()
```

### 3. Reports.tsx → reportsService.ts
**Backend:** ReportsController (mövcud)  
**Endpoints:** `/api/reports`
```typescript
// Yaradılacaq: frontend/src/services/reports.ts
- getReports()
- generateReport()
- exportReport()
- getReportTemplates()
```

### 4. Notifications.tsx → notificationService.ts
**Backend:** NotificationController (mövcud)  
**Endpoints:** `/api/notifications`
```typescript
// Yaradılacaq: frontend/src/services/notification.ts
- getNotifications()
- markAsRead()
- deleteNotification()
- createNotification()
```

**Faza 1 Nəticəsi:** 55% → 75% tam inteqrasiya

---

## **FAZA 2: Orta Prioritet (2-3 həftə)**

### 5. SurveyApproval.tsx 
**Backend:** SurveyController genişləndirmə  
**Yeni Endpoints:**
- `GET /api/surveys/pending-approval`
- `POST /api/surveys/{id}/approve`
- `POST /api/surveys/{id}/reject`

### 6. SurveyArchive.tsx
**Backend:** SurveyController genişləndirmə  
**Yeni Endpoints:**
- `GET /api/surveys/archived`
- `POST /api/surveys/{id}/archive`
- `POST /api/surveys/{id}/restore`

### 7. Settings.tsx → settingsService.ts
**Backend:** SystemConfigController (mövcud)  
**Endpoints:** `/api/system/config`
```typescript
// Yaradılacaq: frontend/src/services/settings.ts
- getSystemSettings()
- updateSettings()
- resetToDefaults()
```

### 8. Analytics.tsx → analyticsService.ts
**Backend:** Müxtəlif controller-lərdən data yığma  
**Endpoints:** `/api/analytics/*`
```typescript
// Yaradılacaq: frontend/src/services/analytics.ts
- getSystemStats()
- getUserStats()
- getPerformanceMetrics()
- getUsageReports()
```

**Faza 2 Nəticəsi:** 75% → 95% tam inteqrasiya

---

## **FAZA 3: Aşağı Prioritet (3-4 həftə)**

### 9. AuditLogs.tsx → SystemAuditLogController (YENİ)
**Backend Controller yaradılacaq:**
```php
// backend/app/Http/Controllers/SystemAuditLogController.php
- index() - Get all audit logs
- show() - Get specific audit log
- store() - Create audit log entry
- export() - Export audit logs
```

### 10. Performance.tsx → SystemPerformanceController (YENİ)
**Backend Controller yaradılacaq:**
```php
// backend/app/Http/Controllers/SystemPerformanceController.php
- getSystemMetrics()
- getDatabaseMetrics() 
- getServerMetrics()
- getResponseTimes()
```

### 11. Hierarchy.tsx
**Backend:** InstitutionHierarchyController genişləndirmə  
**Yeni Metodlar:**
- Full hierarchy management
- Drag & drop reordering
- Bulk operations

### 12. Regions.tsx & Sectors.tsx
**Yeni Backend Controllers:**
```php
// RegionController.php
// SectorController.php
```

**Faza 3 Nəticəsi:** 95% → 100% tam inteqrasiya

---

## 📅 **Təqvim və Ehtiyaclar**

### Həftə 1-2: Faza 1
- [ ] workloadService.ts
- [ ] scheduleService.ts  
- [ ] reportsService.ts
- [ ] notificationService.ts

### Həftə 3-4: Faza 2  
- [ ] Survey approval/archive
- [ ] settingsService.ts
- [ ] analyticsService.ts

### Həftə 5-6: Faza 3
- [ ] SystemAuditLogController  
- [ ] SystemPerformanceController
- [ ] Hierarchy enhancement
- [ ] Region/Sector controllers

## 🛠️ **Texniki Tələblər**

### Frontend Services Pattern:
```typescript
// BaseService-dən inherit
class WorkloadService extends BaseService {
  constructor() {
    super('/teaching-loads');
  }
  
  async getTeacherWorkloads() {
    return this.get('/teacher-workloads');
  }
}
```

### Backend API Pattern:
```php
// Standard Laravel Resource Controller
class WorkloadController extends Controller {
  public function index() { /* ... */ }
  public function store() { /* ... */ }  
  public function show() { /* ... */ }
  public function update() { /* ... */ }
  public function destroy() { /* ... */ }
}
```

### Frontend Component Pattern:
```typescript
// React Query integration
const { data, isLoading, error } = useQuery({
  queryKey: ['workloads'],
  queryFn: () => workloadService.getTeacherWorkloads()
});
```

## ✅ **Success Metrics**

- **Faza 1 sonunda:** Bütün mövcud backend controller-lər istifadə olunur
- **Faza 2 sonunda:** Əsas funksiyalar tam işləyir  
- **Faza 3 sonunda:** 100% tam funksional sistem

Bu plan tədrici olaraq sistemi tam funksional hala gətirəcək və istifadəçi təcrübəsini əhəmiyyətli dərəcədə yaxşılaşdıracaq.