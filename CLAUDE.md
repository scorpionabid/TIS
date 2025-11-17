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

### 🔐 PRODUCTION SECURITY PROTOCOL

**⚠️ CRITICAL: ATİS handles sensitive educational institution data**

#### Production Environment Security (MANDATORY)
1. **Data Protection Requirements**:
   - All institutional data classified as SENSITIVE
   - Student/teacher personal information requires encryption
   - Survey responses may contain confidential assessments
   - Document storage contains official institutional records

2. **Access Control (PRODUCTION ACTIVE)**:
   - Production database access: DevOps team ONLY
   - API endpoints: Rate limiting ACTIVE (100 req/min per user)
   - Authentication: Sanctum tokens with 24h expiration
   - Session management: Redis-based with auto-timeout
   - Failed login protection: Progressive lockout (5 attempts = 30min lock)

3. **Development Security Protocol**:
   - NEVER expose production credentials in development
   - NEVER commit .env files with real credentials
   - NEVER test with production API endpoints
   - ALWAYS use anonymized test data in development

### 🔐 AI-Generated Code Security Protocol
1. **Code Review Requirements** (ENHANCED for Production):
   - Human review mandatory for ALL AI-generated authentication logic
   - Security audit required for database queries and API endpoints
   - Input validation review for all user-facing functionality
   - **PRODUCTION**: Penetration testing for new authentication features
   - **PRODUCTION**: Database query performance analysis

2. **Known AI Vulnerabilities to Watch** (Production Focus):
   - SQL injection in AI-generated queries ⚠️ CRITICAL
   - XSS vulnerabilities in templating ⚠️ CRITICAL
   - Arbitrary code execution (eval/exec usage) ⚠️ CRITICAL
   - Insecure default configurations
   - Missing authorization checks ⚠️ CRITICAL
   - **PRODUCTION**: Data exposure through error messages
   - **PRODUCTION**: Insufficient access control validation

3. **Security Validation Checklist** (Production Enhanced):
   - [ ] Input sanitization implemented and tested
   - [ ] Authorization checks present and verified
   - [ ] Error messages don't leak sensitive data
   - [ ] Default credentials changed/removed
   - [ ] Rate limiting implemented where needed
   - [ ] **PRODUCTION**: Audit logging enabled for all data access
   - [ ] **PRODUCTION**: Sensitive data encryption at rest
   - [ ] **PRODUCTION**: API endpoint security headers configured
   - [ ] **PRODUCTION**: Database connection encryption enabled

## 🚫 CRITICAL: Docker-Only Development Mode

**⚠️ ATİS System LOCAL development DEACTIVATED!**
**🚀 PRODUCTION STATUS: ATİS is LIVE with real institutional data**

- ❌ Local PostgreSQL: **REMOVED**
- ❌ Local SQLite database: **REMOVED**
- ❌ Local PHP artisan serve: **DO NOT USE**
- ❌ Local npm run dev: **DO NOT USE**
- ⚠️ **PRODUCTION DATA PROTECTION**: Development environment must NOT connect to production database

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

## 🗄️ PRODUCTION DATABASE MANAGEMENT

**⚠️ CRITICAL: ATİS is LIVE with real institutional data - Handle with extreme care**

### 🔒 Production Data Protection Protocol

```bash
# NEVER directly connect to production database from development
# NEVER run migrations or seeders against production
# NEVER expose production credentials in development environment

# Production database access is RESTRICTED to:
# - Authorized DevOps personnel only
# - Scheduled backup operations
# - Emergency maintenance procedures
```

### 🔄 Development Data Management

#### Fresh Development Environment Setup
```bash
# 1. Clean development database reset
docker exec atis_backend php artisan migrate:fresh

# 2. Seed with fresh development data
docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder
docker exec atis_backend php artisan db:seed --class=InstitutionTypeSeeder
docker exec atis_backend php artisan db:seed --class=InstitutionHierarchySeeder

# 3. Create test users for all role levels
docker exec atis_backend php artisan db:seed --class=TestUserSeeder
```

#### Production-Safe Development Workflow
```bash
# Before ANY database changes:
1. Test migrations on fresh development database
   docker exec atis_backend php artisan migrate:fresh
   docker exec atis_backend php artisan migrate --pretend

2. Verify data integrity after migrations
   docker exec atis_backend php artisan tinker
   # Test critical queries and relationships

3. Document any data transformation needed
   # Create rollback scripts if needed
   # Verify foreign key constraints
```

### 📊 Database State Management

#### Current Production Database Status
```bash
# Production contains:
# - 22+ real educational institutions
# - 10+ validated institution types
# - 12 hierarchical user roles
# - 48+ granular permissions
# - Real survey responses and task data
# - Active user sessions and documents
```

#### Development Environment Reset (Weekly Recommended)
```bash
#!/bin/bash
# Development database refresh script

echo "🧹 Cleaning development environment..."
docker exec atis_backend php artisan migrate:fresh --force

echo "🌱 Seeding development data..."
docker exec atis_backend php artisan db:seed --class=SuperAdminSeeder --force
docker exec atis_backend php artisan db:seed --class=InstitutionTypeSeeder --force
docker exec atis_backend php artisan db:seed --class=InstitutionHierarchySeeder --force
docker exec atis_backend php artisan db:seed --class=TestUserSeeder --force

echo "✅ Development environment refreshed"
```

