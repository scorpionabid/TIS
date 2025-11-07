# ATİS Refactoring Sprint Plan - Mərhələli İcra

**Strategy:** Phased approach with incremental delivery
**Timeline:** 6 sprints × 1 week = 6 weeks total
**Risk Level:** 🟢 LOW - Each sprint is independently testable and deployable

---

## 📊 Sprint Overview

| Sprint | Focus | Lines Reduced | Risk | Duration |
|--------|-------|---------------|------|----------|
| **Sprint 0** ✅ | Planning & Cleanup | -20 | 🟢 | DONE |
| **Sprint 1** | Frontend Refactor | -600 | 🟢 | Week 1 |
| **Sprint 2** | Backend Easy Wins | -300 | 🟢 | Week 2 |
| **Sprint 3** | Survey Services (Part 1) | -500 | 🟠 | Week 3 |
| **Sprint 4** | Survey Services (Part 2) | -400 | 🟠 | Week 4 |
| **Sprint 5** | Grade Controller | -600 | 🔴 | Week 5 |
| **Sprint 6** | Testing & Deployment | 0 | 🟢 | Week 6 |

**Total Reduction:** ~2,400 lines across 8 critical files

---

## ✅ Sprint 0: Planning & Cleanup (COMPLETED)

**Duration:** 2025-11-06 (1 day)

### Deliverables ✅
- [x] `REFACTORING_ROADMAP_2025.md` - Master plan
- [x] `REFACTORING_EXECUTIVE_SUMMARY.md` - Stakeholder summary
- [x] `REFACTORING_TARGETS.md` - Updated priorities
- [x] `files_over_500_lines.txt` - Current snapshot
- [x] Backup files cleaned (4 files removed)
- [x] Test suite verified (backend + frontend passing)
- [x] Git commit with documentation

### Results ✅
- **Lines cleaned:** 20 lines (backup files)
- **Documentation:** 4 comprehensive documents
- **Team readiness:** 100% - All plans documented

---

## 🎯 Sprint 1: Frontend Service Refactor (LOW RISK)

**Duration:** Week 1 (5 working days)
**Priority:** 🟢 LOW RISK - No backend changes, easy rollback
**Target File:** `frontend/src/services/superAdmin.ts` (1035 lines → <150 lines)

### Why Start with Frontend?
1. ✅ **Zero backend impact** - No database, no API changes
2. ✅ **Easy rollback** - Just revert imports if issues arise
3. ✅ **Quick win** - Team sees immediate progress
4. ✅ **Low risk** - Only affects SuperAdmin role (limited users)
5. ✅ **Good practice** - Tests the refactoring workflow

### Sprint 1 Scope

#### Day 1: Analysis & Structure
**Goal:** Understand current service and plan split

Tasks:
- [ ] Analyze `superAdmin.ts` method categories
- [ ] Identify which methods belong to which domain
- [ ] Check for circular dependencies
- [ ] Map existing services that overlap (dashboard.ts, users.ts, etc.)
- [ ] Create directory structure plan

**Deliverable:** `SUPERADMIN_REFACTOR_ANALYSIS.md`

**Success Criteria:**
- All 40+ methods categorized
- Clear domain boundaries defined
- No surprises in dependencies

---

#### Day 2: Create Service Files (Non-Breaking)
**Goal:** Create new service files without modifying original

Tasks:
- [ ] Create `frontend/src/services/superAdmin/` directory
- [ ] Create `superAdminUsers.ts` (user management APIs)
- [ ] Create `superAdminInstitutions.ts` (institution APIs)
- [ ] Create `superAdminReports.ts` (report APIs)
- [ ] Create `superAdminSurveys.ts` (survey APIs)
- [ ] Create `superAdminDashboard.ts` (dashboard APIs)
- [ ] Create `superAdminSystem.ts` (system health APIs)
- [ ] Create `index.ts` (re-exports for backward compatibility)

