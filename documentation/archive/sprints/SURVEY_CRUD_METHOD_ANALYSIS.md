# SurveyCrudService Method Analysis
**Sprint 3 - Day 1**
**Date**: 2025-01-07
**Target File**: backend/app/Services/SurveyCrudService.php
**File Size**: 1,012 lines
**Total Methods**: 30

---

## 📊 Method Inventory

### Public Methods (12)

| # | Method | Lines | Complexity | Purpose |
|---|--------|-------|------------|---------|
| 1 | `getPaginatedList()` | 28-58 (30) | 🟠 Medium | Paginated survey list with filtering/searching |
| 2 | `getWithRelations()` | 63-110 (47) | 🟠 Medium | Load survey with all relations |
| 3 | `create()` | 115-170 (55) | 🔴 High | Create new survey with transaction |
| 4 | `update()` | 175-286 (111) | 🔴 High | Update survey with versioning |
| 5 | `delete()` | 291-328 (37) | 🟢 Low | Delete survey with checks |
| 6 | `getSurveyForResponse()` | 333-369 (36) | 🟠 Medium | Get survey data for public response |
| 7 | `duplicate()` | 374-406 (32) | 🟢 Low | Duplicate existing survey |
| 8 | `formatForResponse()` | 529-559 (30) | 🟢 Low | Format survey for API (basic) |
| 9 | `formatDetailedForResponse()` | 564-619 (55) | 🟠 Medium | Format survey for API (detailed) |
| 10 | `getHierarchicalInstitutionIds()` | 856-883 (27) | 🟠 Medium | **HIERARCHY** - Get institution IDs by user role |
| 11 | `applyHierarchicalFiltering()` | 888-899 (11) | 🟢 Low | **HIERARCHY** - Apply access control to query |
| 12 | `applySurveyVisibilityFiltering()` | 904-931 (27) | 🟠 Medium | **HIERARCHY** - Apply visibility filtering |
| 13 | `getPerformanceBySector()` | 936-964 (28) | 🟠 Medium | **ANALYTICS** - Performance by sector |

### Protected Methods (6)

| # | Method | Lines | Complexity | Purpose |
|---|--------|-------|------------|---------|
| 14 | `applyFilters()` | 411-452 (41) | 🟠 Medium | Apply query filters |
| 15 | `applySorting()` | 457-469 (12) | 🟢 Low | Apply sorting to query |
| 16 | `createVersion()` | 474-486 (12) | 🟢 Low | Create survey version |
| 17 | `estimateResponseTime()` | 491-524 (33) | 🟢 Low | Estimate survey completion time |
| 18 | `sendSurveyNotification()` | 969-996 (27) | 🟢 Low | Send notification to targets |
| 19 | `logActivity()` | 1001-1011 (10) | 🟢 Low | Log user activity |

### Private Methods (12)

| # | Method | Lines | Complexity | Purpose |
|---|--------|-------|------------|---------|
| 20 | `syncQuestions()` | 639-705 (66) | 🔴 High | **CRITICAL** - Sync questions (create/update/delete) |
| 21 | `reindexQuestions()` | 710-720 (10) | 🟢 Low | Reindex questions after deletion |
| 22 | `prepareQuestionPayload()` | 722-750 (28) | 🟠 Medium | Prepare question data for DB |
| 23 | `normaliseOptions()` | 752-768 (16) | 🟢 Low | Normalize question options |
| 24 | `diffQuestionPayload()` | 770-793 (23) | 🟢 Low | Diff question changes |
| 25 | `hasQuestionChanges()` | 795-804 (9) | 🟢 Low | Check if questions changed |
| 26 | `mapQuestionType()` | 809-832 (23) | 🟢 Low | Map frontend → backend types |
| 27 | `mapQuestionTypeToFrontend()` | 837-851 (14) | 🟢 Low | Map backend → frontend types |
| 28 | `logSurveyAudit()` | 624-637 (13) | 🟢 Low | Log survey audit trail |

