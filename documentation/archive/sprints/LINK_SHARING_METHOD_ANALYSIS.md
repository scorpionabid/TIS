# LinkSharingService Method Analysis

**Date**: 2025-01-07
**File**: backend/app/Services/LinkSharingService.php
**Total Lines**: 1,000
**Total Methods**: 29
**Target**: Domain-Driven Refactoring

---

## 📊 Method Inventory

### Public Methods (10)
1. `getAccessibleLinks(Request, $user)` - Get filtered links with pagination
2. `createLinkShare(array, $user)` - Create new link with notifications
3. `updateLinkShare($linkShare, array, $user)` - Update existing link
4. `deleteLinkShare($linkShare, $user)` - Soft delete link
5. `accessLink($linkShare, Request, $user)` - Access link and log
6. `getLinkStatistics($linkShare, $user)` - Get detailed statistics
7. `getSharingOptions($user)` - Get available sharing options
8. `recordClick($linkShare, Request, $user)` - Record click event
9. `bulkCreateLinks(array, $user)` - Bulk create multiple links
10. `getPopularLinks(Request, $user)` - Get popular links (by click count)
11. `getFeaturedLinks(Request, $user)` - Get featured links
12. `getGlobalLinkStats(Request, $user)` - Get global statistics
13. `accessLinkById(int, $user, Request)` - Access link by ID
14. `getAssignedResources(Request, $user)` - Get links + documents for user

### Protected Methods (1)
15. `applyRequestFilters($query, Request)` - Apply standard filters

### Private Methods (14)
16. `applyRegionalFilter($query, $user)` - Apply hierarchical filtering
17. `canCreateLinkWithScope($user, $scope)` - Validate scope permission
18. `getAvailableScopesForRole($roleName)` - Get scopes for role
19. `getAvailableTargetRoles($roleName)` - Get targetable roles
20. `getUserTargetableInstitutions($user)` - Get targetable institutions
21. `canModifyLink($user, $linkShare)` - Check modify permission
22. `canAccessLink($user, $linkShare)` - Check access permission
23. `canViewLinkStats($user, $linkShare)` - Check stats view permission
24. `logLinkAccess($linkShare, Request, $user)` - Log access event
25. `sendLinkNotification(LinkShare, string, array, $user)` - Send notifications
26. `mapLinkPriorityToNotificationPriority(string)` - Map priority
27. `getAllowedInstitutionsForUser($user)` - Get allowed institutions
28. `getSectorInstitutions($sektorId)` - Get sector institutions

---

## 🎯 Domain Mapping

### Domain 1: **Query** (Filtering, Search, Pagination)
**Lines**: ~200-250
**Complexity**: MEDIUM
**Methods**:
- `getAccessibleLinks()` (lines 30-65) - Main query + filters + pagination
- `applyRequestFilters()` (lines 350-392) - 10 filter types
- `applyRegionalFilter()` (lines 397-440) - Hierarchical access control
- `getPopularLinks()` (lines 657-665) - Popular links query
- `getFeaturedLinks()` (lines 670-678) - Featured links query
- `getGlobalLinkStats()` (lines 683-706) - Global statistics query
- `getAssignedResources()` (lines 783-968) - **COMPLEX** - Combined links + documents

**Dependencies**: None (pure query logic)

**Critical Logic**:
- Regional hierarchy filtering (lines 397-440) - 44 lines
- Target institutions JSON filtering (lines 424-427, 814-817)
- Role-based scope filtering (superadmin, regionadmin, sektoradmin, schooladmin)

---

### Domain 2: **CRUD** (Create, Update, Delete)
**Lines**: ~180-200
**Complexity**: MEDIUM
**Methods**:
- `createLinkShare()` (lines 70-123) - Create with hash generation + transaction
- `updateLinkShare()` (lines 128-167) - Update with scope validation
- `deleteLinkShare()` (lines 172-187) - Soft delete
- `bulkCreateLinks()` (lines 322-345) - Bulk operations

**Dependencies**:
- PermissionService (validation)
- NotificationService (link notifications)

**Critical Logic**:
- Unique hash generation (lines 79-81) - Collision prevention
- Scope change validation (lines 137-141)
- Transaction boundaries (DB::transaction)

---

