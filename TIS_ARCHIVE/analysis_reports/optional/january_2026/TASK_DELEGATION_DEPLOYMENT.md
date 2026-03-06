# Task Delegation Enhancement - Production Deployment Guide

## 📋 Overview

**Date**: 2025-12-28
**Feature**: Hierarchy-based Task Delegation System
**Status**: ✅ Development Complete, Ready for Production

## 🎯 What Changed

### 1. Fixed Assigned Tasks Query Logic
**File**: `backend/app/Http/Controllers/TaskControllerRefactored.php` (Lines 140-154)

**Problem**: Users assigned to tasks couldn't see them on `/tasks/assigned` page.

**Root Cause**: Incorrect `orWhere` clause checking institution_id within assignments subquery.

**Solution**: Restructured query with three distinct OR conditions:
- Tasks directly assigned to user (`assigned_to`)
- Tasks with assignment record for user (`assignments.assigned_user_id`)
- Tasks assigned to user's institution (`assigned_to_institution_id` OR `target_institutions`)

### 2. Enhanced Delegation System
**File**: `backend/app/Http/Controllers/TaskControllerRefactored.php` (Lines 957-998)

**Previous Logic**: Users could only delegate to same institution users.

**New Logic**: Hierarchy-based delegation:
- ✅ Same level users (same role level)
- ✅ Lower level users (higher level number = lower authority)
- ✅ Same institution users
- ✅ Subordinate institution users (via `parent_id`)

**Example**:
- SektorAdmin (Level 4) can delegate to:
  - Other SektorAdmins (Level 4)
  - SchoolAdmins (Level 5)
  - Müəllimlər (Level 7)

## 🧪 Testing Results

### Development Environment Tests

#### Test 1: Assigned Tasks API
```bash
GET /api/tasks/assigned-to-me
User: Pərviz Rəcəbov (SektorAdmin, ID: 6)
Result: ✅ Task #1 appears correctly
```

#### Test 2: Eligible Delegates
```bash
GET /api/tasks/1/eligible-delegates
User: Pərviz Rəcəbov (SektorAdmin, Level 4)
Result: ✅ 96 eligible delegates returned
- All Level 5+ (SchoolAdmin, Müəllim)
- From same and subordinate institutions
```

#### Test 3: Delegation Hierarchy Logic
```bash
User: SektorAdmin (Level 4, Institution 6)
Expected: Level 4+ users from same/subordinate institutions
Result: ✅ Correct - 96 eligible users
```

## 📦 Files Modified

### Backend Changes

1. **TaskControllerRefactored.php** (2 methods modified)
   - `getAssignedToCurrentUser()` - Lines 140-154
   - `getEligibleDelegates()` - Lines 957-998

### No Frontend Changes Required
- ✅ Frontend already supports delegation
- ✅ `TaskDelegationModal.tsx` component exists
- ✅ `taskDelegationService.getEligibleDelegates()` works correctly
- ✅ UI already integrated in AssignedTasks page

## 🚀 Deployment Steps

### Step 1: Backend Deployment

```bash
# 1. Connect to production server
ssh user@atis.sim.edu.az

# 2. Navigate to backend directory
cd /path/to/atis/backend

# 3. Create backup
cp app/Http/Controllers/TaskControllerRefactored.php \
   app/Http/Controllers/TaskControllerRefactored.php.backup.$(date +%Y%m%d)

# 4. Pull latest changes from git
git pull origin main

# 5. Verify file changes
git diff HEAD~1 app/Http/Controllers/TaskControllerRefactored.php

# 6. Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# 7. Restart PHP-FPM (if using)
sudo systemctl restart php8.3-fpm

# OR restart Docker containers (if using Docker)
docker compose restart backend
```

### Step 2: Verification

```bash
# Test assigned tasks endpoint
curl -X GET "https://atis.sim.edu.az/api/tasks/assigned-to-me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Test eligible delegates endpoint
curl -X GET "https://atis.sim.edu.az/api/tasks/1/eligible-delegates" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

### Step 3: Smoke Testing

1. **Login as RegionAdmin**
   - Create a new task
   - Assign to multiple users (RegionOperators, SektorAdmins)

2. **Login as Assigned User**
   - Check `/tasks/assigned` page
   - Verify task appears ✅
   - Open delegation modal
   - Verify eligible delegates appear based on hierarchy ✅

3. **Test Delegation**
   - Select a lower-level user
   - Delegate task
   - Login as delegated user
   - Verify task appears ✅

## ⚠️ Rollback Plan

If issues occur:

```bash
# 1. Restore backup
cp app/Http/Controllers/TaskControllerRefactored.php.backup.YYYYMMDD \
   app/Http/Controllers/TaskControllerRefactored.php

# 2. Clear caches
php artisan cache:clear
php artisan route:clear

# 3. Restart services
docker compose restart backend
# OR
sudo systemctl restart php8.3-fpm
```

## 🔒 Security Considerations

- ✅ All endpoints protected by `auth:sanctum` middleware
- ✅ `tasks.read` permission checked
- ✅ Hierarchy validation prevents unauthorized delegation
- ✅ Users can only delegate to same/lower level
- ✅ Institution hierarchy respected

## 📊 Expected Impact

### Performance
- ✅ No database schema changes
- ✅ No new migrations required
- ✅ Query optimization maintains performance
- ✅ Eager loading prevents N+1 queries

### User Experience
- ✅ Users can now see assigned tasks (bug fixed)
- ✅ Delegation works hierarchically (as expected)
- ✅ More intuitive delegation options
- ✅ Better workflow distribution

### Data Integrity
- ✅ No data migration required
- ✅ Backward compatible
- ✅ Existing assignments unaffected

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] RegionAdmin can create tasks
- [ ] Assigned users see tasks on `/tasks/assigned`
- [ ] Delegation modal shows correct eligible users
- [ ] Hierarchy-based filtering works (same/lower level)
- [ ] Subordinate institutions included
- [ ] Task status updates work
- [ ] No console errors in browser
- [ ] No backend errors in logs

## 📞 Support

If issues arise:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Check Docker logs: `docker compose logs backend`
3. Test API endpoints directly with curl
4. Verify user roles and permissions in database

## 🎓 Technical Notes

### Database Column Used
- `institutions.parent_id` - Links child institutions to parent

### Role Hierarchy Levels
```
Level 1: superadmin
Level 2: regionadmin
Level 3: regionoperator
Level 4: sektoradmin
Level 5: schooladmin
Level 6: müavin
Level 7: müəllim
```

### Query Logic
```sql
-- Eligible Delegates Query
SELECT users.*
FROM users
WHERE users.id != current_user_id
AND (
    users.institution_id = current_user_institution_id
    OR users.institution_id IN (
        SELECT id FROM institutions
        WHERE parent_id = current_user_institution_id
    )
)
AND EXISTS (
    SELECT 1 FROM model_has_roles mhr
    INNER JOIN roles r ON mhr.role_id = r.id
    WHERE mhr.model_id = users.id
    AND r.level >= current_user_level
)
ORDER BY role_level ASC
```

---

**Prepared by**: Claude Code
**Date**: 2025-12-28
**Version**: 1.0
