# ATİS - Educational Institution Management System

## Project Overview

ATİS is a comprehensive educational institution management system designed for Azerbaijan's education sector. The system provides role-based management tools for educational institutions at multiple hierarchical levels.

## System Architecture

### Backend (Laravel 11 + PHP 8.2)
- REST API with Laravel Sanctum authentication
- PostgreSQL/SQLite database support
- Role-based permission system (12 roles)
- Comprehensive educational data models

### Frontend (React 19 + TypeScript + Vite)
- Modern React with TypeScript for type safety
- Tailwind CSS 4.x design system
- Responsive, mobile-first design
- Real-time data with React Query

## Getting Started

### Prerequisites
- Node.js 18+ & npm
- PHP 8.2+
- Composer
- Docker (recommended)

### Installation
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/5ee25802-7811-4fa7-a0d8-a9535d5b1cec) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
=======
# ATİS - Azərbaycan Təhsil İdarəetmə Sistemi

[![Laravel](https://img.shields.io/badge/Laravel-11.x-red.svg)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4.svg)](https://tailwindcss.com)

## Layihə Haqqında

ATİS (Azərbaycan Təhsil İdarəetmə Sistemi) regional təhsil idarələrinin tam rəqəmsal transformasiyası üçün vahid, ierarxik idarəetmə platformasıdır. Sistem 700+ təhsil müəssisəsini əhatə edərək, məlumat toplama, təhlil və qərar qəbuletmə proseslərini avtomatlaşdırır.

## Texnoloji Stek

### Backend
- **Framework**: Laravel 11 + PHP 8.2+
- **Authentication**: Laravel Sanctum
- **Authorization**: Spatie Laravel Permission
- **Database**: PostgreSQL 15+ / SQLite (development)
- **Cache**: Redis 7+

### Frontend
- **Framework**: React 19 + TypeScript 5.x
- **Build Tool**: Vite 5.x
- **Styling**: Tailwind CSS 4.x
- **Components**: Custom Design System with CVA
- **State Management**: React Context API
- **HTTP Client**: Axios

### Infrastructure
- **Container**: Docker + Docker Compose
- **Web Server**: Nginx
- **Process Manager**: Supervisor

## Sistem İstifadəçiləri

- **SuperAdmin** (1-2 istifadəçi) - Sistem administratoru
- **RegionAdmin** (10+ istifadəçi) - Regional idarəetmə rəhbəri
- **RegionOperator** (60+ istifadəçi) - Regional əməliyyat specialisti
- **SektorAdmin** (70+ istifadəçi) - Sektor rəhbəri
- **SchoolAdmin** (700 istifadəçi) - Təhsil müəssisəsi rəhbəri
- **Müəllim** (700+ istifadəçi) - Təhsil işçisi

## Quick Start

### Tələblər

- Docker Desktop 20.10+
- Docker Compose 2.0+
- Git
- 8GB RAM minimum (16GB tövsiyə olunur)

### Lokal Development

```bash
# Repository klonlayın
git clone [repository-url]
cd ATİS

# Environment fayllarını yaradın
cp .env.example .env
cp frontend/.env.example frontend/.env

# Docker ilə başlatın
./start.sh

# Və ya lokal development üçün
./start.sh local
```

### Giriş URL-ləri

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001/api
- **Database**: localhost:5432
- **Redis**: localhost:6379

### Test İstifadəçiləri

- **superadmin** / admin123 (SuperAdmin)
- **admin** / admin123 (RegionAdmin)
- **testuser** / test123 (Müəllim)

## Əsas Komponentlər

### 1. Authentication & Authorization System
- ✅ Laravel Sanctum token-based authentication
- ✅ 12 rol və 48 icazə ilə hierarxik sistem
- ✅ Progressive account blocking
- ✅ Session timeout management

### 2. Institution Hierarchy Management
- ✅ 4-səviyyəli təhsil strukturu
- ✅ Nazirlik → Regional İdarə → Sektor → Məktəb
- ✅ 22 tam konfiqurasiya edilmiş institution

### 3. Survey Management System
- ✅ Dynamic form creation
- ✅ Advanced targeting system
- ✅ Real-time response collection
- ✅ Multi-level approval workflow

### 4. Hierarchical Task Management
- ✅ Authority-based task assignment
- ✅ Progress tracking və monitoring
- ✅ Regional hierarchy task distribution

### 5. File & Link Sharing Platform
- ✅ Hierarchical document library
- ✅ Time-based access restrictions
- ✅ Authority-based file size limits

### 6. School Academic Management
- ✅ Class-level attendance tracking
- ✅ Teaching load management (24 saat/həftə)
- ✅ Schedule generation və conflict detection

### 7. Data Approval Workflow System
- ✅ 8-table comprehensive approval system
- ✅ Multi-level approval chains
- ✅ Real-time approval tracking

## Frontend Architecture

### Design System
- **533 lines** SCSS design token system
- **CVA-based** component variants
- **Responsive** mobile-first design
- **Dark/Light** theme support

### Completed Components
- `ClassAttendanceTracker` - Real-time attendance management
- `ApprovalDashboard` - Director approval interface
- `TaskDashboard` - Authority-based task management
- `DocumentLibrary` - Hierarchical document browsing
- `ScheduleGenerator` - Advanced schedule creation
- `TeachingLoadManager` - Teaching load analytics

### Key Features
- **98% code duplication eliminated**
- **Modern React 19** with concurrent features
- **TypeScript** for type safety
- **Unified service layer** with BaseService pattern
- **Error boundaries** for stability

## Database Architecture

### Migration Status
- ✅ **55+ migrations** successfully executed
- ✅ **PostgreSQL/SQLite** cross-compatibility
- ✅ **22 institutions** seeded

### Core Tables
- `users` - İstifadəçi məlumatları
- `roles` & `permissions` - Rol və səlahiyyətlər
- `institutions` - Təhsil müəssisələri ierarxiyası
- `surveys` & `survey_responses` - Sorğu sistemi
- `tasks` & `task_progress_logs` - Tapşırıq sistemi
- `documents` - Sənəd idarəetməsi
- `approval_workflows` - Təsdiq prosesləri

## API Documentation

### Base URL
```
http://localhost:8001/api/
```

### Authentication
```bash
# Login
POST /api/login
Content-Type: application/json
{
  "login": "superadmin",
  "password": "admin123"
}

# Response
{
  "token": "sanctum_token",
  "user": {...},
  "permissions": [...]
}
```

### Core Endpoints
- `GET /institutions` - Institution hierarchy
- `POST /surveys` - Survey creation
- `GET /surveys/{id}/responses` - Survey responses
- `POST /tasks` - Task management
- `GET /approval-requests` - Approval queue

## Development Commands

### Backend
```bash
# Start backend server
php artisan serve --host=127.0.0.1 --port=8001

# Run migrations
php artisan migrate

# Seed institutions
php artisan db:seed --class=InstitutionHierarchySeeder
```

### Frontend
```bash
# Start development server
cd frontend && npm run dev

# Install dependencies
npm install

# Build for production
npm run build
```

## Performance & Security

### Performance Metrics
- **Page Load**: < 2 seconds (95th percentile)
- **API Response**: < 300ms average
- **Database Queries**: < 100ms standard
- **Bundle Size**: Optimized with Vite

### Security Features
- TLS 1.3 encryption
- CORS configuration
- XSS & CSRF protection
- File upload validation
- Rate limiting per role
- Comprehensive audit logging

## Testing

```bash
# Backend tests
php artisan test

# Frontend tests
cd frontend && npm run test

# E2E tests
npm run test:e2e
```

## Production Deployment

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
Critical production settings:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `DB_PASSWORD=secure_password`
- `SANCTUM_STATEFUL_DOMAINS=your-domain.com`

## Project Status

### ✅ Completed Phases
- **FAZA 1-11**: Complete system implementation
- **98% Development Complete**: All core functionality
- **Production Ready**: System fully operational

### 📊 Current Metrics
- **55+ database migrations** executed
- **22 institutions** configured
- **12 roles & 48 permissions** implemented
- **6 major frontend components** completed
- **98% code duplication eliminated**

## Support & Documentation

- **Technical Documentation**: `/documentation` folder
- **API Reference**: Swagger documentation available
- **Issues**: GitHub Issues
- **CLAUDE.md**: Comprehensive project instructions

## License

ATİS - Azərbaycan Təhsil Nazirliyi üçün xüsusi hazırlanmış sistem.

---

**Version**: 2.0.0  
**Last Updated**: Yanvar 2025  
**Development Status**: Production Ready  
**Developed by**: ATİS Development Team
>>>>>>> 078b1bb1984cca4ad2ebab2039cd502d9e570454