---

## 🏗️ Domain Analysis

### Domain 1: Query & Filtering (QueryBuilder) 🔍
**Purpose**: Survey listing, filtering, searching, sorting

**Methods** (5):
- `getPaginatedList()` - Main entry point
- `applyFilters()` - Status, type, creator, institution, date filters
- `applySorting()` - Sort by title, date, status
- `applyHierarchicalFiltering()` - Role-based access control
- `applySurveyVisibilityFiltering()` - Visibility rules (creator OR target)

**Complexity**: 🟠 Medium (148 lines)
**Dependencies**: Survey model, Auth
**Separation Candidate**: ✅ **YES** - Clear query building responsibility

---

### Domain 2: CRUD Operations (SurveyManager) 📝
**Purpose**: Core survey CRUD operations with transaction management

**Methods** (5):
- `create()` - Create survey with transaction, questions, version
- `update()` - Update survey with validation, versioning
- `delete()` - Delete with constraint checks
- `duplicate()` - Clone survey
- `getWithRelations()` - Load survey with all relations

**Complexity**: 🔴 High (282 lines total, 111 lines in update)
**Dependencies**: Survey, SurveyVersion, DB transactions
**Separation Candidate**: ✅ **YES** - Core business logic

---

### Domain 3: Question Management (QuestionSyncService) ❓
**Purpose**: Question synchronization, type mapping, validation

**Methods** (8):
- `syncQuestions()` - **CRITICAL** - Create/update/delete questions (66 lines)
- `reindexQuestions()` - Maintain sequential order
- `prepareQuestionPayload()` - Data transformation
- `normaliseOptions()` - Option normalization
- `diffQuestionPayload()` - Change detection
- `hasQuestionChanges()` - Check if sync needed
- `mapQuestionType()` - Frontend → Backend mapping
- `mapQuestionTypeToFrontend()` - Backend → Frontend mapping

**Complexity**: 🔴 High (172 lines)
**Dependencies**: SurveyQuestion model
**Separation Candidate**: ✅ **YES** - Self-contained question logic

---

### Domain 4: Response Formatting (SurveyFormatter) 📤
**Purpose**: Format surveys for API responses

**Methods** (3):
- `formatForResponse()` - Basic format (30 lines)
- `formatDetailedForResponse()` - Detailed format with questions (55 lines)
- `getSurveyForResponse()` - Public response format with validation (36 lines)

**Complexity**: 🟠 Medium (121 lines)
**Dependencies**: Survey model
**Separation Candidate**: ✅ **YES** - Pure data transformation

---

### Domain 5: Hierarchy & Access Control (HierarchyService) 🌳
**Purpose**: Institutional hierarchy and role-based access

**Methods** (3):
- `getHierarchicalInstitutionIds()` - Get accessible institutions by role
- `applyHierarchicalFiltering()` - Apply to query
- `applySurveyVisibilityFiltering()` - Complex visibility logic

**Complexity**: 🟠 Medium (65 lines)
**Dependencies**: Institution model, Roles
**Separation Candidate**: ✅ **MAYBE** - Already have HierarchicalAnalyticsService

---

### Domain 6: Versioning (VersionManager) 📚
**Purpose**: Survey version management

**Methods** (1):
- `createVersion()` - Create survey version snapshot

**Complexity**: 🟢 Low (12 lines)
**Dependencies**: SurveyVersion model
**Separation Candidate**: ⚠️ **MAYBE** - Too small, could merge with CRUD

---

### Domain 7: Analytics & Estimation (SurveyAnalytics) 📊
**Purpose**: Performance metrics and time estimation

**Methods** (2):
- `estimateResponseTime()` - Calculate survey duration
- `getPerformanceBySector()` - Regional performance metrics

**Complexity**: 🟠 Medium (61 lines)
**Dependencies**: Institution, SurveyResponse
**Separation Candidate**: ✅ **YES** - Analytics logic

---

