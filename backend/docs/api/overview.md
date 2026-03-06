# 🚀 ATİS Backend API Documentation

**Version**: v1.3 (draft)  
**Base URL**: `/api`  
**Development URL**: `http://localhost:8000/api`
**Authentication**: Bearer Token (Laravel Sanctum)  
**Total Endpoints**: 960+ (php artisan route:list --json, September 2025)  
**Last Verified**: September 24, 2025  
**System Status**: Zəhmət olmasa `/api/health` və `/api/version` endpoint-ləri ilə yoxlayın

## 🎯 System Status & Recent Updates

### Cari Yoxlamalar
- **Database**: `php artisan migrate:status` ilə təsdiqləyin (dev/prod fərqlidir)
- **Docker**: `./start.sh` skripti backend-i 8000, frontend-i 3000 portunda işə salır
- **Authentication**: Laravel Sanctum aktivdir (`config/sanctum.php`)
- **API Endpoints**: `php artisan route:list --json | jq length` → 967 route
- **Health Check**: `GET /api/health`, `GET /api/ping`, `GET /api/version`
- **Performance**: Prod monitorinqi üçün `storage/logs/laravel.log` və APM istifadə olunur

## 🔄 Refactored Controllers

As part of our ongoing efforts to improve code quality and maintainability, several controllers have been refactored to use a service-oriented architecture. These changes are backward compatible and do not affect the API contract.

### Refactored Controllers:
- `UserController` → Now uses `UserCrudService` and `UserPermissionService`
- `ApprovalApiController` → Refactored with improved error handling
- `InstitutionCRUDController` → Enhanced with better separation of concerns
- `SectorController` → Improved data access patterns
- `TaskController` → Better service layer integration
- And more...

These changes provide better testability, maintainability, and performance while maintaining the same API contract.

## 📋 Table of Contents

1. [Refactored Controllers](#-refactored-controllers)
2. [Authentication & Session Management](#authentication--session-management)
3. [User Management](#user-management)
4. [Institution & Hierarchy Management](#institution--hierarchy-management)
5. [Survey & Response Management](#survey--response-management)
6. [Task Management](#task-management)
7. [Document Management](#document-management)
8. [Notification Management](#notification-management)
9. [Academic Management](#academic-management)
10. [Psychology Support](#psychology-support)
11. [Teacher Performance](#teacher-performance)
12. [Inventory Management](#inventory-management)
13. [Regional Administration](#regional-administration)
14. [Analytics & Reporting](#analytics--reporting)

---