**Code Strategy:**
```typescript
// frontend/src/services/superAdmin/index.ts
// Re-export everything for backward compatibility
export * from './superAdminUsers';
export * from './superAdminInstitutions';
export * from './superAdminReports';
export * from './superAdminSurveys';
export * from './superAdminDashboard';
export * from './superAdminSystem';

// Keep this for transition period
export { default as SuperAdminService } from './legacy';
```

**Deliverable:** 7 new TypeScript files (all passing lint + typecheck)

**Success Criteria:**
- All files created and structured
- TypeScript types properly defined
- No compilation errors
- Zero runtime impact (files not imported yet)

---

#### Day 3: Move Methods & Test
**Goal:** Split methods into domain services

Tasks:
- [ ] Copy user management methods to `superAdminUsers.ts`
- [ ] Copy institution methods to `superAdminInstitutions.ts`
- [ ] Copy report methods to `superAdminReports.ts`
- [ ] Copy survey methods to `superAdminSurveys.ts`
- [ ] Copy dashboard methods to `superAdminDashboard.ts`
- [ ] Copy system health methods to `superAdminSystem.ts`
- [ ] Write unit tests for each new service (MSW mocks)
- [ ] Ensure all TypeScript interfaces are correct

**Testing Checklist:**
```bash
# Run TypeScript check
npm run typecheck

# Run linter
npm run lint

# Run unit tests
npm test -- superAdmin

# Check bundle size impact
npm run build
```

**Deliverable:** All methods split + unit tests passing

**Success Criteria:**
- Each service has <200 lines
- All TypeScript types preserved
- Unit tests cover main flows
- Bundle size unchanged (code splitting benefits)

---

#### Day 4: Update Imports (Controlled Rollout)
**Goal:** Update component imports gradually

Tasks:
- [ ] Identify all components importing `superAdmin.ts`
- [ ] Update imports to use new modular services
- [ ] Test each component individually
- [ ] Run full frontend test suite
- [ ] Test in development environment
- [ ] Visual regression testing

**Migration Strategy:**
```typescript
// BEFORE:
import { getUserStats, getInstitutionList } from '@/services/superAdmin';

// AFTER:
import { getUserStats } from '@/services/superAdmin/superAdminUsers';
import { getInstitutionList } from '@/services/superAdmin/superAdminInstitutions';

// OR (if using index.ts re-exports):
import { getUserStats, getInstitutionList } from '@/services/superAdmin';
// Still works! Backward compatible via index.ts
```

**Deliverable:** All imports updated, no runtime errors

**Success Criteria:**
- All imports migrated
- No TypeScript errors
- All components render correctly
- No console errors in development

---

#### Day 5: Testing, Documentation & Cleanup
**Goal:** Finalize, test, document, and prepare for production

Tasks:
- [ ] Full regression testing (manual + automated)
- [ ] Update service documentation
- [ ] Update component documentation (if needed)
- [ ] Remove old `superAdmin.ts` file (if safe) OR mark as deprecated
- [ ] Create migration guide for team
- [ ] Prepare deployment checklist
- [ ] Git commit with detailed changelog

**Testing Checklist:**
- [ ] All SuperAdmin pages load correctly
- [ ] User management works (CRUD operations)
- [ ] Institution management works
- [ ] Reports generate correctly
- [ ] Dashboard loads all widgets
- [ ] System health checks work
- [ ] No performance regression
- [ ] Bundle size improved or same

**Documentation Checklist:**
- [ ] Update `REFACTORING_SPRINT_PLAN.md` with results
- [ ] Create `SPRINT_1_RESULTS.md` with metrics
- [ ] Update `CLAUDE.md` if service patterns changed
- [ ] Migration guide for other developers

**Deliverable:** Sprint 1 completion report + git commit

**Success Criteria:**
- All tests passing
- Documentation complete
- Ready for production deployment
- Team trained on new structure

---

### Sprint 1 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lines Reduced | 1035 → <150 | File size check |
| New Services Created | 6 files | File count |
| Test Coverage | >80% | npm test coverage |
| Bundle Size | ≤ current | Build analysis |
| TypeScript Errors | 0 | npm run typecheck |
| Runtime Errors | 0 | Manual testing |
| Performance | No regression | Lighthouse |

