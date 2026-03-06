## 📊 Analytics & Reporting

Analytics endpointləri modul səviyyəsində təşkil olunub:

- Sorğu analitikası → [📊 Survey & Response Management](#-survey--response-management) cədvəlində `surveys/analytics/*` marşrutları
- Tapşırıq analitikası → [📄 Document & Task Management](#-document--task-management) bölməsində `tasks/analytics/*`
- Sənəd analitikası → `documents/analytics/*`
- Psixologiya analitikası → `psychology/analytics/*`
- Inventar analitikası → `inventory/analytics/*`
- Şagird/qiymət analitikası → [🎓 Educational & Academic Management](#-educational--academic-management) bölməsində müvafiq cədvəllər
- Region/Sektor dashboard analitikası → [🌍 Role-Specific Dashboards](#-role-specific-dashboards)

Əgər ümumi birləşdirilmiş hesabat tələb olunursa, `DashboardController::getStats()` (`/api/dashboard/stats`) və modul-özəl `reports/*` marşrutları istifadə edilir.

---