### Domain 8: Notifications & Logging (ActivityTracker) 🔔
**Purpose**: Audit logging and notifications

**Methods** (3):
- `sendSurveyNotification()` - Send notifications to targets
- `logActivity()` - User activity logging
- `logSurveyAudit()` - Survey-specific audit trail

**Complexity**: 🟢 Low (50 lines)
**Dependencies**: NotificationService, ActivityLog, SurveyAuditLog
**Separation Candidate**: ✅ **YES** - Cross-cutting concern

---

## 🎯 Refactoring Strategy

### Recommended Domain Services (8)

#### 1. **SurveyQueryBuilder** 🔍
**Lines**: ~150
**Responsibility**: Query building, filtering, searching, sorting
**Methods**: 5 (getPaginatedList, applyFilters, applySorting, applyHierarchical, applyVisibility)
**Priority**: 🟢 High (frequently used)

#### 2. **SurveyCrudManager** 📝
**Lines**: ~200
**Responsibility**: Core CRUD operations with transactions
**Methods**: 5 (create, update, delete, duplicate, getWithRelations)
**Priority**: 🔴 Critical (core business logic)

#### 3. **QuestionSyncService** ❓
**Lines**: ~170
**Responsibility**: Question synchronization and type mapping
**Methods**: 8 (sync, reindex, prepare, normalize, diff, map types)
**Priority**: 🔴 Critical (complex logic)

#### 4. **SurveyResponseFormatter** 📤
**Lines**: ~120
**Responsibility**: API response formatting
**Methods**: 3 (formatForResponse, formatDetailed, getSurveyForResponse)
**Priority**: 🟢 High (API layer)

#### 5. **SurveyHierarchyFilter** 🌳
**Lines**: ~65
**Responsibility**: Hierarchical access control
**Methods**: 3 (getInstitutionIds, applyHierarchical, applyVisibility)
**Priority**: 🟠 Medium (can use existing HierarchicalAnalyticsService)

#### 6. **SurveyVersionManager** 📚
**Lines**: ~12
**Responsibility**: Version management
**Methods**: 1 (createVersion)
**Priority**: 🟡 Low (merge with CrudManager)

#### 7. **SurveyAnalyticsService** 📊
**Lines**: ~60
**Responsibility**: Analytics and estimation
**Methods**: 2 (estimateResponseTime, getPerformanceBySector)
**Priority**: 🟢 High (analytics)

#### 8. **SurveyActivityTracker** 🔔
**Lines**: ~50
**Responsibility**: Notifications and audit logging
**Methods**: 3 (sendNotification, logActivity, logAudit)
**Priority**: 🟢 High (compliance)

---

## 📊 Complexity Distribution

| Domain | Lines | Methods | Complexity | Priority |
|--------|-------|---------|------------|----------|
| **QuestionSyncService** | 172 | 8 | 🔴 High | Critical |
| **SurveyCrudManager** | 200 | 5 | 🔴 High | Critical |
| **SurveyQueryBuilder** | 150 | 5 | 🟠 Medium | High |
| **SurveyResponseFormatter** | 120 | 3 | 🟠 Medium | High |
| **SurveyHierarchyFilter** | 65 | 3 | 🟠 Medium | Medium |
| **SurveyAnalyticsService** | 60 | 2 | 🟠 Medium | High |
| **SurveyActivityTracker** | 50 | 3 | 🟢 Low | High |
| **SurveyVersionManager** | 12 | 1 | 🟢 Low | Low |

**Total Service Lines**: ~829 (excluding orchestrator overhead)
**Orchestrator Estimated**: ~180 lines (constructor + delegation)
**Total Refactored**: ~1,009 lines (vs original 1,012)

---

## 🚨 Critical Observations

### 1. Question Sync Complexity 🔴
**Lines**: 639-705 (66 lines)
**Issue**: Complex create/update/delete logic with diffing
**Risk**: High - question data integrity critical
**Recommendation**: Dedicated QuestionSyncService with extensive testing