### Domain 3: **Permission** (Authorization, Access Control)
**Lines**: ~150-180
**Complexity**: HIGH
**Methods**:
- `canCreateLinkWithScope()` (lines 445-449) - Validate creation permission
- `canModifyLink()` (lines 530-559) - Check modify permission
- `canAccessLink()` (lines 564-618) - **COMPLEX** - 55 lines access logic
- `canViewLinkStats()` (lines 623-637) - Stats viewing permission
- `getAvailableScopesForRole()` (lines 454-482) - Scope mapping (29 lines)
- `getAvailableTargetRoles()` (lines 487-497) - Target role mapping
- `getUserTargetableInstitutions()` (lines 502-525) - Institution targeting
- `getAllowedInstitutionsForUser()` (lines 973-989) - Allowed institutions
- `getSectorInstitutions()` (lines 994-1000) - Sector institutions

**Dependencies**: User, Institution models

**Critical Logic**:
- `canAccessLink()` - Scope-based access (national, regional, sectoral, institutional)
- Target roles validation (lines 586-591)
- Hierarchical institution checking (lines 594-617)

---

### Domain 4: **Access** (Link Access, Click Tracking)
**Lines**: ~120-150
**Complexity**: MEDIUM
**Methods**:
- `accessLink()` (lines 192-219) - Access link with validation
- `recordClick()` (lines 301-317) - Record click event
- `accessLinkById()` (lines 711-728) - Access by ID
- `logLinkAccess()` (lines 642-652) - Log access to database

**Dependencies**: LinkAccessLog model

**Critical Logic**:
- Expiration validation (lines 199-201)
- Access logging (IP, user agent, referrer)
- Access count increment

---

### Domain 5: **Statistics** (Analytics, Metrics)
**Lines**: ~100-120
**Complexity**: MEDIUM
**Methods**:
- `getLinkStatistics()` (lines 224-269) - Detailed statistics
- `getGlobalLinkStats()` (lines 683-706) - Global overview

**Dependencies**: LinkAccessLog model, LinkAnalyticsService (already separated)

**Critical Logic**:
- Daily access aggregation (lines 247-253)
- Access by role aggregation (lines 256-262)
- Unique user counting (lines 232-234)

**Note**: LinkAnalyticsService (494 lines) already provides advanced analytics

---

### Domain 6: **Configuration** (Options, Metadata)
**Lines**: ~80-100
**Complexity**: LOW
**Methods**:
- `getSharingOptions()` (lines 274-296) - Get available options
- `getAvailableScopesForRole()` (lines 454-482) - Scope definitions
- `getAvailableTargetRoles()` (lines 487-497) - Target role definitions
- `mapLinkPriorityToNotificationPriority()` (lines 770-778) - Priority mapping

**Dependencies**: None (pure configuration)

**Critical Logic**:
- Role-to-scope mapping
- Link types definition
- Priority levels

---

### Domain 7: **Notification** (Event Notifications)
**Lines**: ~50-70
**Complexity**: LOW
**Methods**:
- `sendLinkNotification()` (lines 733-765) - Send notification
- `mapLinkPriorityToNotificationPriority()` (lines 770-778) - Priority mapping

**Dependencies**: NotificationService

**Critical Logic**:
- Template variable preparation (lines 738-743)
- Institution-based targeting (lines 746-749)

---

## 📋 Existing Infrastructure

### Already Separated
- **LinkAnalyticsService** (494 lines) - Advanced analytics and metrics
  - Methods: getLinkAnalytics, getLinkAccessStats, getTopLinks, etc.

### Dependencies
- **NotificationService** - Already injected (line 20)
- **BaseService** - Parent class (line 18)

### Models Used
- **LinkShare** - Main model
- **LinkAccessLog** - Access tracking
- **Institution** - Hierarchical structure
- **Document** - Combined with links in getAssignedResources

---

## 🔄 Refactoring Strategy

### Service Breakdown (6 Domain Services)

#### 1. **LinkQueryBuilder** (~250 lines, 7 methods)
- getAccessibleLinks
- applyRequestFilters
- applyRegionalFilter
- getPopularLinks
- getFeaturedLinks
- getGlobalLinkStats
- getAssignedResources

#### 2. **LinkCrudManager** (~200 lines, 4 methods)
- createLinkShare (with hash generation)
- updateLinkShare
- deleteLinkShare
- bulkCreateLinks

#### 3. **LinkPermissionService** (~180 lines, 9 methods)
- canCreateLinkWithScope
- canModifyLink
- canAccessLink
- canViewLinkStats
- getAvailableScopesForRole
- getAvailableTargetRoles
- getUserTargetableInstitutions
- getAllowedInstitutionsForUser
- getSectorInstitutions

#### 4. **LinkAccessManager** (~150 lines, 4 methods)
- accessLink
- recordClick
- accessLinkById
- logLinkAccess

