# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 AI Development Governance & Anti-Vibe-Coding Standards

**⚠️ CRITICAL: This project follows strict AI development governance to prevent technical debt accumulation.**

### 🚫 Prohibited "Vibe Coding" Practices
- ❌ **No blind AI code acceptance**: Every generated code block must be understood and validated
- ❌ **No duplicate code generation**: Check existing codebase before creating similar functionality
- ❌ **No security-blind implementations**: All auth, data access, and API endpoints require security review
- ❌ **No untyped/untested code**: All new code must have TypeScript types and basic tests
- ❌ **No technical debt shortcuts**: Speed never compromises maintainability

### ✅ Mandatory Quality Gates
```bash
# Pre-commit quality checks (ALWAYS RUN)
npm run lint           # Frontend linting
npm run typecheck      # TypeScript validation
php artisan test       # Backend test suite
composer test          # Additional PHP tests
```

### 🔐 AI-Generated Code Security Protocol
1. **Code Review Requirements**:
   - Human review mandatory for all AI-generated authentication logic
   - Security audit required for database queries and API endpoints
   - Input validation review for all user-facing functionality

2. **Known AI Vulnerabilities to Watch**:
   - SQL injection in AI-generated queries
   - XSS vulnerabilities in templating
   - Arbitrary code execution (eval/exec usage)
   - Insecure default configurations
   - Missing authorization checks

3. **Security Validation Checklist**:
   - [ ] Input sanitization implemented
   - [ ] Authorization checks present  
   - [ ] Error messages don't leak sensitive data
   - [ ] Default credentials changed/removed
   - [ ] Rate limiting implemented where needed

## 🚫 CRITICAL: Docker-Only Development Mode

**⚠️ ATİS System LOCAL development DEACTIVATED!**

- ❌ Local PostgreSQL: **REMOVED**
- ❌ Local SQLite database: **REMOVED**  
- ❌ Local PHP artisan serve: **DO NOT USE**
- ❌ Local npm run dev: **DO NOT USE**

### ✅ ONLY Docker Development Allowed

```bash
# START SYSTEM (ONLY WAY)
./start.sh

# STOP SYSTEM (ONLY WAY)  
./stop.sh

# Manual port cleanup (emergency only)
lsof -ti:8000,8001,8002,3000 | xargs kill -9 2>/dev/null || true

# Container operations
docker-compose -f docker-compose.simple.yml ps
docker-compose -f docker-compose.simple.yml logs backend
docker-compose -f docker-compose.simple.yml logs frontend
```

### 🐳 Docker Container Commands
```bash
# Backend commands (inside container)
docker exec atis_backend php artisan migrate
docker exec atis_backend php artisan tinker
docker exec atis_backend composer install

# Frontend commands (inside container)
docker exec atis_frontend npm install
docker exec atis_frontend npm run build
```

### Backend (Laravel 11 + PHP 8.2)
```bash
# Navigate to backend
cd backend

# Start development server  
php artisan serve --host=127.0.0.1 --port=8000

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

### Frontend (React 18 + TypeScript + Vite)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Preview production build
npm run preview

# Run linting
npm run lint
```

## Architecture Overview

### Project Structure
- **Backend**: Laravel 11 API with Sanctum authentication, PostgreSQL/SQLite database
- **Frontend**: React 18.3.1 with TypeScript, Vite build tool, Tailwind CSS 3.4.11
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
├── assessments/     # Academic assessment tools
├── attendance/      # Attendance management
├── auth/           # Authentication & session management
├── classes/        # Class management components
├── common/         # Reusable UI components
├── dashboard/      # Role-specific dashboards
├── forms/          # Form components
├── hierarchy/      # Institution hierarchy components
├── layout/         # Layout and navigation components
├── modals/         # Modal dialogs
├── regionadmin/    # RegionAdmin-specific features
├── sektoradmin/    # SektorAdmin-specific features
├── students/       # Student management
├── surveys/        # Survey creation & management
├── tasks/          # Task management components
├── teachers/       # Teacher management
└── ui/            # Base UI components (shadcn/ui)
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
- **120+ migrations** executed successfully (including institution_types table)
- **Cross-database compatibility**: PostgreSQL (production) and SQLite (development)
- **Seeded data**: 22 institutions, 10 institution types, 12 roles, 48 permissions pre-configured
- **83+ models**: Comprehensive data model coverage for education management including preschool institutions

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

### AI-Assisted Development Protocol