### 2. Update Method Size 🔴
**Lines**: 175-286 (111 lines)
**Issue**: Longest method, transaction + versioning + logging
**Risk**: High - multiple concerns mixed
**Recommendation**: Break into smaller steps with clear separation

### 3. Hierarchical Filtering 🟠
**Lines**: Multiple methods (getHierarchicalInstitutionIds, applySurveyVisibilityFiltering)
**Issue**: Duplicates logic from HierarchicalAnalyticsService?
**Risk**: Medium - potential code duplication
**Recommendation**: Check if existing service can be reused

### 4. Type Mapping 🟢
**Lines**: 809-851 (2 methods)
**Issue**: Frontend ↔ Backend type mapping
**Risk**: Low - simple mapping logic
**Recommendation**: Keep in QuestionSyncService

### 5. Existing Infrastructure ✅
**Found**: SurveyTargetingService already exists
**Impact**: Can potentially use for target_institutions logic
**Recommendation**: Check SurveyTargetingService capabilities

---

## 🎯 Refactoring Plan (5 Days)

### Day 1: Analysis ✅ (Current)
- [x] Read all 1,012 lines
- [x] Identify 30 methods
- [x] Categorize into 8 domains
- [x] Create analysis document

### Day 2: Service Structure Creation
- [ ] Create 7-8 domain services:
  - SurveyQueryBuilder (150 lines)
  - SurveyCrudManager (200 lines)
  - QuestionSyncService (170 lines)
  - SurveyResponseFormatter (120 lines)
  - SurveyHierarchyFilter (65 lines) - OR reuse existing
  - SurveyAnalyticsService (60 lines)
  - SurveyActivityTracker (50 lines)
  - (Version manager merged into CrudManager)
- [ ] Refactor SurveyCrudService orchestrator (~180 lines)
- [ ] Create backup: SurveyCrudService.php.BACKUP_BEFORE_SPRINT3

### Day 3: Implementation Validation
- [ ] Line-by-line comparison with backup
- [ ] Verify question sync logic (CRITICAL)
- [ ] Verify update transaction logic
- [ ] Verify hierarchical filtering
- [ ] Create comparison report

### Day 4: Integration Testing
- [ ] Test Laravel DI resolution (7-8 services)
- [ ] Test database operations (Survey, SurveyQuestion, SurveyVersion)
- [ ] Test question sync (create, update, delete scenarios)
- [ ] Test hierarchical filtering with different roles
- [ ] Test API formatters

### Day 5: Final Documentation
- [ ] Update REFACTORING_EXECUTIVE_SUMMARY.md
- [ ] Create Sprint 3 summary
- [ ] Git commit and push

---

## ⚠️ Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Question sync data loss | 🔴 Critical | Extensive testing, backup, transaction safety |
| Update method regression | 🔴 High | Line-by-line verification, integration tests |
| Hierarchical logic duplication | 🟠 Medium | Check existing HierarchicalAnalyticsService first |
| API format breaking changes | 🟠 Medium | Preserve exact response structure |
| Notification logic disruption | 🟢 Low | NotificationService already abstracted |

---

## 📈 Expected Outcomes

### Code Quality
- **Before**: 1,012 lines, 30 methods, 1 monolithic file
- **After**: ~180 lines orchestrator + 7 services (~829 lines)
- **Reduction**: 82% orchestrator reduction
- **Maintainability**: ⬆️ High (each service <200 lines)

### Test Coverage
- **Before**: Unknown (likely low)
- **After**: 7 testable services + orchestrator
- **Unit Tests**: ~30-40 tests (each method)
- **Integration Tests**: ~15-20 tests (workflows)

### Performance
- **Impact**: Neutral (same logic, different structure)
- **Benefit**: Better caching potential (service-level)

---

**Created**: 2025-01-07 (Sprint 3 Day 1)
**Status**: Analysis complete, ready for Day 2
**Confidence**: 95% (high confidence in domain boundaries)
