# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the System
```bash
# Start with Docker (recommended)
./start.sh

# Stop system
./stop.sh
```

### Backend (Laravel 11 + PHP 8.2)
```bash
# Navigate to backend
cd backend

# Start development server  
php artisan serve --host=127.0.0.1 --port=8001

# Run migrations
php artisan migrate

# Run seeders
php artisan db:seed --class=SuperAdminSeeder
php artisan db:seed --class=InstitutionTypeSeeder
php artisan db:seed --class=InstitutionHierarchySeeder

# Run tests
php artisan test

# Run tests with Composer
composer test

# Clear cache
php artisan cache:clear
php artisan config:clear

# Database console
php artisan tinker
```

### Frontend (React 19 + TypeScript + Vite)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Test coverage
npm run test:coverage

# E2E tests with Playwright
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Performance tests
npm run test:performance

# Run linting
npm run lint
```

## Architecture Overview

### Project Structure
- **Backend**: Laravel 11 API with Sanctum authentication, PostgreSQL/SQLite database
- **Frontend**: React 19 with TypeScript, Vite build tool, Tailwind CSS 4.x
- **Infrastructure**: Docker containers with Nginx reverse proxy

### Core Components

#### Authentication & User Management
- **Role-based system**: 12 roles with hierarchical permissions (SuperAdmin → RegionAdmin → RegionOperator → SektorAdmin → SchoolAdmin → Teachers)
- **Authentication**: Laravel Sanctum token-based with session timeout management
- **Device tracking**: Multi-device login management with security controls
- **Progressive lockout**: Account security with failed login attempts tracking

#### Institution Hierarchy System
- **4-level structure**: Ministry → Regional Office → Sector → School + Preschool Institutions
- **22 pre-configured institutions** with complete hierarchical relationships
- **10+ institution types** including kindergartens, preschool centers, vocational schools, special education
- **Dynamic type management**: SuperAdmin can create custom institution types
- **Regional data isolation**: Users only see data within their hierarchy level
- **Department management**: Academic, Administrative, Finance departments per institution

#### Survey & Data Collection
- **Dynamic form builder**: Create surveys with various question types
- **Advanced targeting**: Role-based and institution-based survey distribution
- **Multi-level approval workflow**: Hierarchical approval chains for sensitive data
- **Real-time response tracking**: Live survey response monitoring and analytics

#### Task Management System
- **Authority-based assignment**: Tasks flow down the institutional hierarchy
- **Progress tracking**: Comprehensive task lifecycle management
- **Bulk operations**: Mass task assignment and status updates
- **Notification system**: Real-time task notifications via email and in-app

#### Document Management
- **Hierarchical access**: Document sharing based on institutional hierarchy
- **File size quotas**: Role-based storage limits (SuperAdmin: 500MB, others: 100MB)
- **Time-based restrictions**: Document access with expiration dates
- **Link sharing**: Secure document sharing with access tracking

### Frontend Architecture

#### Component Organization
```
src/components/
├── admin/           # SuperAdmin-specific components
├── approval/        # Multi-level approval interfaces  
├── assessment/      # Academic assessment tools
├── auth/           # Authentication & session management
├── common/         # Reusable UI components
├── dashboard/      # Role-specific dashboards
├── institutions/   # Institution management
├── regionadmin/    # RegionAdmin-specific features
├── surveys/        # Survey creation & management
├── task/          # Task management components
└── users/         # User management interfaces
```

#### Service Layer Pattern
- **Unified BaseService**: All API services extend base class with common CRUD operations
- **Role-based services**: Services automatically filter data based on user permissions
- **Error handling**: Centralized error handling with user-friendly messages
- **Caching strategy**: Permission-based caching for improved performance

#### Design System
- **533-line SCSS token system**: Centralized design tokens for consistency
- **CVA components**: Class Variance Authority for component variants
- **Responsive design**: Mobile-first approach with breakpoint system
- **Theme support**: Dark/light mode with CSS custom properties

### Database Architecture

#### Core Tables
- `users`: User management with role assignments
- `institutions`: 4-level institutional hierarchy with flexible typing
- `institution_types`: Dynamic institution type management with metadata
- `roles` & `permissions`: RBAC system with Spatie Laravel Permission
- `surveys` & `survey_responses`: Dynamic survey system
- `tasks` & `task_progress_logs`: Task management with audit trail
- `documents`: File management with hierarchical access
- `approval_workflows`: Multi-step approval processes

#### Migration Status
- **86+ migrations** executed successfully (including institution_types table)
- **Cross-database compatibility**: PostgreSQL (production) and SQLite (development)
- **Seeded data**: 22 institutions, 10 institution types, 12 roles, 48 permissions pre-configured
- **77+ models**: Comprehensive data model coverage for education management including preschool institutions

## Key Development Patterns

### API Endpoints Structure
```
/api/
├── auth/           # Authentication endpoints
├── users/          # User management
├── institutions/   # Institution hierarchy
├── institution-types/ # Dynamic institution type management (SuperAdmin only)
├── surveys/        # Survey CRUD + targeting
├── tasks/          # Task management
├── documents/      # File upload/download
├── dashboards/     # Role-specific data
├── inventory/      # Inventory management
├── psychology/     # Psychology assessment system
├── teacher-performance/ # Teacher evaluation system
└── class-attendance/    # Academic attendance tracking
```

### Permission System
- **Hierarchical permissions**: Higher roles inherit lower role permissions
- **Context-aware access**: Permissions checked against user's institution context
- **API-level filtering**: Backend automatically filters data based on user permissions
- **Frontend guards**: Components render conditionally based on permissions

### Error Handling Strategy
- **API responses**: Consistent error format with user-friendly messages
- **Frontend boundaries**: Error boundaries catch and display component errors
- **Validation**: Client-side validation mirrors backend validation rules
- **Logging**: Comprehensive audit logging for security and debugging

## Development Workflow

### Common Development Tasks

1. **Adding new features**:
   - Backend: Create controller, model, migration, routes
   - Frontend: Create component, service, add to routing
   - Test both API endpoints and UI components

2. **Database changes**:
   - Always create migrations, never modify existing ones
   - Update model relationships and factory definitions
   - Run `php artisan migrate` and test with fresh database

3. **Adding new roles/permissions**:
   - Update `RoleSeeder` and `PermissionSeeder`
   - Add permission checks to controllers and components
   - Update navigation and routing logic

4. **UI component development**:
   - Follow existing design system patterns
   - Use TypeScript for type safety
   - Add responsive behavior and accessibility features
   - Test across different user roles

### Testing Strategy
- **Backend**: PHPUnit tests for controllers, models, services
- **Frontend**: Vitest for unit tests, integration tests for workflows
- **E2E testing**: Full workflow testing across user roles
- **API testing**: Test authentication, authorization, data filtering

### Performance Considerations
- **Frontend**: Lazy loading, component memoization, efficient re-renders  
- **Backend**: Database query optimization, eager loading relationships
- **Caching**: Redis for session data, permission caching
- **Bundle optimization**: Vite for efficient builds and hot reloading

## Local Development URLs
- **Frontend**: http://localhost:3000 (Docker: same)
- **Backend API**: http://localhost:8001/api (Docker: http://localhost:8000/api)
- **Database**: localhost:5432 (PostgreSQL) or SQLite file
- **Docker Backend**: http://localhost:8000
- **Docker Frontend**: http://localhost:3000

## Test Credentials
- **SuperAdmin**: superadmin / admin123
- **RegionAdmin**: admin / admin123  
- **TestUser**: testuser / test123

## Production Considerations
- Set `APP_ENV=production` and `APP_DEBUG=false`
- Configure proper database credentials and CORS domains
- Use Redis for caching and session storage
- Enable SSL/TLS and security headers
- Set up proper logging and monitoring

## Key Libraries & Technologies

### Backend Stack
- **Laravel Framework**: 12.x with PHP 8.2+
- **Authentication**: Laravel Sanctum for API tokens
- **Permissions**: Spatie Laravel Permission package
- **Database**: PostgreSQL (production) / SQLite (development)
- **Testing**: PHPUnit with 85+ migrations, 76+ models

### Frontend Stack
- **React**: 19.1.0 with modern concurrent features
- **TypeScript**: ~5.8.3 for type safety
- **Build Tool**: Vite 7.0.0 with hot reloading
- **Styling**: Tailwind CSS 4.x with custom design system
- **State Management**: React Context API + @tanstack/react-query
- **Testing**: Vitest + Playwright for E2E
- **Icons**: Lucide React + React Icons
- **Animations**: Framer Motion 12.x

### Development Tools
- **Docker**: Containerized development environment
- **Hot Reloading**: Vite for frontend, Laravel for backend
- **Code Quality**: ESLint, TypeScript strict mode
- **Performance**: Lighthouse CI, performance monitoring
- **Version Control**: Git with comprehensive .gitignore

## Important File Locations

### Configuration Files
- `/backend/.env` - Backend environment configuration
- `/frontend/.env` - Frontend environment configuration  
- `/backend/config/` - Laravel configuration files
- `/frontend/tailwind.config.js` - Tailwind CSS configuration
- `/frontend/vite.config.ts` - Vite build configuration

### Key Directories
- `/backend/app/Models/` - 77+ Eloquent models (including InstitutionType)
- `/backend/database/migrations/` - 86+ database migrations
- `/backend/database/seeders/` - Database seeding scripts (including InstitutionTypeSeeder)
- `/frontend/src/components/` - React component library
- `/frontend/src/components/modals/InstitutionTypeModal.tsx` - Institution type CRUD modal
- `/frontend/src/pages/InstitutionTypesManagement.tsx` - SuperAdmin type management page
- `/frontend/src/services/` - API service layer with dynamic type loading
- `/frontend/src/types/` - TypeScript type definitions

### Docker & Scripts
- `/docker-compose.simple.yml` - Simplified Docker setup
- `/start.sh` - System startup script
- `/stop.sh` - System shutdown script
- `/backend/Dockerfile` - Backend container configuration
- `/frontend/Dockerfile` - Frontend container configuration