### 🚨 Production Migration Safety Protocol

#### Pre-Migration Checklist (MANDATORY)
```bash
# 1. BACKUP VERIFICATION (before any production changes)
# Verify recent backup exists and is restorable

# 2. MIGRATION TESTING
# Test migration on development with production-like data volume
docker exec atis_backend php artisan migrate --pretend

# 3. ROLLBACK PLAN
# Prepare rollback migration if needed
# Document rollback steps

# 4. MAINTENANCE WINDOW
# Schedule during low-usage hours
# Notify users of potential downtime
```

#### Safe Migration Execution
```bash
# PRODUCTION MIGRATION STEPS (DevOps Only):
# 1. Put system in maintenance mode
# 2. Create database backup
# 3. Run migration with --force flag
# 4. Verify data integrity
# 5. Remove maintenance mode
# 6. Monitor system health
```

### 🔄 Data Synchronization & Backup Procedures

#### Production Backup Strategy
```bash
# AUTOMATED PRODUCTION BACKUPS (DevOps managed)
# - Daily full database backups at 2:00 AM (low traffic)
# - Hourly incremental backups during business hours
# - Weekly backup verification and integrity testing
# - Monthly backup restoration testing
# - Backup retention: 30 days daily, 12 months weekly

# Backup locations:
# - Primary: Secure cloud storage (encrypted)
# - Secondary: Offsite backup storage
# - Emergency: Local infrastructure backup
```

#### Development Data Refresh Protocol
```bash
# DEVELOPMENT DATA SYNC (Weekly/As needed)
# NEVER use production backup directly in development

# Safe development data refresh:
1. Create anonymized data export (production team only)
2. Remove sensitive PII data
3. Replace with development-safe test data
4. Import to development environment
5. Verify data integrity and relationships

# Quick development reset:
docker exec atis_backend php artisan migrate:fresh
docker exec atis_backend php artisan db:seed
```

#### Emergency Procedures
```bash
# PRODUCTION DATA RECOVERY (Emergency Only)
# 1. Immediate system isolation
# 2. Damage assessment
# 3. Backup restoration from verified source
# 4. Data integrity verification
# 5. System security audit
# 6. Gradual system restoration

# Development environment corruption:
# Simple fix - reset from scratch:
./stop.sh
docker system prune -f
./start.sh
docker exec atis_backend php artisan migrate:fresh --seed
```

### Backend (Laravel 11 + PHP 8.2)
```bash
# Navigate to backend
cd backend

# Auth guard configuration
grep -q "^AUTH_GUARD=" .env || echo "AUTH_GUARD=sanctum" >> .env
php artisan config:clear
php artisan permission:cache-reset

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

2. **Database changes** (PRODUCTION-AWARE Protocol):
   - Always create migrations, never modify existing ones
   - Test migrations on fresh development database FIRST
   - Update model relationships and factory definitions
   - Run `docker exec atis_backend php artisan migrate:fresh` for development testing
   - **CRITICAL**: Never test database changes against production
   - **NEW**: Review for data exposure risks and performance impact
   - **PRODUCTION**: Create rollback migration for production deployment

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

## Development Test Credentials
**⚠️ DEVELOPMENT ONLY - These credentials are ONLY for local Docker development**

- **SuperAdmin**: superadmin@atis.az / admin123
- **RegionAdmin**: admin@atis.az / admin123
- **TestUser**: test@example.com / test123

**🚨 PRODUCTION WARNING**:
- Production credentials are DIFFERENT and SECURE
- Production passwords are complex and regularly rotated
- NEVER use development credentials in production
- NEVER commit production credentials to git
- Production access requires proper authorization

## Production Considerations
**🚀 ATİS PRODUCTION STATUS: LIVE with 22+ Educational Institutions**

### Current Production Environment
- `APP_ENV=production` and `APP_DEBUG=false` ✅
- Secure database credentials configured ✅
- CORS domains properly restricted ✅
- Redis for caching and session storage ✅
- SSL/TLS and security headers enabled ✅
- Comprehensive logging and monitoring active ✅

### Production Monitoring & Maintenance
```bash
# PRODUCTION HEALTH MONITORING (24/7)
# - System uptime monitoring
# - Database performance tracking
# - API response time monitoring
# - User session analytics
# - Error rate tracking
# - Security incident detection

# MAINTENANCE SCHEDULE
# - Weekly: Security patches and updates
# - Monthly: Performance optimization review
# - Quarterly: Full security audit
# - Annually: Disaster recovery testing
```

### Production Data Management Protocol
```bash
# LIVE DATA HANDLING (CRITICAL)
# Current production contains:
# ✅ 22+ Real educational institutions
# ✅ Thousands of active user accounts
# ✅ Survey responses with assessment data
# ✅ Document storage with official records
# ✅ Task management with institutional workflows

