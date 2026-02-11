# ATİS Notification Cleanup System

## 🛠️ Avtomatik Təmizlənmə Sistemi

### Konfiqurasiya edilmiş schedule-lar:

1. **Gündəlik təmizlənmə** - Hər gün saat 02:00
   - 7 gündən köhnə oxunmuş notifications silir
   - `php artisan notifications:cleanup --older-than=7`

2. **Həftəlik təmizlənmə** - Hər bazar günü saat 03:00
   - 30 gündən köhnə notifications silir
   - `php artisan notifications:cleanup --older-than=30`

3. **Aylıq hesabat** - Hər ayın 1-də saat 00:00
   - Notification sistemi statistikalarını log-a yazır

### Manual istifadə:

```bash
# Test etmək üçün (dry-run)
php artisan notifications:cleanup --dry-run --older-than=30

# 30 günlük köhnə notifications silmək
php artisan notifications:cleanup --older-than=30

# 60 günlük köhnə notifications silmək
php artisan notifications:cleanup --older-than=60

# Schedule siyahısını görmək
php artisan schedule:list

# Schedule-ları test etmək
php artisan schedule:run
```

### Production-da aktivləşdirmək:

1. **Linux crontab əlavə etmək:**
```bash
# Crontab redaktə etmək
crontab -e

# Bu sətiri əlavə etmək:
* * * * * cd /path-to-atis/backend && php artisan schedule:run >> /dev/null 2>&1
```

2. **Docker environment-də:**
```bash
# Docker container-də cron aktivləşdirmək
docker exec atis_backend crontab -l
```

### Tənzimləmə parametrləri:

- **--older-than=X**: X gündən köhnə notifications silir
- **--dry-run**: Həqiqi silmədən test edir
- Vaqt schedule edilməsi `routes/console.php`-də configure edilir

### Log monitoring:

Cleanup əməliyyatları log faylında izlənir:
```bash
tail -f storage/logs/laravel.log | grep "cleanup"
```

### Performance təsiri:

- Cleanup əməliyyatları gecə saatlarında icra olunur
- Yalnız oxunmuş (is_read=true) notifications silinir
- Kritik system notifications saxlanılır
- Database performansını artırır