### Sprint 1 Rollback Plan

**If issues arise:**
1. Git revert to pre-sprint commit
2. Restore old import paths (if changed)
3. Clear browser cache
4. Rebuild and redeploy

**Rollback time:** <10 minutes

---

## 🎯 Sprint 2: Backend Easy Wins (LOW-MEDIUM RISK)

**Duration:** Week 2 (5 working days)
**Priority:** 🟢 LOW RISK - Already mostly modular
**Target Files:**
- `backend/app/Services/Import/ImportOrchestrator.php` (1027 → <300 lines)
- `backend/app/Services/LinkSharingService.php` (1000 → <400 lines)

### Why These Two?

#### ImportOrchestrator Benefits:
- ✅ **70% already modular** - Parser, ErrorAnalyzer, AdminCreator exist
- ✅ **Periodic operation** - Not real-time critical
- ✅ **Easy to test** - Upload test Excel, verify results
- ✅ **Low user impact** - Only admins use import feature

#### LinkSharingService Benefits:
- ✅ **Analytics already split** - LinkAnalyticsService exists
- ✅ **Low usage feature** - Link sharing is not heavily used
- ✅ **Clear boundaries** - Permissions, tracking, sharing separate
- ✅ **Good delegation practice** - Prepares for bigger refactors

### Sprint 2 Daily Plan

#### Day 1: ImportOrchestrator Analysis
Tasks:
- [ ] Map all ImportOrchestrator methods to existing services
- [ ] Identify duplicated code with InstitutionExcelParserService
- [ ] Check parser/validator/creator dependencies
- [ ] Create refactor plan document

**Deliverable:** `IMPORT_ORCHESTRATOR_REFACTOR.md`

---

#### Day 2-3: ImportOrchestrator Refactor
Tasks:
- [ ] Move parsing logic fully to InstitutionExcelParserService
- [ ] Delegate error handling to ImportErrorAnalyzerService
- [ ] Delegate admin creation to InstitutionAdminCreatorService
- [ ] Keep orchestrator as thin coordinator (<300 lines)
- [ ] Write integration tests for import flow
- [ ] Test with real Excel files

**Success Criteria:**
- Import flow works end-to-end
- All error cases handled
- No duplicate code
- Tests passing

---

#### Day 4: LinkSharingService Refactor
Tasks:
- [ ] Create `LinkPermissionService.php` for permission logic
- [ ] Create `LinkAccessTracker.php` for tracking
- [ ] Delegate analytics to existing LinkAnalyticsService
- [ ] Refactor main service to orchestrate
- [ ] Write unit + integration tests
- [ ] Test link creation, sharing, access

**Success Criteria:**
- All link operations work
- Permissions enforced correctly
- Analytics tracked properly
- Tests passing

---

#### Day 5: Backend Testing & Documentation
Tasks:
- [ ] Full backend test suite run
- [ ] Manual API testing (Postman/Insomnia)
- [ ] Performance benchmark (compare before/after)
- [ ] Update API documentation
- [ ] Git commit with detailed changelog
- [ ] Sprint 2 results report

**Deliverable:** Sprint 2 completion + production readiness

---

### Sprint 2 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lines Reduced | ~300 lines | wc -l comparison |
| Services Created | 2 new | File count |
| Test Coverage | >75% | PHPUnit coverage |
| API Response Time | No regression | Load testing |
| Database Queries | Same or fewer | Laravel Debugbar |

---

## 🎯 Sprint 3-4: Survey Services (MEDIUM RISK)

**Duration:** Week 3-4 (10 working days split across 2 sprints)
**Priority:** 🟠 MEDIUM RISK - Complex service, active usage
**Target:** `backend/app/Services/SurveyAnalyticsService.php` (1453 → <250 lines)

### Sprint 3 (Week 3): Foundation Services
**Goal:** Create 3 core analytics services

