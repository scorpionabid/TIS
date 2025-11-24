# 🔬 Test Automation Status (2025-12-10)

The goal of this document is to capture the current automation coverage across backend and frontend surfaces, and highlight the next logical steps for higher-fidelity (E2E/UAT) verification.

---

## ✅ What’s Automated

### Backend
| Area | Coverage | Notes |
|------|----------|-------|
| Report CRUD (`ReportCrudService`) | ✅ Unit coverage via `tests/Unit/Services/ReportCrudServiceTest.php` | Exercises filtering, institution access control, and status transitions.|
| RegionAdmin analytics pipelines | ✅ Unit coverage via `tests/Unit/Services/RegionAdmin/RegionAdminReportsServiceTest.php` | Validates hierarchy discovery, KPI math, and survey/user aggregations. |
| Scheduled reports | ✅ Unit coverage via `tests/Unit/Services/ScheduledReportServiceTest.php` | Covers creation, updates, due selection, execution cycle, and validation. |

### Frontend
| Area | Coverage | Notes |
|------|----------|-------|
| Reports page (`frontend/src/pages/Reports.tsx`) | ✅ Component test in `src/pages/__tests__/Reports.test.tsx` | Validates role gating, server filter wiring, and export success path. |
| Shared reports service (`frontend/src/services/reports.ts`) | ✅ Covered indirectly via component mocks | API contract enforced in component tests. |
| Resource filters/service | ✅ `src/services/__tests__/resources.test.ts` and `src/components/resources/__tests__/LinkFilterPanel.test.tsx` | Ensures merged payload + UI filter badges behave. |

### Command Recap
```bash
# Backend
cd backend && php artisan test

# Frontend
cd frontend && npm run test
```

---

## ⏭️ Next Natural Steps (E2E/UAT)

1. **Browser-driven regressions** – capture at least one Playwright/Cypress happy-path:
   - RegionAdmin schedules a report and verifies next-run + toast.
   - Resource creation flow for special-user targeting (mirrors `TESTING_GUIDE_USER_TARGETING.md`).
2. **API smoke pack** – reuse the new factories to seed sample data and hit `/reports/*` endpoints from a lightweight HTTP test (e.g., Pest + Laravel HTTP client) to ensure serialization stays consistent.
3. **Docs alignment** – once E2E specs exist, embed their command references inside the role-specific guides (`ROLE_SYSTEM_GUIDE.md`, `TESTING_GUIDE_USER_TARGETING.md`) so manual QA can decide whether to trust the automated signal or reproduce manually.

This document should be revisited whenever major report/resource features land, ensuring we always know which layers are already covered and where to invest next. 🚦
