# 🚀 ATİS Refactor - Production Deployment Guide

**Version**: 1.0
**Date**: 2025-11-14
**Target**: Production Environment (LIVE with 22+ institutions)

---

## ⚠️ CRITICAL: Production Safety Checklist

**BEFORE ANY DEPLOYMENT**:
- [ ] Database backup verified and tested
- [ ] Rollback plan documented and ready
- [ ] Maintenance window scheduled (if needed)
- [ ] Stakeholders notified
- [ ] Monitoring configured
- [ ] Emergency contacts available

---

## 🎯 Deployment Strategy: Feature Flag Rollout

### Phase 1: SurveyAnalytics (READY FOR DEPLOYMENT)

#### Pre-Deployment Checklist
```bash
# 1. Verify all files exist
ls -la backend/app/Services/SurveyAnalytics/SurveyAnalyticsFacade.php
ls -la backend/app/Services/SurveyAnalytics/Domains/

# 2. Check PHP syntax
find backend/app/Services/SurveyAnalytics -name "*.php" -exec php -l {} \;

# 3. Verify feature flag config
cat backend/config/features.php | grep use_refactored_analytics

# 4. Check AppServiceProvider
grep -A 20 "REFACTOR: Register SurveyAnalytics" backend/app/Providers/AppServiceProvider.php
```

#### Deployment Steps

**Step 1: Enable Feature Flag (Default: ON)**

```bash
# .env file (production)
FEATURE_REFACTORED_ANALYTICS=true

# This activates the new refactored services
```

**Step 2: Clear Laravel Caches**

```bash
# SSH to production server
cd /path/to/atis/backend

# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Rebuild config cache
php artisan config:cache
```

**Step 3: Verify Service Resolution**

```bash
# Test service binding
php artisan tinker

# In tinker:
>>> $service = app(\App\Services\SurveyAnalyticsService::class);
>>> get_class($service)
# Should return: "App\Services\SurveyAnalytics\SurveyAnalyticsFacade"

>>> exit
```

**Step 4: Test API Endpoints**

```bash
# Test a sample analytics endpoint
curl -X GET "https://your-production-domain.com/api/surveys/1/analytics" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Verify response structure matches expected format
```

**Step 5: Monitor Performance**

```bash
# Watch application logs
tail -f storage/logs/laravel.log | grep -i "analytics"

# Monitor slow query log
tail -f storage/logs/laravel.log | grep "Slow Query"

# Check error count
grep -c "ERROR" storage/logs/laravel-$(date +%Y-%m-%d).log
```

---

## 🔄 Rollback Procedure (1-Minute Rollback)

### If Issues Detected

**Immediate Rollback** (No code changes needed):

```bash
# 1. Disable feature flag in .env
FEATURE_REFACTORED_ANALYTICS=false

# 2. Clear config cache
php artisan config:clear
php artisan config:cache

# 3. Verify rollback
php artisan tinker
>>> $service = app(\App\Services\SurveyAnalyticsService::class);
>>> get_class($service)
# Should return: "App\Services\SurveyAnalyticsService" (original)

# DONE! System reverted to legacy service
```

**Total Rollback Time**: <1 minute
**Impact**: Zero downtime (hot swap)

---

## 📊 Gradual Rollout (Recommended)

### Week 1: 10% Users (Staging + Early Adopters)

```php
// config/features.php
'use_refactored_analytics' => env('FEATURE_REFACTORED_ANALYTICS', true),

// Enable for specific users (optional)
public function useRefactoredAnalytics(): bool
{
    $rolloutPercentage = config('features.rollout_percentage', 100);
    return (auth()->id() % 100) < $rolloutPercentage;
}
```

**Monitoring**:
- Watch error logs every 2 hours
- Monitor API response times
- Check database query performance
- Verify user feedback

### Week 2: 50% Users

```bash
# If Week 1 successful, increase rollout
FEATURE_REFACTORED_ANALYTICS=true  # Already at 100%
```

### Week 3: 100% Users

```bash
# Full production rollout
# Remove feature flag check from code (optional cleanup)
```

---

## 🔧 Configuration Files Reference

### 1. Feature Flag Config

**File**: `backend/config/features.php`

```php
<?php
return [
    'use_refactored_analytics' => env('FEATURE_REFACTORED_ANALYTICS', true),
    'log_analytics_performance' => env('FEATURE_LOG_ANALYTICS_PERFORMANCE', false),
];
```

### 2. Service Provider

**File**: `backend/app/Providers/AppServiceProvider.php`

```php
public function register(): void
{
    $useRefactoredAnalytics = config('features.use_refactored_analytics', true);

    if ($useRefactoredAnalytics) {
        // New refactored services
        $this->app->bind(\App\Services\SurveyAnalyticsService::class,
                        \App\Services\SurveyAnalytics\SurveyAnalyticsFacade::class);
    } else {
        // Legacy monolithic service
        $this->app->singleton(\App\Services\SurveyAnalyticsService::class);
    }
}
```

### 3. Environment Variables

**File**: `.env` (production)

```bash
# Feature Flags
FEATURE_REFACTORED_ANALYTICS=true
FEATURE_LOG_ANALYTICS_PERFORMANCE=false  # Enable only for debugging
```

---

## 🔍 Monitoring & Alerts

### Key Metrics to Monitor

1. **API Response Times**
   ```bash
   # Check average response time
   tail -f storage/logs/laravel.log | grep "Analytics" | grep "ms"
   ```