# PRODUCTION DATA PROTECTION:
# - Automated backups every 6 hours
# - Real-time replication to secondary server
# - Encrypted data at rest and in transit
# - Audit logging for all data access
# - GDPR compliance for personal data
```

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

## 🚀 POST-PRODUCTION DEVELOPMENT GUIDELINES

**ATİS is now LIVE and serving real educational institutions**

### Development Mindset Shift (CRITICAL)
```bash
# BEFORE PRODUCTION (was):
# - Rapid prototyping acceptable
# - Database resets were common
# - Breaking changes were tolerable
# - Data loss was recoverable

# AFTER PRODUCTION (now):
# - Every change must be carefully planned
# - Zero tolerance for data loss
# - Backward compatibility is mandatory
# - Production stability is PRIORITY #1
```

### New Feature Development Protocol
1. **Impact Assessment** (MANDATORY):
   - Will this affect existing production data?
   - Does this require database migrations?
   - Could this break existing workflows?
   - Are there security implications?

2. **Development Safety Protocol**:
   - ALL development in isolated Docker environment
   - NEVER connect to production during development
   - Test with production-like data volumes
   - Create comprehensive rollback plans

3. **Production Deployment Checklist**:
   ```bash
   # Pre-deployment verification:
   ✅ Feature tested in development with realistic data
   ✅ Database migrations tested and reversible
   ✅ No breaking changes to existing APIs
   ✅ Security review completed
   ✅ Performance impact assessed
   ✅ Rollback procedure documented
   ✅ Maintenance window scheduled (if needed)
   ✅ User communication plan ready
   ```

### Development Environment Best Practices
```bash
# WEEKLY development routine:
1. Fresh development database reset
   docker exec atis_backend php artisan migrate:fresh --seed

2. Pull latest production-safe code
   git pull origin main

3. Verify all systems working
   npm run lint && npm run typecheck
   php artisan test

4. Update local dependencies
   docker exec atis_backend composer update
   docker exec atis_frontend npm update
```

### Emergency Response Protocol
```bash
# PRODUCTION INCIDENT RESPONSE:
# 1. IMMEDIATE: Assess impact and isolate issue
# 2. COMMUNICATE: Notify stakeholders of issue
# 3. STABILIZE: Implement temporary fix if possible
# 4. INVESTIGATE: Root cause analysis
# 5. RESOLVE: Implement permanent solution
# 6. DOCUMENT: Post-incident review and prevention
```

**🎯 REMEMBER: ATİS serves real institutions with real data - every change matters!**

---

## 📋 SUPERADMIN SƏLAHIYYƏT İDARƏETMƏ SƏHİFƏSİ - İMPLEMENTASİYA PLANI

### 🎯 Layihə Məqsədi
SuperAdmin üçün 290+ sistemdə mövcud səlahiyyəti idarə edə biləcək, istifadəçilərə və rollara səlahiyyət verə/dəyişə biləcək, analitika və statistika görə biləcək tam funksional səlahiyyət idarəetmə paneli.

### 📊 Mövcud Sistem Analizi

#### Texniki Məlumatlar:
- **Paket**: Spatie Laravel Permission v6.20
- **Guard**: sanctum (API autentifikasiya)
- **Səlahiyyət sayı**: 290+ granular permissions
- **Rol sayı**: 10 sistem rolu (SuperAdmin → Müəllim)
- **İerarxiya səviyyələri**: 1-10 (1=ən yüksək səlahiyyət)

#### Cədvəl Strukturu:
```sql
permissions:
  - id, name, display_name, description
  - guard_name, category, department
  - resource, action, is_active
  - created_at, updated_at

roles:
  - id, name, display_name, description
  - guard_name, level, department_access
  - max_institutions, is_active, role_category
  - created_by_user_id, hierarchy_scope
  - can_create_roles_below_level
  - max_institutions_scope, parent_role
  - created_at, updated_at

permission_role (pivot):
  - permission_id, role_id
```

#### Səlahiyyət Kateqoriyaları:
1. User Management (9 permissions)
2. Institution Management (5 permissions)
3. Survey Management (12 permissions)
4. Role Management (4 permissions)
5. Academic Management (12 permissions)
6. Document Management (8 permissions)
7. Task Management (6 permissions)
8. Assessment Management (12 permissions)
9. Student Management (17 permissions)
10. Class Management (13 permissions)
11. Subject Management (6 permissions)
12. Approval Workflow (14 permissions)
13. Room Management (6 permissions)
14. Event Management (8 permissions)
15. Psychology Support (6 permissions)
16. Inventory Management (7 permissions)
17. Teacher Performance (6 permissions)
18. Department Management (6 permissions)
19. Teaching Load (7 permissions)
20. Teacher Management (10 permissions)
21. Link Share Management (8 permissions)
22. Institution Types (2 permissions)
23. System Management (2 permissions)
24. Reports (3 permissions)

#### Permission Scope Sistemi:
- **global**: Sistem səviyyəli səlahiyyətlər (SuperAdmin only)
- **system**: Sistem operasiyaları (Level 1-2)
- **regional**: Regional əməliyyatlar (Level 1-4)
- **sector**: Sektor əməliyyatları (Level 1-6)
- **institution**: Məktəb səviyyəsi (Level 1-8)
- **classroom**: Sinif səviyyəsi (Level 1-10)

---

## 🏗️ İMPLEMENTASİYA PLANI - 6 FAZA

### **FAZA 1: Backend API Hazırlığı** ⏱️ 3-4 saat

#### 1.1 PermissionController Yaratmaq
**Fayl**: `backend/app/Http/Controllers/PermissionController.php`

**Metodlar**:
```php
class PermissionController extends Controller
{
    // 1. Bütün səlahiyyətləri əldə et (filterlənmiş)
    public function index(Request $request): JsonResponse
    // Params: ?search, ?category, ?scope, ?resource, ?action, ?is_active
    // Returns: paginated permissions with role count, user count

