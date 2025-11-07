# SurveyAnalyticsService Refactoring Plan

**Current Status:** 1453 lines, 90 methods
**Target:** Split into 5-6 focused services (<300 lines each)
**Priority:** 🔴 HIGHEST

---

## Method Categorization

### Category 1: Basic Statistics & Metrics (15 methods)
**Target Service:** `SurveyMetricsCalculator.php`

Methods:
- `getBasicStats()` - Line 148
- `getResponseStats()` - Line 164
- `getDemographicStats()` - Line 181
- `getTemporalStats()` - Line 197
- `getCompletionStats()` - Line 219
- `getQuestionStats()` - Line 236
- `getPerformanceMetrics()` - Line 260
- `calculateResponseRate()` - Line 431
- `calculateCompletionRate()` - Line 444
- `calculateAverageCompletionTime()` - Line 457
- `getQuestionResponseCount()` - Line 1016
- `getQuestionSkipRate()` - Line 1027
- `getAnswerDistribution()` - Line 1039
- `estimateTotalTargeted()` - Line 919
- `getSurveyStatistics()` - Line 25 (coordinator)

**Estimated Lines:** ~250

---

### Category 2: Analytics & Insights (12 methods)
**Target Service:** `SurveyInsightsAnalyzer.php`

Methods:
- `getSurveyAnalytics()` - Line 43 (coordinator)
- `getAnalyticsOverview()` - Line 274
- `getResponseAnalysis()` - Line 287
- `getQuestionAnalysis()` - Line 300
- `getUserEngagement()` - Line 321
- `getTrendAnalysis()` - Line 334
- `generateInsights()` - Line 347
- `generateRecommendations()` - Line 390
- `getResponseTrendsLegacy()` - Line 957
- `getCompletionTrends()` - Line 979
- `getDropoutPoints()` - Line 993

**Estimated Lines:** ~280

---

### Category 3: Dashboard & Overview (8 methods)
**Target Service:** `SurveyDashboardService.php`

Methods:
- `getDashboardStatistics()` - Line 63 (main)
- `getDashboardOverview()` - needs extraction
- `getRecentSurveys()` - needs extraction
- `getTopPerformingSurveys()` - needs extraction
- `getActivityTrends()` - needs extraction
- `getResponseRates()` - needs extraction
- `getUserParticipation()` - needs extraction

**Estimated Lines:** ~200

---

### Category 4: Hierarchical & Institution Analytics (10 methods)
**Target Service:** `SurveyHierarchyAnalyzer.php`

Methods:
- `getInstitutionBreakdown()` - Line 564
- `getHierarchicalBreakdown()` - Line 639
- `buildRegionHierarchy()` - Line 675
- `buildSectorHierarchy()` - Line 779
- `getRegionAnalytics()` - Line 840

**Note:** This overlaps with existing `HierarchicalAnalyticsService` - DELEGATE instead of duplicate

**Estimated Lines:** ~150 (mostly delegation)

---

### Category 5: Recipient Targeting & Estimation (10 methods)
**Target Service:** `SurveyTargetingAnalytics.php`

Methods:
- `estimateRecipients()` - Line 80 (main)
- `applyTargetingRules()` - Line 477
- `getRecipientBreakdown()` - Line 497
- `estimateResponseCount()` - Line 518
- `estimateSurveyDuration()` - Line 942
- `getTargetingRecommendations()` - needs extraction

**Note:** Overlaps with existing `SurveyTargetingService` - INTEGRATE

**Estimated Lines:** ~180

---

### Category 6: Export & Data Processing (5 methods)
**Target Service:** `SurveyDataExporter.php`

Methods:
- `exportSurveyData()` - Line 103 (main)
- Export format handlers (JSON, CSV, Excel, PDF)

**Estimated Lines:** ~150

---

### Category 7: Utility & Helper Methods (30+ methods)
**Keep in:** Original `SurveyAnalyticsService.php` as coordinator

Methods:
- `__construct()`
- `logActivity()` - Line 548
- Various private helpers

**Estimated Lines:** ~200 (coordinator + utilities)

---

## Refactoring Strategy

### Phase 1: Create New Service Files (Non-breaking)

