## 🌍 Role-Specific Dashboards

> Əsasən `routes/api/dashboards.php` və `routes/api/regionadmin.php` faylları ilə idarə olunur.

| Prefix | Middleware | Təsvir |
| --- | --- | --- |
| `/api/dashboard/*` | `auth:sanctum` | Ümumi dashboard statistikası və activity feed |
| `/api/dashboard/superadmin-*` | `role:superadmin` | Sistem sağlamlığı, istifadəçi analitikası, inst. statistikası |
| `/api/regionadmin/*` | `role_or_permission:regionadmin|superadmin` + regional audit | RegionAdmin üçün dashboard, institusiyalar, istifadəçilər, hesabatlar, tapşırıqlar |
| `/api/regionadmin/classes` | `role:regionadmin` | Xüsusi sinif idarəetməsi, import/export (`routes/api/regionadmin.php`) |
| `/api/regionadmin/tasks` | `role_or_permission:regionadmin|superadmin` | Regional tapşırıq idarəetməsi |
| `/api/regionadmin/teachers` | eyni | Müəllimlər, fəaliyyət izlənməsi |
| `/api/regionadmin/reports` | eyni | Regional hesabatlar |
| `/api/sektoradmin/*` | `role:sektoradmin` | Sektor dashboard, sorğu cavabları, tapşırıq təsdiqi, şagird və müəllim statistikası |
| `/api/mektebadmin/*` | `role:mektebadmin` | Məktəb dashboard, müəllim/şagird idarəetməsi |
| `/api/school/*` | `role:schooladmin` | Məktəb səviyyəsində tapşırıqlar, şagirdlər, müəllimlər |

> Qeyd: Müəllim dashboard marşrutları TODO statusundadır (`routes/api/dashboards.php` faylındakı şərhlərə baxın).

---

