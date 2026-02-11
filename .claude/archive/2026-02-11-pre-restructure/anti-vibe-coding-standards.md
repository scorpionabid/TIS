# Anti-Vibe-Coding Standards Archive

> This content was extracted from CLAUDE.md on 2026-02-11 during configuration restructure.
> The essential rules are preserved in the main CLAUDE.md. This file contains the full essays and detailed analysis for reference.

## The "$1.5 Trillion Technical Debt Crisis" Prevention

Research shows vibe coding creates the largest accumulation of technical debt in software history. Prevent this with:

1. **Code Duplication (8x increase with AI)**:
   - BEFORE creating any new component/function, search for similar existing code
   - If found, extend existing rather than duplicate

2. **Code Churn Prevention (2x increase with AI)**:
   - Never rewrite working code without clear performance/security reason
   - Refactor incrementally, never wholesale rewrites
   - Track code stability with git metrics

## Security Vulnerability Prevention

AI tools occasionally produce insecure code failing basic security standards:
- No eval() or exec() usage
- No hardcoded credentials
- Proper input validation for all user-facing functionality

## "Vibe Coding Hangover" Prevention Protocol

### Skill Atrophy Prevention
- Weekly Code Review: Manually review and understand 100% of AI-generated code
- Monthly Deep Dives: Pick one AI-generated component, rewrite it manually to maintain skills
- Quarterly Architecture Review: Ensure system design coherence

### "Illusion of Correctness" Mitigation
1. Unit tests with edge cases
2. Integration testing with real data
3. Performance testing with production-like load
4. Security testing with penetration testing tools
5. Accessibility testing with screen readers

### Development Velocity Maintenance
- Week 1-2: AI coding shows 75% speed improvement
- Month 3-6: Technical debt accumulation causes 50% slowdown
- Prevention: Maintain strict quality gates from day one

## Quality Metrics Dashboard (Monitor Monthly)

```bash
echo "=== CODEBASE HEALTH REPORT ==="
echo "Lines of Code: $(find src -name '*.tsx' -o -name '*.ts' -o -name '*.php' | xargs wc -l | tail -1)"
echo "Test Coverage: $(npm run test:coverage | grep 'Lines' | awk '{print $4}')"
echo "Duplicate Code Blocks: $(npx jscpd src --threshold 1 | grep -c 'duplication')"
echo "Security Issues: $(npm audit --audit-level=moderate 2>&1 | grep -c 'vulnerabilities')"
echo "Bundle Size: $(du -sh dist/ | awk '{print $1}')"
echo "API Response Time: $(curl -w '@-' -o /dev/null -s http://localhost:8000/api/health <<< '%{time_total}')"
```

## Success Metrics & KPIs
- Development Speed: Maintain consistent velocity
- Bug Rate: < 5 bugs per 100 lines of new code
- Security Score: 0 high/critical vulnerabilities
- Performance Score: <500KB bundle, <200ms API response
- Maintainability: New team members productive within 2 days
- Technical Debt Ratio: < 20% of development time spent on debt