```bash
# Create new services (do NOT modify original yet)
touch backend/app/Services/Analytics/SurveyMetricsCalculator.php
touch backend/app/Services/Analytics/SurveyInsightsAnalyzer.php
touch backend/app/Services/Analytics/SurveyDashboardService.php
touch backend/app/Services/Analytics/SurveyHierarchyAnalyzer.php
touch backend/app/Services/Analytics/SurveyTargetingAnalytics.php
touch backend/app/Services/Analytics/SurveyDataExporter.php
```

### Phase 2: Implement New Services (Parallel Work)

1. **SurveyMetricsCalculator.php**
   - Copy metrics methods
   - Add unit tests
   - Ensure no external dependencies

2. **SurveyInsightsAnalyzer.php**
   - Copy analytics methods
   - Inject MetricsCalculator
   - Add integration tests

3. **SurveyDashboardService.php**
   - Extract dashboard methods from original
   - Inject required dependencies
   - Test with real dashboard calls

4. **SurveyHierarchyAnalyzer.php**
   - DELEGATE to existing HierarchicalAnalyticsService
   - Thin wrapper for survey-specific logic
   - Test hierarchy building

5. **SurveyTargetingAnalytics.php**
   - INTEGRATE with existing SurveyTargetingService
   - Move estimation logic here
   - Test recipient calculations

6. **SurveyDataExporter.php**
   - Extract export methods
   - Add format-specific classes
   - Test all export formats

### Phase 3: Refactor Original Service (Breaking Changes Controlled)

**Modify `SurveyAnalyticsService.php` to:**
1. Inject all new services via constructor
2. Delegate method calls to appropriate services
3. Keep as thin coordinator (~200 lines)

Example:
```php
class SurveyAnalyticsService
{
    protected SurveyMetricsCalculator $metricsCalculator;
    protected SurveyInsightsAnalyzer $insightsAnalyzer;
    protected SurveyDashboardService $dashboardService;
    // ... other services

    public function __construct(
        SurveyMetricsCalculator $metricsCalculator,
        SurveyInsightsAnalyzer $insightsAnalyzer,
        // ... inject all
    ) {
        $this->metricsCalculator = $metricsCalculator;
        // ...
    }

    public function getSurveyStatistics(Survey $survey): array
    {
        return $this->metricsCalculator->getSurveyStatistics($survey);
    }

    public function getSurveyAnalytics(Survey $survey): array
    {
        return $this->insightsAnalyzer->getSurveyAnalytics($survey);
    }

    // ... delegate all methods
}
```

### Phase 4: Update Controller Dependencies

**Controllers using SurveyAnalyticsService:**
```bash
grep -r "SurveyAnalyticsService" backend/app/Http/Controllers/
```

**Action:** No changes needed! Controller still injects `SurveyAnalyticsService`, but now it's modular internally.

### Phase 5: Test & Deploy

1. Run full test suite
2. Test each analytics endpoint manually
3. Performance testing (ensure no regression)
4. Staged rollout (20% → 50% → 100%)

---

## Implementation Order

### Week 1: Non-Breaking Additions
✅ Day 1-2: Create `SurveyMetricsCalculator.php` + tests
✅ Day 3-4: Create `SurveyInsightsAnalyzer.php` + tests
✅ Day 5: Create `SurveyDataExporter.php` + tests

### Week 2: Integration & Delegation
✅ Day 1-2: Create `SurveyDashboardService.php` + integration
✅ Day 3: Create `SurveyHierarchyAnalyzer.php` (delegation wrapper)
✅ Day 4: Create `SurveyTargetingAnalytics.php` + integration
✅ Day 5: Refactor original service to delegate

### Week 3: Testing & Deployment
✅ Day 1-2: Integration tests for all services
✅ Day 3: Performance testing
✅ Day 4: Staging deployment
✅ Day 5: Production rollout + monitoring

---

## Success Criteria

✅ Original service reduced to <250 lines
✅ Each new service <300 lines
✅ 100% backward compatibility (no controller changes)
✅ All tests pass (unit + integration)
✅ No performance regression
✅ Zero production incidents

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Keep original service as facade, delegate internally |
| Performance degradation | Benchmark before/after, optimize dependency injection |
| Test coverage gaps | Write tests for new services before refactor |
| Deployment issues | Feature flag + staged rollout |

---

**Created:** 2025-11-06
**Status:** READY TO IMPLEMENT
**Estimated Duration:** 3 weeks
**Priority:** 🔴 HIGHEST
