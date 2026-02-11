# 🚀 ATİS Backend API Documentation

**Version**: v1.3 (draft)  
**Base URL**: `/api`  
**Authentication**: Bearer Token (Laravel Sanctum)

> Bu fayl modul sənədlərinə giriş nöqtəsidir. Ətraflı endpoint siyahıları `docs/api/` kataloqunda saxlanılır.

## ⚡ Sürətli Baxış
- Sağlamlıq yoxlaması: `GET /api/health`, `GET /api/version`
- Endpoint statistikası: `php artisan route:list --json | jq length`
- Ətraflı status və yeniliklər: [docs/api/overview.md](docs/api/overview.md)

## 📚 Modul Sənədləri
- [Authentication & Session Management](docs/api/authentication.md)
- [User Management](docs/api/users.md)
- [Institution & Hierarchy Management](docs/api/institutions.md)
- [Survey & Response Management](docs/api/surveys.md)
- [Document, Task & Notification APIs](docs/api/documents_tasks.md)
- [Educational & Academic Modules](docs/api/education.md)
- [Psychology & Wellbeing](docs/api/psychology.md)
- [Inventory Management](docs/api/inventory.md)
- [Role-Specific Dashboards](docs/api/dashboards.md)
- [Security, Permissions & Roles](docs/api/security.md)
- [Analytics & Reporting Overview](docs/api/analytics.md)
- [Reference (Status Codes, Responses, Rate Limits)](docs/api/reference.md)
- [Legacy Task Endpoints](docs/api/tasks-legacy.md)

## 🛠️ Sənəd Qovluğu Strukturu
```
backend/
  API_DOCUMENTATION.md      # Bu indeks faylı
  docs/
    api/
      overview.md
      authentication.md
      users.md
      institutions.md
      surveys.md
      documents_tasks.md
      education.md
      psychology.md
      inventory.md
      dashboards.md
      analytics.md
      security.md
      reference.md
      tasks-legacy.md
```

Yeni modul əlavə ediləndə uyğun Markdown faylını `docs/api/` qovluğunda yaradın və yuxarıdakı siyahıya link əlavə edin.
