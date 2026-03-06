# PostgreSQL Migration Plan (Production)

**Owner:** DevOps + Backend Core Team  
**Last Updated:** 2025-12-03  
**Reference:** `documentation/POSTGRES_DEV_PLAN.md` for developer readiness tasks.

---

## 1. Objectives
1. Replace existing SQLite deployment with PostgreSQL in production with <30 min downtime.
2. Maintain full data integrity and provide rollback path to the latest SQLite snapshot.
3. Ensure all services + monitoring remain operational post-migration.

---

## 2. Dependencies
- ✅ Dev readiness checklist completed (Deliverables A–E in `POSTGRES_DEV_PLAN.md`).
- ✅ Data migration command tested on production snapshot.
- ✅ CI pipeline running migrations/tests on PostgreSQL.
- ✅ Support & rollback documentation updated.

> Migration **must not** proceed until all dependencies green.

---

## 3. High-Level Timeline
| Phase | Description | Target |
|-------|-------------|--------|
| P0 | Verify dev readiness & sign-off | 2025-12-16 |
| P1 | Dry-run on staging with prod snapshot | 2025-12-18 |
| P2 | Production migration window (night/weekend) | TBD |
| P3 | Post-migration monitoring + rollback SLA | 48h |

---

## 4. Detailed Steps
### Phase P0 – Pre-Migration
1. Ensure orchestration scripts (`start.sh`, `frontend/start.sh`) respect the Postgres `.env` configuration (no SQLite overrides).
2. Build production images with `pdo_pgsql` + `libpq` installed.
3. Update `docker-compose.production.yml` & infra Terraform/Ansible to include managed Postgres.
4. Refresh `.env.production` secrets (`DB_CONNECTION=pgsql`, host, port, credentials).
5. Capture latest SQLite snapshot via `backend/backup-database.sh nightly` and store under `/root/atis_backup_<timestamp>.sqlite` + `database-backups/` repo copy.
6. Document any new Postgres code fixes directly in §14 of `documentation/POSTGRES_DEV_PLAN.md` (single source of truth).

### Phase P1 – Dry Run (Staging)
1. Provision staging Postgres (mirror production sizing).
2. Restore prod SQLite snapshot to staging Postgres via migration command.
3. Run `php artisan migrate --force` and full test suite.
4. Manual UAT across key roles (see checklist in dev plan).
5. Collect metrics (query latency, CPU, memory) for baseline.
6. Sign-off meeting; log results in this doc.

### Phase P2 – Production Cutover
1. **Freeze window**: announce read-only period, disable cron jobs writing to DB.
2. Take final SQLite snapshot + offsite copy.
3. Stop application containers (`./stop.sh`).
4. Execute migration command:
   ```bash
   php artisan migrate:sqlite-to-postgres \
     --source=sqlite --target=pgsql \
     --batch-size=500 --verify --log=storage/logs/postgres-migration.log
   ```
5. Run `php artisan migrate --force` and cache clears.
6. Update `.env` to `DB_CONNECTION=pgsql` and redeploy the stack (`./start.sh`) so services connect to Postgres.
7. Run smoke tests (health endpoint, login, dashboard) and release application to users.

### Phase P3 – Post-Migration
1. Monitor logs/metrics for 48h; set alert thresholds for query latency.
2. Schedule incremental `pg_dump` backups + nightly `backup-database.sh --connection=pgsql` job.
3. Keep SQLite snapshot accessible for at least 14 days.
4. Close migration ticket after no critical issues for 48h.

---

## 5. Rollback Plan
1. Stop containers and switch `.env` back to SQLite values (`DB_CONNECTION=sqlite`, `DB_DATABASE=/var/www/html/database/database.sqlite`).
2. Copy latest snapshot into `backend/database/database.sqlite`.
3. Run `php artisan migrate --force` (SQLite) and restart services with the legacy SQLite configuration.
4. Notify stakeholders and open incident report documenting reason for rollback.

---

## 6. Monitoring Checklist
- [ ] API health endpoint OK
- [ ] Background jobs queue healthy
- [ ] Postgres metrics (connections, locks, replication)
- [ ] Disk usage on Postgres volume
- [ ] Application error logs
- [ ] `pg_stat_activity` shows expected load

---

## 7. Communication Plan
- **T-3 days**: Send migration notice + downtime window to stakeholders.
- **T-1 day**: Reminder + instructions for halting writes.
- **T+0**: Live updates in #deployments Slack channel every 15 minutes.
- **T+4h**: Initial health report.
- **T+48h**: Final report + lessons learned.

---

## 8. Sign-Off Checklist
| Role | Responsibility | Status |
|------|----------------|--------|
| Tech Lead | Code ready & tests green | ☐ |
| DevOps Lead | Infrastructure prepared | ☐ |
| QA Lead | Regression approved | ☐ |
| Product Owner | Business sign-off | ☐ |

---

## 9. References
- `documentation/POSTGRES_DEV_PLAN.md`
- `database-backups/README.md`
- `PRODUCTION_DEPLOYMENT_SUCCESS.md`
- `DEV_COMMANDS.md` (for docker helpers)

> Keep this document updated as decisions are made. If any step changes, include rationale + date.