#### Pre-Implementation Analysis (MANDATORY)
```bash
# Before any new feature development:
1. Search existing codebase for similar functionality
   grep -r "component_name" src/
   find . -name "*similar_feature*" -type f

2. Analyze current patterns and conventions
   - Review 3-5 similar existing components
   - Check service layer patterns
   - Verify TypeScript interfaces exist

3. Security & Performance Impact Assessment
   - Will this affect authentication/authorization?
   - Does it require new database queries?
   - Will it impact bundle size significantly?
```

#### AI Code Review Checklist
Before committing AI-generated code, verify:
- [ ] **Comprehension**: Can you explain every line to a colleague?
- [ ] **Consistency**: Follows project coding standards and patterns
- [ ] **Security**: No hardcoded secrets, proper validation, authorization checks
- [ ] **Performance**: Efficient queries, proper caching, no memory leaks
- [ ] **Testing**: Unit tests written and passing
- [ ] **Documentation**: Complex logic documented with comments
- [ ] **TypeScript**: Full type coverage, no `any` types
- [ ] **Dependencies**: No unnecessary new dependencies added

### Common Development Tasks

1. **Adding new features** (Enhanced Protocol):
   - **Analysis**: Check for existing similar functionality
   - **Backend**: Create controller, model, migration, routes + security review
   - **Frontend**: Create component, service, add to routing + performance check
   - **Testing**: Both API endpoints and UI components + accessibility testing
   - **Documentation**: Update relevant docs and inline comments

2. **Database changes** (Enhanced Security):
   - Always create migrations, never modify existing ones
   - Update model relationships and factory definitions
   - Run `php artisan migrate` and test with fresh database
   - **NEW**: Review for data exposure risks and performance impact

3. **Adding new roles/permissions** (Enhanced Validation):
   - Update `RoleSeeder` and `PermissionSeeder`
   - Add permission checks to controllers and components
   - Update navigation and routing logic
   - **NEW**: Test all permission edge cases, verify no privilege escalation

4. **UI component development** (Enhanced Quality):
   - Follow existing design system patterns
   - Use TypeScript for type safety
   - Add responsive behavior and accessibility features
   - Test across different user roles
   - **NEW**: Performance testing, bundle impact analysis

### Testing Strategy
- **Backend**: PHPUnit tests for controllers, models, services
- **Frontend**: Vitest for unit tests, integration tests for workflows
- **E2E testing**: Full workflow testing across user roles
- **API testing**: Test authentication, authorization, data filtering

### 📊 Technical Debt Prevention & Code Quality Monitoring

#### Code Quality Metrics (Monitor Weekly)
```bash
# Code complexity analysis
npx @code-complexity/cli src/
php vendor/bin/phpmetrics --report-html=metrics backend/app

# Duplicate code detection  
npx jscpd src/
php vendor/bin/phpcpd backend/app

# Security vulnerability scan
npm audit --audit-level=moderate
composer audit

# Bundle size analysis
npm run build -- --analyze
```

#### Performance Monitoring Protocol
- **Frontend Performance**:
  - Bundle size limit: <500KB initial load
  - First Contentful Paint: <1.5s
  - Largest Contentful Paint: <2.5s
  - Component render time monitoring with React DevTools

- **Backend Performance**:
  - API response time: <200ms for CRUD operations
  - Database query optimization with Laravel Debugbar
  - Memory usage monitoring for large data operations
  - Cache hit rate monitoring (Redis)

#### Scalability Checkpoints
- **Database**: Monitor query performance, implement proper indexing
- **API Endpoints**: Rate limiting, pagination for large datasets  
- **Frontend**: Lazy loading, virtual scrolling for large lists
- **File Storage**: Implement CDN strategy for document management
- **Session Management**: Redis clustering for multi-server deployment

### Performance Considerations
- **Frontend**: Lazy loading, component memoization, efficient re-renders  
- **Backend**: Database query optimization, eager loading relationships
- **Caching**: Redis for session data, permission caching
- **Bundle optimization**: Vite for efficient builds and hot reloading

## Local Development URLs
- **Frontend**: http://localhost:3000 (Docker: same)
- **Backend API**: http://localhost:8000/api (Docker: same)
- **Database**: localhost:5432 (PostgreSQL) or SQLite file
- **Docker Backend**: http://localhost:8000
- **Docker Frontend**: http://localhost:3000

## Test Credentials
- **SuperAdmin**: superadmin@atis.az / admin123
- **RegionAdmin**: admin@atis.az / admin123  
- **TestUser**: test@example.com / test123