Days 1-2: `SurveyMetricsCalculator.php`
Days 3-4: `SurveyInsightsAnalyzer.php`
Day 5: `SurveyDataExporter.php`

### Sprint 4 (Week 4): Integration & Delegation
**Goal:** Complete survey refactor and integrate

Days 1-2: `SurveyDashboardService.php` + `SurveyHierarchyAnalyzer.php`
Days 3-4: Refactor original service to delegate
Day 5: Integration testing + documentation

**Detailed plan:** See [SURVEY_ANALYTICS_REFACTOR_PLAN.md](./SURVEY_ANALYTICS_REFACTOR_PLAN.md)

---

## 🎯 Sprint 5: Grade Controller (HIGH RISK)

**Duration:** Week 5 (5 working days)
**Priority:** 🔴 HIGH RISK - Critical business logic
**Target:** `backend/app/Http/Controllers/Grade/GradeUnifiedController.php` (1451 → <400 lines)

### Sprint 5 Approach
**Extra caution:** Grade management is critical for schools

Day 1: Deep analysis + feature flags setup
Day 2-3: Delegate to GradeStatsController + ClassAnalyticsService
Day 4: Staged rollout (10% → 25% → 50% users)
Day 5: Full rollout + monitoring

---

## 🎯 Sprint 6: Final Testing & Deployment (LOW RISK)

**Duration:** Week 6 (5 working days)
**Priority:** 🟢 LOW RISK - Final validation
**Goal:** Production deployment + monitoring

### Sprint 6 Plan
Day 1-2: Full system integration testing
Day 3: Performance optimization + caching
Day 4: Production deployment (gradual rollout)
Day 5: Monitoring + retrospective

---

## 📋 Sprint Transition Checklist

### Before Starting Each Sprint:
- [ ] Review previous sprint results
- [ ] Ensure all tests passing
- [ ] Backup production database
- [ ] Notify team of upcoming changes
- [ ] Prepare rollback plan

### After Completing Each Sprint:
- [ ] Git commit with detailed changelog
- [ ] Update sprint results document
- [ ] Team demo/review session
- [ ] Celebrate small win! 🎉
- [ ] Plan next sprint adjustments

---

## 🚨 Risk Management per Sprint

### Sprint 1 (Frontend): 🟢 LOW
**Rollback:** Revert imports, clear cache (10 min)
**Impact:** Only SuperAdmin users (2-3 people)
**Mitigation:** Test thoroughly in development first

### Sprint 2 (Backend Easy): 🟢 LOW
**Rollback:** Git revert + redeploy (15 min)
**Impact:** Import (periodic), Link sharing (low usage)
**Mitigation:** Keep old code as fallback, feature flags

### Sprint 3-4 (Survey): 🟠 MEDIUM
**Rollback:** Git revert + database restore (30 min)
**Impact:** Survey analytics and reports
**Mitigation:** Delegation pattern (old code still works), gradual rollout

### Sprint 5 (Grade): 🔴 HIGH
**Rollback:** Immediate git revert + database restore (15 min)
**Impact:** Critical grade management operations
**Mitigation:** Feature flags, 10% rollout first, 24/7 monitoring

### Sprint 6 (Testing): 🟢 LOW
**Rollback:** Not needed (validation only)
**Impact:** None - just testing
**Mitigation:** This is the safety net sprint

---

## 📊 Overall Project Metrics

### Progress Tracking

| Sprint | Status | Lines Reduced | Services Created | Tests Added |
|--------|--------|---------------|------------------|-------------|
| Sprint 0 | ✅ DONE | -20 | 0 | 0 |
| Sprint 1 | ⏳ NEXT | -885 | 6 | 15+ |
| Sprint 2 | 📅 PLANNED | -300 | 2 | 10+ |
| Sprint 3 | 📅 PLANNED | -500 | 3 | 20+ |
| Sprint 4 | 📅 PLANNED | -400 | 3 | 15+ |
| Sprint 5 | 📅 PLANNED | -600 | 2 | 12+ |
| Sprint 6 | 📅 PLANNED | 0 | 0 | 5+ |
| **TOTAL** | **17% DONE** | **-2,705** | **16** | **77+** |