    // 2. Xüsusi səlahiyyət detalları
    public function show(Permission $permission): JsonResponse
    // Returns: permission details + usage stats + affected roles/users

    // 3. Səlahiyyət metadata yeniləməsi
    public function update(Request $request, Permission $permission): JsonResponse
    // Allowed: display_name, description, is_active
    // Forbidden: name, guard_name (immutable)

    // 4. Kütləvi yeniləmə
    public function bulkUpdate(Request $request): JsonResponse
    // Body: {permission_ids: [], data: {is_active: true}}

    // 5. İstifadə statistikası
    public function getUsageStats(Permission $permission): JsonResponse
    // Returns: roles count, users count, recent assignments, timeline

    // 6. Rol-Səlahiyyət matrisi
    public function getPermissionMatrix(Request $request): JsonResponse
    // Returns: roles[], permissions[], matrix[roleId][permissionId]

    // 7. Qruplaşdırılmış səlahiyyətlər
    public function getGroupedPermissions(Request $request): JsonResponse
    // Params: ?group_by=category|resource|scope
    // Returns: grouped structure with counts

    // 8. Rolle səlahiyyət sinxronlaşdırma
    public function syncRolePermissions(Request $request): JsonResponse
    // Body: {role_id, permission_ids[], action: 'assign|revoke|replace'}

    // 9. Kateqoriyalar siyahısı
    public function getCategories(): JsonResponse
    // Returns: unique categories with permission counts

    // 10. Scope siyahısı
    public function getScopes(): JsonResponse
    // Returns: available scopes with permission counts
}
```

**Validasiya Qaydaları**:
- SuperAdmin-only access (middleware: role:superadmin)
- System permissions cannot be deactivated (validation)
- Permission name is immutable (validation)
- Impact analysis for deactivation (>50 users warning)
- Hierarchy-aware permission assignment (level checking)

#### 1.2 API Route-lar Əlavə Etmək
**Fayl**: `backend/routes/api.php`

```php
Route::middleware(['auth:sanctum', 'role:superadmin'])->prefix('permissions')->group(function () {
    Route::get('/', [PermissionController::class, 'index']);
    Route::get('/categories', [PermissionController::class, 'getCategories']);
    Route::get('/scopes', [PermissionController::class, 'getScopes']);
    Route::get('/grouped', [PermissionController::class, 'getGroupedPermissions']);
    Route::get('/matrix', [PermissionController::class, 'getPermissionMatrix']);
    Route::get('/{permission}', [PermissionController::class, 'show']);
    Route::put('/{permission}', [PermissionController::class, 'update']);
    Route::post('/bulk-update', [PermissionController::class, 'bulkUpdate']);
    Route::get('/{permission}/usage', [PermissionController::class, 'getUsageStats']);
    Route::post('/sync-role', [PermissionController::class, 'syncRolePermissions']);
});
```

#### 1.3 Permission Model Genişləndirmək
**Fayl**: `backend/app/Models/Permission.php`

**Əlavə metodlar**:
```php
// Təsir olunan rolların sayı
public function getAffectedRolesCount(): int

// Təsir olunan istifadəçilərin sayı
public function getAffectedUsersCount(): int

// Kateqoriya adının tərcüməsi
public function getCategoryLabel(): string

// Scope adının tərcüməsi
public function getScopeLabel(): string

// Scope təyini (helper)
public function getScopeAttribute(): string

// İstifadə olunub-olunmadığını yoxla
public function isUsed(): bool
```

---

### **FAZA 2: Frontend Service Layer** ⏱️ 1-2 saat

#### 2.1 Permission Service Yaratmaq
**Fayl**: `frontend/src/services/permissions.ts`

```typescript
export interface Permission {
  id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  guard_name: string;
  category: string | null;
  department: string | null;
  resource: string | null;
  action: string | null;
  is_active: boolean;
  scope: 'global' | 'system' | 'regional' | 'sector' | 'institution' | 'classroom';
  created_at: string;
  updated_at: string;
  roles_count?: number;
  users_count?: number;
}

export interface PermissionUsageStats {
  permission: Permission;
  roles_count: number;
  users_count: number;
  roles: Array<{ id: number; name: string; display_name: string }>;
  recent_assignments: Array<{
    user_id: number;
    user_name: string;
    role_name: string;
    assigned_at: string;
  }>;
  usage_timeline: Array<{
    date: string;
    assignments: number;
    revocations: number;
  }>;
}