## Production Considerations
- Set `APP_ENV=production` and `APP_DEBUG=false`
- Configure proper database credentials and CORS domains
- Use Redis for caching and session storage
- Enable SSL/TLS and security headers
- Set up proper logging and monitoring

### 🚀 Enhanced Production Deployment Protocol

#### Pre-Deployment Security Audit
```bash
# Automated security scanning
npm audit --audit-level=high
composer audit --format=table

# Static code analysis
./vendor/bin/phpstan analyse --level=8 app/
npx eslint src/ --max-warnings=0

# Database security review
php artisan migrate --dry-run --env=production
```

#### Performance Optimization Checklist
- [ ] **Frontend Bundle Analysis**: Ensure < 500KB initial load
- [ ] **Database Queries**: All N+1 queries eliminated
- [ ] **Caching Strategy**: Redis configured for sessions & API responses  
- [ ] **CDN Setup**: Static assets served via CDN
- [ ] **Image Optimization**: All images optimized and lazy-loaded
- [ ] **API Rate Limiting**: Implemented per endpoint
- [ ] **Database Indexing**: All frequently queried columns indexed

#### Monitoring & Alerting Setup
```bash
# Health check endpoints
GET /api/health              # System health status
GET /api/health/database     # Database connectivity
GET /api/health/redis        # Cache system status
GET /api/health/storage      # File storage accessibility
```

#### Error Handling & Incident Response
- **Frontend Error Boundaries**: Catch and report component crashes
- **API Error Standardization**: Consistent error response format
- **Security Incident Protocol**: Automated alerts for suspicious activity
- **Performance Degradation Alerts**: Auto-scaling triggers for high load
- **Database Failure Recovery**: Automated backup restoration procedures

### 🔍 Enhanced Error Handling Strategy (AI-Development Focused)

#### AI-Generated Code Error Patterns to Monitor
1. **Silent Failures**: Code that appears to work but produces incorrect results
2. **Security Bypasses**: Authentication/authorization logic that can be circumvented  
3. **Performance Degradation**: Inefficient algorithms that work in development but fail at scale
4. **Type Safety Violations**: Runtime errors from incorrect TypeScript usage
5. **Data Corruption**: Improper data validation leading to database inconsistencies

#### Advanced Logging & Debugging
```bash
# Development error tracking
tail -f storage/logs/laravel.log | grep ERROR
npm run dev 2>&1 | grep -i error

# Production monitoring integration
# - Sentry for error tracking
# - New Relic for performance monitoring  
# - DataDog for infrastructure monitoring
```

#### Code Quality Gates (Automated)
```bash
# Pre-commit hooks (mandatory)
#!/bin/sh
# .git/hooks/pre-commit
npm run lint || exit 1
npm run typecheck || exit 1
php artisan test || exit 1
composer test || exit 1

# Security scan
npm audit --audit-level=moderate || exit 1
composer audit || exit 1
```

## Key Libraries & Technologies

### Backend Stack
- **Laravel Framework**: 11.x with PHP 8.2+
- **Authentication**: Laravel Sanctum for API tokens
- **Permissions**: Spatie Laravel Permission package
- **Database**: PostgreSQL (production) / SQLite (development)
- **Testing**: PHPUnit with 120+ migrations, 83+ models

### Frontend Stack
- **React**: 18.3.1 with modern features
- **TypeScript**: ~5.5.3 for type safety
- **Build Tool**: Vite 5.4.1 with hot reloading
- **Styling**: Tailwind CSS 3.4.11 with custom design system
- **State Management**: React Context API + @tanstack/react-query
- **UI Library**: Radix UI components with shadcn/ui design system
- **Icons**: Lucide React (v0.462.0)
- **Charts**: Recharts for data visualization

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
- `/backend/app/Models/` - 83+ Eloquent models (including InstitutionType)
- `/backend/database/migrations/` - 120+ database migrations
- `/backend/database/seeders/` - Database seeding scripts (including InstitutionTypeSeeder)
- `/frontend/src/components/` - React component library with shadcn/ui
- `/frontend/src/components/modals/InstitutionTypeModal.tsx` - Institution type CRUD modal
- `/frontend/src/pages/InstitutionTypesManagement.tsx` - SuperAdmin type management page
- `/frontend/src/pages/school/` - School-specific pages
- `/frontend/src/pages/regionadmin/` - RegionAdmin-specific pages
- `/frontend/src/services/` - API service layer with dynamic type loading
- `/frontend/src/types/` - TypeScript type definitions

