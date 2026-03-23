# Archive: 2026-02-11 — Pre-Restructure

**Tarix:** 2026-02-11

## Məzmun

| Fayl | İzah |
|------|------|
| `anti-vibe-coding-standards.md` | CLAUDE.md-dən çıxarılmış köhnə "anti-vibe-coding" qaydaları. Çox ağır idi (monthly deep dives, quarterly reviews, KPI dashboards). Əsas qaydalar CLAUDE.md-ə sadələşdirilmiş şəkildə köçürüldü |

## Tarix Konteksti

Fevral 2026-da CLAUDE.md-dən aşırı formal "anti-vibe-coding" bloku çıxarıldı. Problemlər:
- "Weekly Code Review: 100% AI-generated code" — həddindən artıq yük
- "Monthly Deep Dives: rewrite manually" — praktiki deyil
- KPI dashboard skripti — CLAUDE.md-ə aid deyil
- Vibe coding-ə rədd olaraq yanaşırdı, iş aləti kimi deyil

**Hansı qaydalar qaldı** (hələ CLAUDE.md-dədir):
- Search before creating (Critical Rule #5)
- No hardcoded secrets (AI Code Review checklist)
- Quality gates (Pre-commit section)
- No `any` types (Critical Rule #6)

## 2026-03 Yenilik

Mart 2026-da CLAUDE.md-ə "Vibe Coding Rejimi" bölməsi əlavə edildi.
Anti-vibe yanaşması əvəzinə iki rejim sistemi: Rejim A (sürətli) + Rejim B (planlı).