2. **Database Query Performance**
   ```bash
   # Watch for slow queries (>500ms)
   tail -f storage/logs/laravel.log | grep "Slow Query"
   ```

3. **Error Rate**
   ```bash
   # Count errors per hour
   grep "ERROR" storage/logs/laravel-$(date +%Y-%m-%d).log | wc -l
   ```

4. **Memory Usage**
   ```bash
   # Monitor PHP memory
   grep "Memory usage" storage/logs/laravel.log
   ```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Response time | >500ms | >1000ms | Rollback |
| Error rate | >10/hour | >50/hour | Rollback |
| Memory usage | >200MB | >400MB | Investigate |
| Query time | >500ms | >1000ms | Optimize |

---

## 🧪 Testing Checklist (Pre-Deployment)

### Unit Tests (Recommended)

```bash
# Run PHPUnit tests
cd backend
php artisan test --filter Analytics

# Expected: All tests passing
```

### Integration Tests

```bash
# Test full analytics flow
php artisan test --filter SurveyAnalytics

# Test controller endpoints
php artisan test --filter SurveyAnalyticsController
```

### Manual Testing

1. **Login as different roles**:
   - SuperAdmin
   - RegionAdmin
   - SchoolAdmin

2. **Test key features**:
   - Survey statistics page
   - Analytics dashboard
   - Export functionality
   - Response trends

3. **Verify data accuracy**:
   - Compare old vs new analytics output
   - Check calculation accuracy
   - Verify permission filtering

---

## 🚨 Troubleshooting Guide

### Issue 1: "Class not found" Error

**Error**:
```
Class 'App\Services\SurveyAnalytics\SurveyAnalyticsFacade' not found
```

**Solution**:
```bash
# Rebuild autoload files
composer dump-autoload

# Clear Laravel caches
php artisan config:clear
php artisan cache:clear
```

### Issue 2: Service Not Resolving

**Error**:
```
Target class [App\Services\SurveyAnalyticsService] does not exist.
```

**Solution**:
```bash
# Check feature flag
php artisan tinker
>>> config('features.use_refactored_analytics')

# Clear config cache
php artisan config:clear
php artisan config:cache
```

### Issue 3: Performance Degradation

**Symptoms**: Slow response times

**Solution**:
```bash
# 1. Enable query logging
FEATURE_LOG_ANALYTICS_PERFORMANCE=true

# 2. Check slow queries
tail -f storage/logs/laravel.log | grep "Slow Query"

# 3. If persistent, rollback
FEATURE_REFACTORED_ANALYTICS=false
php artisan config:cache
```

### Issue 4: Incorrect Data

**Symptoms**: Analytics showing wrong numbers

**Solution**:
```bash
# 1. Immediate rollback
FEATURE_REFACTORED_ANALYTICS=false
php artisan config:cache

# 2. Report issue with:
- Survey ID affected
- Expected vs actual values
- User role
- Timestamp

# 3. Debug in development environment
```

---

## 📞 Emergency Contacts

### Production Support

| Role | Contact | Availability |
|------|---------|--------------|
| Development Lead | [Email/Phone] | 24/7 |
| DevOps Engineer | [Email/Phone] | 24/7 |
| System Administrator | [Email/Phone] | Business hours |

### Escalation Path

1. **Level 1**: Development Lead (immediate rollback)
2. **Level 2**: DevOps Engineer (infrastructure issues)
3. **Level 3**: System Administrator (critical system failures)

---

## ✅ Post-Deployment Checklist

### Day 1 (Deployment Day)
- [ ] Feature flag enabled
- [ ] Services resolving correctly
- [ ] API endpoints responding
- [ ] No errors in logs
- [ ] Performance metrics normal
- [ ] User feedback positive

### Week 1
- [ ] Daily log review
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Bug tracking
- [ ] Documentation updates

### Week 2
- [ ] Performance comparison report
- [ ] Error rate analysis
- [ ] User satisfaction survey
- [ ] Optimization opportunities

### Week 4
- [ ] Final deployment report
- [ ] Lessons learned document
- [ ] Update production documentation
- [ ] Plan next refactor phase

---

## 📝 Deployment Log Template

```markdown
# Deployment Log

**Date**: YYYY-MM-DD
**Time**: HH:MM
**Environment**: Production
**Change**: SurveyAnalytics Refactor v1.0

## Pre-Deployment
- [ ] Backup verified
- [ ] Rollback tested
- [ ] Monitoring configured

## Deployment
- [ ] Feature flag enabled: HH:MM
- [ ] Caches cleared: HH:MM
- [ ] Services verified: HH:MM

## Post-Deployment
- [ ] First request: HH:MM - SUCCESS/FAIL
- [ ] Error rate: X errors/hour
- [ ] Response time: X ms avg

## Issues
- None / [List issues]

## Rollback (if needed)
- Rollback time: HH:MM
- Reason: [Explain]
- Impact: [Describe]

## Sign-off
- Deployed by: [Name]
- Verified by: [Name]
- Status: SUCCESS/ROLLBACK
```

---

## 🎯 Success Criteria

Deployment is considered successful if:

- ✅ Zero increase in error rate
- ✅ Response times within 10% of baseline
- ✅ All API endpoints functional
- ✅ No data accuracy issues
- ✅ No user-reported bugs (critical)
- ✅ Rollback plan tested and ready

---

**Last Updated**: 2025-11-14
**Version**: 1.0
**Status**: PRODUCTION READY (SurveyAnalytics)

---

*This guide is for SurveyAnalytics refactor deployment. SurveyApproval deployment guide will be created after completion.*
