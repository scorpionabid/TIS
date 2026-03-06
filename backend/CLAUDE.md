# Backend Development Rules (Laravel 11 + PHP 8.3)

## Commands (always inside Docker)

```bash
docker exec atis_backend php artisan migrate
docker exec atis_backend php artisan migrate:status
docker exec atis_backend php artisan test
docker exec atis_backend php artisan tinker
docker exec atis_backend composer install
docker exec atis_backend composer test
docker exec atis_backend php artisan cache:clear
docker exec atis_backend php artisan config:clear
docker exec atis_backend php artisan permission:cache-reset
```

## Directory Structure

- `app/Http/Controllers/` — API controllers
- `app/Models/` — 83+ Eloquent models
- `app/Services/` — Business logic services
- `app/Http/Requests/` — FormRequest validation
- `app/Http/Resources/` — API Resource transformations
- `database/migrations/` — 120+ migrations
- `database/seeders/` — SuperAdminSeeder, InstitutionTypeSeeder, etc.

## Coding Patterns

### Controllers
- Always use FormRequest for validation
- Always use API Resource for response transformation
- Always check authorization: `$this->authorize('ability', Model::class)`
- Return consistent JSON: `{ success: bool, data: any, message: string }`

### Models & Queries
- Define all relationships explicitly (belongsTo, hasMany, etc.)
- Always use eager loading (`with()`) to prevent N+1 queries
- Use query scopes for reusable filters
- Soft deletes where data retention is needed

### Migrations
- NEVER modify existing migration files
- Always add `->down()` method for rollback
- Use foreign key constraints and indexes
- Test with `php artisan migrate:fresh` in development

### Permissions (spatie/laravel-permission)
- 12 roles with hierarchical inheritance
- 48+ granular permissions
- Middleware: `permission:permission_name`
- Role check: `$user->hasRole('RoleName')`
- After seeder changes: run `php artisan permission:cache-reset`

## Database

- PostgreSQL 16 (Docker container: atis_postgres, port 5433→5432)
- Connection: `DB_CONNECTION=pgsql`
- Dev credentials: `atis_dev_user` / `atis_dev`
- Data isolation: Users see only their institution hierarchy data

## Authentication

- Laravel Sanctum (token-based)
- 24h token expiration
- Progressive lockout: 5 failed attempts = 30min lock
- Multi-device login tracking