### Docker & Scripts
- `/docker-compose.simple.yml` - Simplified Docker setup
- `/start.sh` - System startup script
- `/stop.sh` - System shutdown script
- `/backend/Dockerfile` - Backend container configuration
- `/frontend/Dockerfile` - Frontend container configuration
- həmişə projeni start.sh ilə çalışdır. portlar məşğuı olarsa kill et.
- yeni fayl yaradılacaq olarsa təkrarçılıq olmayacağından əmin ol.

## 🎯 Anti-Vibe-Coding Rules & Technical Debt Prevention

### ⚠️ Critical Anti-Patterns to Avoid (Based on Industry Analysis)

#### The $1.5 Trillion Technical Debt Crisis Prevention
Research shows vibe coding creates the largest accumulation of technical debt in software history. Prevent this with:

1. **Code Duplication (8x increase with AI)**:
   ```bash
   # BEFORE creating any new component/function:
   grep -r "similar_function_name" .
   find . -name "*SimilarComponent*"
   # If found, extend existing rather than duplicate
   ```

2. **Code Churn Prevention (2x increase with AI)**:
   - **Rule**: Never rewrite working code without clear performance/security reason
   - **Practice**: Refactor incrementally, never wholesale rewrites
   - **Validation**: Track code stability with git metrics

#### Security Vulnerability Prevention
AI tools occasionally produce insecure code failing basic security standards:

```bash
# Mandatory security checks for AI-generated code:
# 1. No eval() or exec() usage
grep -r "eval\|exec" src/
# 2. No hardcoded credentials
grep -rE "(password|secret|key|token).*=.*[\"']" src/
# 3. Proper input validation
grep -r "request\|input" backend/ | grep -v "validate"
```

### 🚫 The "Vibe Coding Hangover" Prevention Protocol

#### Skill Atrophy Prevention
- **Weekly Code Review**: Manually review and understand 100% of AI-generated code
- **Monthly Deep Dives**: Pick one AI-generated component, rewrite it manually to maintain skills
- **Quarterly Architecture Review**: Ensure system design coherence, not just feature addition

#### "Illusion of Correctness" Mitigation
```bash
# Mandatory verification steps for AI code:
1. Unit tests with edge cases
2. Integration testing with real data
3. Performance testing with production-like load
4. Security testing with penetration testing tools
5. Accessibility testing with screen readers
```

#### Development Velocity Maintenance
- **Week 1-2**: AI coding shows 75% speed improvement
- **Month 3-6**: Technical debt accumulation causes 50% slowdown
- **Prevention**: Maintain strict quality gates from day one

### 📊 Quality Metrics Dashboard (Monitor Monthly)

#### Technical Health Indicators
```bash
# Automated quality reporting
echo "=== CODEBASE HEALTH REPORT ==="
echo "Lines of Code: $(find src -name '*.tsx' -o -name '*.ts' -o -name '*.php' | xargs wc -l | tail -1)"
echo "Test Coverage: $(npm run test:coverage | grep 'Lines' | awk '{print $4}')"
echo "Duplicate Code Blocks: $(npx jscpd src --threshold 1 | grep -c 'duplication')"
echo "Security Issues: $(npm audit --audit-level=moderate 2>&1 | grep -c 'vulnerabilities')"
echo "Bundle Size: $(du -sh dist/ | awk '{print $1}')"
echo "API Response Time: $(curl -w '@-' -o /dev/null -s http://localhost:8000/api/health <<< '%{time_total}')"
```

### 🎯 Success Metrics & KPIs
- **Development Speed**: Maintain consistent velocity, not just initial sprint speed  
- **Bug Rate**: < 5 bugs per 100 lines of new code
- **Security Score**: 0 high/critical vulnerabilities
- **Performance Score**: < 500KB bundle, < 200ms API response
- **Maintainability**: New team members productive within 2 days
- **Technical Debt Ratio**: < 20% of development time spent on debt

### 🔄 Continuous Improvement Process
- **Weekly**: Code quality metrics review
- **Biweekly**: Performance and security audit
- **Monthly**: Architecture and technical debt assessment
- **Quarterly**: Full system health evaluation and optimization

This enhanced protocol ensures ATİS maintains its technical excellence while leveraging AI development tools responsibly, preventing the technical debt crisis affecting 75% of enterprises by 2026.