### Timeline

```
Week 0:  [████████████████████] Sprint 0: Planning ✅
Week 1:  [                    ] Sprint 1: Frontend
Week 2:  [                    ] Sprint 2: Backend Easy
Week 3:  [                    ] Sprint 3: Survey Part 1
Week 4:  [                    ] Sprint 4: Survey Part 2
Week 5:  [                    ] Sprint 5: Grade Controller
Week 6:  [                    ] Sprint 6: Testing & Deploy
```

---

## 🎯 Sprint 1 - Detailed Execution Plan (NEXT SPRINT)

### Pre-Sprint Checklist (Before Day 1)

#### Team Preparation
- [ ] Tech Lead assigned
- [ ] Frontend Developer assigned (primary)
- [ ] Code Reviewer assigned
- [ ] QA Tester assigned
- [ ] Sprint kickoff meeting scheduled

#### Environment Setup
- [ ] Development environment verified working
- [ ] Git branch strategy confirmed (`refactor/sprint-1-frontend`)
- [ ] Test environment prepared
- [ ] Rollback procedure documented

#### Stakeholder Communication
- [ ] Product Manager notified
- [ ] DevOps team informed
- [ ] SuperAdmin users notified (if needed)
- [ ] Sprint goals shared with team

---

### Sprint 1 Daily Standup Agenda

**Daily at 10:00 AM:**
1. What was completed yesterday?
2. What's planned for today?
3. Any blockers or concerns?
4. Risk assessment update

---

### Sprint 1 Definition of Done

A sprint is considered DONE when:
- ✅ All planned tasks completed
- ✅ Code reviewed and approved
- ✅ All tests passing (unit + integration)
- ✅ No TypeScript/ESLint errors
- ✅ Documentation updated
- ✅ Demo to stakeholders completed
- ✅ Git committed with detailed changelog
- ✅ Ready for production deployment (even if not deployed yet)

---

## 📞 Communication Plan

### Daily Updates
**Channel:** Slack #atis-refactoring
**Format:** Brief status update

### Weekly Sprint Review
**When:** Every Friday 15:00
**Duration:** 30 minutes
**Attendees:** Dev team + Product Manager + DevOps
**Agenda:**
1. Sprint completion review
2. Metrics presentation
3. Demo (if applicable)
4. Risks and blockers discussion
5. Next sprint planning

### Emergency Communication
**Channel:** Slack #atis-alerts (production issues)
**Response Time:** <30 minutes during business hours

---

## 🎓 Lessons Learned & Continuous Improvement

### After Each Sprint:
1. **Retrospective Meeting** (30 min)
   - What went well?
   - What could be improved?
   - Action items for next sprint

2. **Update Documentation**
   - Capture new patterns discovered
   - Update CLAUDE.md with best practices
   - Share learnings with team

3. **Metrics Review**
   - Compare estimated vs actual time
   - Assess risk predictions accuracy
   - Adjust future sprint plans

---

## 📚 Related Documents

- [REFACTORING_ROADMAP_2025.md](./REFACTORING_ROADMAP_2025.md) - Master roadmap
- [REFACTORING_EXECUTIVE_SUMMARY.md](./REFACTORING_EXECUTIVE_SUMMARY.md) - Executive overview
- [REFACTORING_TARGETS.md](./REFACTORING_TARGETS.md) - Priority targets
- [SURVEY_ANALYTICS_REFACTOR_PLAN.md](./SURVEY_ANALYTICS_REFACTOR_PLAN.md) - Survey detailed plan
- [files_over_500_lines.txt](./files_over_500_lines.txt) - Current file inventory

---

**Created:** 2025-11-06
**Last Updated:** 2025-11-06
**Status:** Sprint 0 DONE, Sprint 1 READY TO START
**Next Review:** After Sprint 1 completion
**Owner:** Tech Lead (TBD)