#### 5. **LinkStatisticsService** (~120 lines, 2 methods)
- getLinkStatistics
- getGlobalLinkStats (shared with Query)

#### 6. **LinkConfigurationService** (~100 lines, 4 methods)
- getSharingOptions
- getAvailableScopesForRole (shared with Permission)
- getAvailableTargetRoles (shared with Permission)
- mapLinkPriorityToNotificationPriority

#### 7. **LinkNotificationService** (~70 lines, 2 methods)
- sendLinkNotification
- mapLinkPriorityToNotificationPriority

### Orchestrator: **LinkSharingService** (~200-250 lines)
- Constructor with 6-7 dependency injections
- 14 public delegation methods
- Activity logging integration

---

## 🚨 Critical Sections to Preserve

### 1. **Hash Generation Algorithm** (lines 79-81)
```php
do {
    $linkHash = Str::random(32);
} while (LinkShare::where('link_hash', $linkHash)->exists());
```
**Why Critical**: Collision prevention for unique link URLs
**Test**: Verify uniqueness in bulk operations

### 2. **canAccessLink Logic** (lines 564-618, 55 lines)
```php
// Complex scope-based access control
switch ($linkShare->share_scope) {
    case 'national': return true;
    case 'regional': // 4 lines hierarchy check
    case 'sectoral': // 4 lines hierarchy check
    case 'institutional': // 1 line direct match
}
```
**Why Critical**: Core authorization logic
**Test**: All 4 scope types + role combinations

### 3. **Regional Filtering** (lines 397-440, 44 lines)
```php
// Hierarchical filtering: superadmin, regionadmin, sektoradmin, schooladmin
// Each role has specific institution access patterns
```
**Why Critical**: Data isolation and security
**Test**: All 4 role types with various institution levels

### 4. **Transaction Boundaries** (lines 72, 135, 178, 303, 324)
```php
DB::transaction(function () use (...) { ... });
```
**Why Critical**: Data consistency
**Test**: Rollback scenarios

### 5. **getAssignedResources** (lines 783-968, 186 lines!)
**Why Critical**: Most complex method, combines links + documents
**Risk**: High complexity, heavy logging, multiple queries
**Strategy**: Extract to separate service or keep in Query domain

---

## 📊 Complexity Analysis

| Domain | Lines | Methods | Complexity | Risk | Priority |
|--------|-------|---------|------------|------|----------|
| Query | 250 | 7 | MEDIUM | MEDIUM | HIGH |
| CRUD | 200 | 4 | MEDIUM | LOW | HIGH |
| Permission | 180 | 9 | HIGH | HIGH | CRITICAL |
| Access | 150 | 4 | MEDIUM | LOW | MEDIUM |
| Statistics | 120 | 2 | LOW | LOW | LOW |
| Configuration | 100 | 4 | LOW | LOW | LOW |
| Notification | 70 | 2 | LOW | LOW | LOW |

**Total New Services**: 1,070 lines across 7 services
**Orchestrator**: ~250 lines
**Total**: ~1,320 lines (vs 1,000 original - 32% expansion for modularity)

---

## ✅ Success Metrics

### Code Quality
- ✅ Orchestrator: 1,000 → ~250 lines (75% reduction)
- ✅ Average service size: ~153 lines (maintainable)
- ✅ Single Responsibility Principle maintained
- ✅ 100% logic preservation required

### Testing
- ✅ Hash generation uniqueness
- ✅ All 4 scope types (national, regional, sectoral, institutional)
- ✅ All 4 role types (superadmin, regionadmin, sektoradmin, schooladmin)
- ✅ Transaction rollback scenarios
- ✅ Permission edge cases (target roles, institutions)

### Production Safety
- ✅ Zero breaking changes to API
- ✅ Backward compatible responses
- ✅ No data loss risk
- ✅ Rollback plan ready (backup file)

---

## 🎯 Day 1 Summary

**Analyzed**: 29 methods, 1,000 lines
**Identified**: 7 domain services
**Critical Sections**: 5 (hash, access, regional filter, transactions, assigned resources)
**Complexity**: MEDIUM-HIGH (Permission domain is complex)
**Infrastructure**: LinkAnalyticsService already separated (494 lines)

**Next Steps**:
- Day 2: Create 7 domain services
- Day 3: Line-by-line validation (focus on canAccessLink, regional filter)
- Day 4: Integration testing with Laravel DI

**Estimated Reduction**: 75% (1,000 → 250 orchestrator + 1,070 services)

---

**Status**: ✅ Day 1 COMPLETED
**Date**: 2025-01-07
**Analyst**: Claude Code AI