export interface PermissionMatrix {
  roles: Array<Role>;
  permissions: Array<Permission>;
  matrix: Record<number, Record<number, boolean>>; // [roleId][permissionId]
  hierarchy_info: any;
}

export interface GroupedPermissions {
  [key: string]: {
    label: string;
    permissions: Permission[];
    count: number;
  };
}

export const permissionService = {
  async getAll(params?: {
    search?: string;
    category?: string;
    scope?: string;
    resource?: string;
    action?: string;
    is_active?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<{ permissions: Permission[]; total: number; }>,

  async getById(id: number): Promise<{ permission: Permission }>,

  async getGrouped(groupBy: 'category' | 'resource' | 'scope'): Promise<GroupedPermissions>,

  async getMatrix(): Promise<PermissionMatrix>,

  async update(id: number, data: {
    display_name?: string;
    description?: string;
    is_active?: boolean;
  }): Promise<{ permission: Permission; message: string }>,

  async bulkUpdate(permissionIds: number[], data: {
    is_active?: boolean;
  }): Promise<{ updated_count: number; message: string }>,

  async getUsageStats(id: number): Promise<PermissionUsageStats>,

  async syncRolePermissions(roleId: number, permissionIds: number[], action: 'assign' | 'revoke' | 'replace'): Promise<{
    role: Role;
    permissions: Permission[];
    message: string;
  }>,

  async getCategories(): Promise<Array<{ name: string; count: number }>>,

  async getScopes(): Promise<Array<{ name: string; count: number }>>,
};
```

---

### **FAZA 3: Frontend Səhifə Strukturu** ⏱️ 4-5 saat

#### 3.1 Permissions.tsx - Əsas Səhifə
**Fayl**: `frontend/src/pages/Permissions.tsx`

**Komponent Strukturu**:
```tsx
export default function Permissions() {
  // State Management
  const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'grouped'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  // Data Fetching
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions', searchTerm, categoryFilter, scopeFilter, statusFilter],
    queryFn: () => permissionService.getAll({...filters})
  });

  const { data: categories } = useQuery({
    queryKey: ['permission-categories'],
    queryFn: permissionService.getCategories
  });

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <PermissionsHeader
        totalCount={permissionsData?.total}
        activeCount={activePermissions}
      />

      {/* View Mode Switcher */}
      <ViewModeSwitcher mode={viewMode} onChange={setViewMode} />

      {/* Filters */}
      <PermissionFilters
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        scopeFilter={scopeFilter}
        statusFilter={statusFilter}
        onSearchChange={setSearchTerm}
        onCategoryChange={setCategoryFilter}
        onScopeChange={setScopeFilter}
        onStatusChange={setStatusFilter}
      />

      {/* View Content */}
      {viewMode === 'list' && (
        <PermissionListView
          permissions={permissionsData?.permissions}
          selectedPermissions={selectedPermissions}
          onSelectionChange={setSelectedPermissions}
          onPermissionClick={handlePermissionClick}
        />
      )}

      {viewMode === 'matrix' && (
        <PermissionMatrixView />
      )}

      {viewMode === 'grouped' && (
        <PermissionGroupedView groupBy={groupBy} />
      )}

      {/* Modals */}
      <PermissionDetailModal
        open={detailModalOpen}
        permission={selectedPermission}
        onClose={() => setDetailModalOpen(false)}
      />

      <BulkPermissionModal
        open={bulkModalOpen}
        selectedPermissions={selectedPermissions}
        onClose={() => setBulkModalOpen(false)}
      />
    </div>
  );
}
```

**Alt Komponentlər**:

1. **PermissionsHeader.tsx** - Başlıq və statistika
2. **ViewModeSwitcher.tsx** - Görünüş dəyişdirici
3. **PermissionFilters.tsx** - Filter paneli
4. **PermissionListView.tsx** - Cədvəl görünüşü
5. **PermissionMatrixView.tsx** - Matrix görünüşü
6. **PermissionGroupedView.tsx** - Qruplaşdırılmış görünüş

#### 3.2 PermissionListView Komponenti
**Fayl**: `frontend/src/components/permissions/PermissionListView.tsx`

**Cədvəl Sütunları**:
```tsx
const columns: ResponsiveTableColumn[] = [
  {
    key: 'select',
    label: '',
    render: (_, permission) => (
      <Checkbox
        checked={selectedPermissions.includes(permission.id)}
        onCheckedChange={() => handleSelect(permission.id)}
      />
    )
  },
  {
    key: 'name',
    label: 'Səlahiyyət Adı',
    render: (value) => (
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{value}</span>
      </div>
    ),
    sortable: true
  },
  {
    key: 'display_name',
    label: 'Göstəriş Adı',
    render: (value, permission) => value || permission.name,
    hideOnMobile: true
  },
  {
    key: 'category',
    label: 'Kateqoriya',
    render: (value) => (
      <Badge variant="secondary">{value || 'N/A'}</Badge>
    ),
    sortable: true
  },
  {
    key: 'scope',
    label: 'Scope',
    render: (value) => (
      <Badge className={getScopeBadgeColor(value)}>
        {getScopeLabel(value)}
      </Badge>
    ),
    sortable: true
  },
  {
    key: 'roles_count',
    label: 'Rollar',
    render: (value) => (
      <span className="text-sm">{value || 0} rol</span>
    ),
    hideOnMobile: true
  },
  {
    key: 'users_count',
    label: 'İstifadəçilər',
    render: (value) => (
      <span className="text-sm">{value || 0} istifadəçi</span>
    ),
    hideOnMobile: true
  },
  {
    key: 'is_active',
    label: 'Status',
    render: (value, permission) => (
      <Switch
        checked={value}
        onCheckedChange={() => handleToggleStatus(permission)}
        disabled={isSystemPermission(permission)}
      />
    )
  },
  {
    key: 'actions',
    label: '',
    render: (_, permission) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleViewDetails(permission)}>
            <Eye className="h-4 w-4 mr-2" />
            Detallar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEdit(permission)}>
            <Edit className="h-4 w-4 mr-2" />
            Redaktə
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
];
```

**Funksionallıqlar**:
- ✅ Multi-select with checkboxes
- ✅ Sorting on all columns
- ✅ Pagination (20/50/100 per page)
- ✅ Bulk actions toolbar
- ✅ Quick status toggle
- ✅ Responsive mobile view

---

### **FAZA 4: Əlavə Komponentlər** ⏱️ 2-3 saat

#### 4.1 PermissionDetailModal
**Fayl**: `frontend/src/components/modals/PermissionDetailModal.tsx`

**Məlumatlar**:
```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>{permission.display_name || permission.name}</DialogTitle>
    </DialogHeader>

    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Ümumi</TabsTrigger>
        <TabsTrigger value="roles">Rollar</TabsTrigger>
        <TabsTrigger value="users">İstifadəçilər</TabsTrigger>
        <TabsTrigger value="stats">Statistika</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {/* Permission metadata */}
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="Ad" value={permission.name} />
          <DetailItem label="Kateqoriya" value={permission.category} />
          <DetailItem label="Scope" value={permission.scope} />
          <DetailItem label="Resource" value={permission.resource} />
          <DetailItem label="Action" value={permission.action} />
          <DetailItem label="Status" value={permission.is_active ? 'Aktiv' : 'Qeyri-aktiv'} />
        </div>
        <Separator />
        <div>
          <label>Təsvir</label>
          <p>{permission.description || 'Təsvir yoxdur'}</p>
        </div>
      </TabsContent>

      <TabsContent value="roles">
        {/* Roles that have this permission */}
        <ScrollArea className="h-[300px]">
          {usageStats?.roles.map(role => (
            <RoleCard key={role.id} role={role} />
          ))}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="users">
        {/* Users that have this permission (top 50) */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Cəmi {usageStats?.users_count} istifadəçi bu səlahiyyətə sahibdir
          </p>
          {/* User list preview */}
        </div>
      </TabsContent>

      <TabsContent value="stats">
        {/* Usage timeline chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={usageStats?.usage_timeline}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="assignments" stroke="#8884d8" />
            <Line type="monotone" dataKey="revocations" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Bağla</Button>
      <Button onClick={() => handleEdit(permission)}>
        <Edit className="h-4 w-4 mr-2" />
        Redaktə
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 4.2 PermissionMatrixView
**Fayl**: `frontend/src/components/permissions/PermissionMatrixView.tsx`

**Görünüş**:
```tsx
export function PermissionMatrixView() {
  const { data: matrixData } = useQuery({
    queryKey: ['permission-matrix'],
    queryFn: permissionService.getMatrix
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Virtual scrolling for performance
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredPermissions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Kateqoriya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
            {/* Categories */}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün rollar</SelectItem>
            {/* Roles */}
          </SelectContent>
        </Select>
      </div>

      {/* Matrix Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-background z-10">
              <tr>
                <th className="sticky left-0 bg-background z-20 p-2 border-r">
                  Səlahiyyət
                </th>
                {filteredRoles.map(role => (
                  <th key={role.id} className="p-2 border-r text-sm">
                    <div className="flex flex-col items-center">
                      <span>{role.display_name}</span>
                      <Badge variant="outline" className="text-xs mt-1">
                        L{role.level}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const permission = filteredPermissions[virtualRow.index];
                return (
                  <tr key={permission.id} style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}>
                    <td className="sticky left-0 bg-background border-r p-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        <span className="text-sm">{permission.name}</span>
                      </div>
                    </td>
                    {filteredRoles.map(role => {
                      const hasPermission = matrixData?.matrix[role.id]?.[permission.id];
                      const isAllowed = isPermissionAllowedForRole(permission, role);

                      return (
                        <td key={role.id} className="border-r p-2 text-center">
                          <Checkbox
                            checked={hasPermission}
                            disabled={!isAllowed}
                            onCheckedChange={() => handleTogglePermission(role, permission)}
                            className={cn(
                              hasPermission && 'border-green-500 bg-green-50',
                              !isAllowed && 'opacity-30'
                            )}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Checkbox checked disabled={false} className="border-green-500 bg-green-50" />
          <span>Verilmiş səlahiyyət</span>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={false} disabled={false} />
          <span>Verilməmiş səlahiyyət</span>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={false} disabled={true} className="opacity-30" />
          <span>Bu rol səviyyəsi üçün uyğun deyil</span>
        </div>
      </div>
    </div>
  );
}
```

#### 4.3 BulkPermissionModal
**Fayl**: `frontend/src/components/modals/BulkPermissionModal.tsx`

**Funksionallıq**:
```tsx
export function BulkPermissionModal({ open, selectedPermissions, onClose }: Props) {
  const [action, setAction] = useState<'assign' | 'revoke' | 'replace'>('assign');
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [impactAnalysis, setImpactAnalysis] = useState<any>(null);

  // Impact preview
  useEffect(() => {
    if (selectedRoles.length > 0 && selectedPermissions.length > 0) {
      // Calculate impact
      analyzeImpact();
    }
  }, [selectedRoles, selectedPermissions, action]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Kütləvi Səlahiyyət Əməliyyatı</DialogTitle>
          <DialogDescription>
            {selectedPermissions.length} səlahiyyət seçildi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Type */}
          <div>
            <Label>Əməliyyat növü</Label>
            <RadioGroup value={action} onValueChange={(v) => setAction(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assign" id="assign" />
                <Label htmlFor="assign">Əlavə et (Assign)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="revoke" id="revoke" />
                <Label htmlFor="revoke">Çıxart (Revoke)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace">Əvəz et (Replace)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Role Selection */}
          <div>
            <Label>Rollar</Label>
            <ScrollArea className="h-[200px] border rounded-lg p-4">
              {roles.map(role => (
                <div key={role.id} className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <Label>{role.display_name}</Label>
                  <Badge variant="outline">Level {role.level}</Badge>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Impact Analysis */}
          {impactAnalysis && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Təsir Analizi</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2">
                  <li>{impactAnalysis.affected_users} istifadəçi təsir olunacaq</li>
                  <li>{impactAnalysis.affected_roles} rol dəyişəcək</li>
                  {impactAnalysis.warnings.map((warning, i) => (
                    <li key={i} className="text-destructive">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İmtina</Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedRoles.length === 0}
          >
            Təsdiq et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### **FAZA 5: UX/UI Təkmilləşdirmələr** ⏱️ 2-3 saat

#### 5.1 Dizayn Sistemi
**Rəng Kodlaşdırması**:
```tsx
const scopeColors = {
  global: 'bg-red-100 text-red-800 border-red-300',
  system: 'bg-orange-100 text-orange-800 border-orange-300',
  regional: 'bg-blue-100 text-blue-800 border-blue-300',
  sector: 'bg-green-100 text-green-800 border-green-300',
  institution: 'bg-purple-100 text-purple-800 border-purple-300',
  classroom: 'bg-gray-100 text-gray-800 border-gray-300'
};

const categoryIcons = {
  'users': Users,
  'institutions': Building2,
  'surveys': FileText,
  'roles': Shield,
  'system': Settings,
  'academic': GraduationCap,
  // ...
};
```

#### 5.2 Performance Optimizasyon
```tsx
// Virtual scrolling for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

// Debounced search
const debouncedSearch = useMemo(
  () => debounce((value: string) => setSearchTerm(value), 300),
  []
);

// Memoized filters
const filteredPermissions = useMemo(() => {
  return permissions.filter(/* filter logic */);
}, [permissions, searchTerm, categoryFilter, scopeFilter]);

// React Query caching
const { data } = useQuery({
  queryKey: ['permissions', filters],
  queryFn: () => permissionService.getAll(filters),
  staleTime: 1000 * 60 * 10, // 10 minutes
  cacheTime: 1000 * 60 * 30, // 30 minutes
});
```

#### 5.3 Responsive Design
```tsx
// Mobile-first breakpoints
const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(max-width: 1024px)');

return (
  <div className="px-2 sm:px-4 lg:px-6">
    {isMobile ? (
      <PermissionCards permissions={permissions} />
    ) : (
      <PermissionTable permissions={permissions} />
    )}
  </div>
);
```

---

### **FAZA 6: Testing və Validasiya** ⏱️ 2-3 saat

#### 6.1 Backend Tests
**Fayl**: `backend/tests/Feature/PermissionControllerTest.php`

```php
class PermissionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_list_permissions()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $response = $this->actingAs($superadmin, 'sanctum')
            ->getJson('/api/permissions');

        $response->assertStatus(200)
            ->assertJsonStructure(['permissions', 'total']);
    }

    public function test_non_superadmin_cannot_access_permissions()
    {
        $user = User::factory()->create();
        $user->assignRole('müəllim');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/permissions');

        $response->assertStatus(403);
    }

    public function test_can_update_permission_metadata()
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('superadmin');

        $permission = Permission::first();

        $response = $this->actingAs($superadmin, 'sanctum')
            ->putJson("/api/permissions/{$permission->id}", [
                'display_name' => 'New Display Name',
                'description' => 'New description'
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('permissions', [
            'id' => $permission->id,
            'display_name' => 'New Display Name'
        ]);
    }

    public function test_cannot_deactivate_system_permission()
    {
        // Test logic
    }

    public function test_bulk_update_permissions()
    {
        // Test logic
    }

    public function test_permission_matrix_returns_correct_structure()
    {
        // Test logic
    }
}
```

#### 6.2 Frontend Tests
**Fayl**: `frontend/src/pages/__tests__/Permissions.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Permissions from '../Permissions';

describe('Permissions Page', () => {
  const queryClient = new QueryClient();

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('renders permissions list', async () => {
    render(<Permissions />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/səlahiyyət idarəetməsi/i)).toBeInTheDocument();
    });
  });

  it('filters permissions by category', async () => {
    const user = userEvent.setup();
    render(<Permissions />, { wrapper });

    const categorySelect = screen.getByLabelText(/kateqoriya/i);
    await user.click(categorySelect);
    await user.click(screen.getByText(/user management/i));

    await waitFor(() => {
      // Verify filtered results
    });
  });

  it('toggles permission status', async () => {
    const user = userEvent.setup();
    render(<Permissions />, { wrapper });

    const statusSwitch = screen.getAllByRole('switch')[0];
    await user.click(statusSwitch);

    await waitFor(() => {
      expect(screen.getByText(/status dəyişdirildi/i)).toBeInTheDocument();
    });
  });

  it('opens permission detail modal', async () => {
    const user = userEvent.setup();
    render(<Permissions />, { wrapper });

    const viewButton = screen.getAllByText(/detallar/i)[0];
    await user.click(viewButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
```

---

## 📊 İMPLEMENTASİYA TƏQVİMİ

| Faza | Təsvir | Təxmini Müddət | Status |
|------|--------|----------------|--------|
| 1 | Backend API hazırlığı | 3-4 saat | ⏳ Pending |
| 2 | Frontend service layer | 1-2 saat | ⏳ Pending |
| 3 | Frontend səhifə strukturu | 4-5 saat | ⏳ Pending |
| 4 | Əlavə komponentlər | 2-3 saat | ⏳ Pending |
| 5 | UX/UI təkmilləşdirmələr | 2-3 saat | ⏳ Pending |
| 6 | Testing və validasiya | 2-3 saat | ⏳ Pending |
| **TOPLAM** | | **14-20 saat** | |

---

## 🎯 ƏSASİ FUNKSİYALAR

### ✅ List View
- 290+ səlahiyyətin cədvəl formatında göstərilməsi
- Multi-column sorting
- Advanced filtering (category, scope, resource, action, status)
- Real-time search
- Pagination (20/50/100 per page)
- Bulk selection and operations
- Quick status toggle
- Responsive mobile view

### ✅ Matrix View
- Interactive role-permission matrix
- Virtual scrolling for performance
- Click-to-toggle functionality
- Hierarchy-aware validation
- Color-coded cells (active/inactive/not-allowed)
- Role and category filters
- Export to Excel

### ✅ Grouped View
- Group by category/resource/scope
- Accordion structure
- Group-level statistics
- Bulk operations per group
- Search within groups

### ✅ Permission Details
- Full metadata display
- Usage statistics (roles count, users count)
- Roles list that have this permission
- Users preview (top 50)
- Usage timeline chart
- Edit capability (display_name, description)
- Impact analysis before deactivation

### ✅ Bulk Operations
- Multi-select permissions
- Bulk activate/deactivate
- Bulk assign to roles
- Bulk revoke from roles
- Replace role permissions
- Impact preview
- Confirmation with detailed changes

### ✅ Analytics & Statistics
- Total permissions count
- Active/inactive breakdown
- Category distribution
- Scope distribution
- Most used permissions
- Unused permissions
- Recent changes log

---

## 🔐 TƏHLÜKƏSİZLİK PROTOKOLLARİ

### Giriş Nəzarəti
- ✅ SuperAdmin-only route protection
- ✅ Middleware: `auth:sanctum` + `role:superadmin`
- ✅ Frontend component-level checks
- ✅ API-level authorization

### Validasiya Qaydaları
- ✅ System permissions cannot be deactivated
- ✅ Permission name is immutable
- ✅ Hierarchy-aware permission assignment
- ✅ Impact analysis before critical operations
- ✅ Audit logging for all changes

### Performans
- ✅ Virtual scrolling for large lists
- ✅ Debounced search (300ms)
- ✅ React Query caching (10 min)
- ✅ Lazy loading for modals
- ✅ Memoized filters and calculations

---

## 📝 QEYDİYYAT

Bu plan **Spatie Permission** paketinə əsaslanaraq hazırlanmışdır və ATİS sisteminin mövcud arxitekturasına tam uyğundur. İmplementasiya zamanı:

1. **Təhlükəsizlik** prioritetdir (SuperAdmin-only)
2. **Performans** optimizasiya edilməlidir (290+ səlahiyyət)
3. **UX** istifadəçi dostu olmalıdır
4. **Testlər** yazılmalıdır (backend + frontend)
5. **Dokumentasiya** yenilənməlidir

---

**Plan hazırlayan**: Claude Code
**Tarix**: 2025-11-16
**Versiya**: 1.0
