# Code Review Checklist

## React/TypeScript Components

### Structure & Organization

- [ ] **Single Responsibility Principle** - Component does one thing well
- [ ] **Component Size** - Under 250 lines (preferably under 150)
- [ ] **File Organization** - Proper imports order: React, libraries, components, hooks, utils, types, styles
- [ ] **Named Exports** - Use named exports instead of default exports for better IDE support
- [ ] **Index Files** - Barrel exports created for sub-components

### TypeScript & Types

- [ ] **Strict Typing** - No `any` types without justification
- [ ] **Interface vs Type** - Use `interface` for object shapes, `type` for unions/aliases
- [ ] **Props Interface** - Explicitly typed props with JSDoc comments
- [ ] **Return Types** - Functions have explicit return types
- [ ] **Null Safety** - Proper null/undefined checks

### React Best Practices

- [ ] **Hooks Rules** - Hooks called at top level, not inside loops/conditions
- [ ] **Dependency Arrays** - useEffect/useMemo/useCallback have correct deps
- [ ] **Key Prop** - Lists have unique and stable keys
- [ ] **Memoization** - Components wrapped in React.memo when beneficial
- [ ] **Custom Hooks** - Logic extracted to custom hooks when reusable
- [ ] **Event Handlers** - useCallback for event handlers passed to children

### Performance

- [ ] **Avoid Inline Objects/Arrays** - Stable references for props
- [ ] **Lazy Loading** - Code splitting with React.lazy for large components
- [ ] **Bundle Size** - No unnecessary imports (tree-shakeable)
- [ ] **Re-render Optimization** - Components don't re-render unnecessarily

### Accessibility

- [ ] **Semantic HTML** - Proper heading hierarchy, landmarks
- [ ] **ARIA Labels** - Interactive elements have accessible names
- [ ] **Keyboard Navigation** - Tab order logical, focus visible
- [ ] **Color Contrast** - WCAG 2.1 AA compliant (4.5:1)
- [ ] **Screen Readers** - Proper aria-live regions for dynamic content

### Testing

- [ ] **Unit Tests** - Jest/Vitest tests for logic
- [ ] **Component Tests** - React Testing Library for UI
- [ ] **Test Coverage** - New code has >80% coverage
- [ ] **Edge Cases** - Empty states, loading states, errors tested
- [ ] **User Events** - Proper fireEvent/userEvent usage

### Styling (TailwindCSS)

- [ ] **Consistent Spacing** - Uses design system tokens (4px grid)
- [ ] **Responsive Design** - Mobile-first approach
- [ ] **Dark Mode** - Supports dark mode when applicable
- [ ] **Custom Classes** - Arbitrary values justified and documented
- [ ] **Class Order** - Consistent class ordering (layout → sizing → spacing → colors → effects)

---

## Laravel/PHP Backend

### Structure & Architecture

- [ ] **Single Responsibility** - Class/method does one thing
- [ ] **Method Size** - Under 50 lines per method
- [ ] **Namespace** - Proper PSR-4 autoloading
- [ ] **Type Hints** - Parameter and return type declarations
- [ ] **DocBlocks** - PHPDoc for complex methods

### Code Quality

- [ ] **PSR-12 Compliance** - Code style follows PSR-12
- [ ] **Strict Types** - `declare(strict_types=1);` enabled
- [ ] **Null Coalescing** - `??` and `??=` used appropriately
- [ ] **Early Returns** - Guard clauses reduce nesting
- [ ] **No Magic Numbers** - Constants for meaningful values

### Database & Eloquent

- [ ] **Eager Loading** - `with()` for relationships to avoid N+1
- [ ] **Query Optimization** - Efficient queries, proper indexing
- [ ] **Mass Assignment** - `$fillable` or `$guarded` defined
- [ ] **Transactions** - Database transactions for multi-step operations
- [ ] **Soft Deletes** - Used appropriately with `SoftDeletes` trait

### Security

- [ ] **Input Validation** - FormRequest or inline validation
- [ ] **SQL Injection** - Parameterized queries, no raw SQL with user input
- [ ] **XSS Prevention** - Output escaped in Blade/views
- [ ] **Authorization** - Policies/Gates for access control
- [ ] **CSRF** - Tokens included in forms

### Error Handling

- [ ] **Try-Catch** - Exceptions caught and handled
- [ ] **Custom Exceptions** - Specific exception types used
- [ ] **Error Logging** - Errors logged with context
- [ ] **User Feedback** - User-friendly error messages
- [ ] **Graceful Degradation** - Failures handled elegantly

### Testing

- [ ] **Unit Tests** - PHPUnit tests for services
- [ ] **Feature Tests** - HTTP endpoint testing
- [ ] **Factories** - Model factories for test data
- [ ] **Database** - RefreshDatabase trait used
- [ ] **Assertions** - Meaningful assertions (not just 200 OK)

---

## API Design

### RESTful Principles

- [ ] **HTTP Methods** - GET, POST, PUT/PATCH, DELETE correctly used
- [ ] **Status Codes** - Appropriate HTTP status codes
- [ ] **URL Structure** - Resource-based URLs, proper nesting
- [ ] **Pagination** - Paginated responses for lists
- [ ] **Filtering/Sorting** - Query parameters for data manipulation

### Response Format

- [ ] **Consistent Structure** - Standard JSON structure
- [ ] **CamelCase** - camelCase for JSON keys
- [ ] **Timestamps** - ISO 8601 format for dates
- [ ] **Error Format** - Consistent error response structure
- [ ] **Null vs Omit** - Strategy for null values

### Documentation

- [ ] **OpenAPI/Swagger** - API documented
- [ ] **Example Requests** - cURL or HTTP examples
- [ ] **Auth Details** - Authentication requirements specified
- [ ] **Rate Limits** - Documented if applicable
- [ ] **Changelog** - Breaking changes documented

---

## Git & Version Control

### Commits

- [ ] **Atomic Commits** - One logical change per commit
- [ ] **Commit Message** - Follows conventional commits format
- [ ] **Issue References** - Related issues mentioned
- [ ] **No WIP** - No "WIP" or "temp" commits in PR

### Pull Requests

- [ ] **Small Scope** - Under 500 lines changed
- [ ] **Clear Title** - Descriptive PR title
- [ ] **Description** - What, why, and how explained
- [ ] **Screenshots** - UI changes documented with images
- [ ] **Test Steps** - QA steps for manual testing

### Branch Management

- [ ] **Branch Name** - `feature/`, `bugfix/`, `hotfix/` prefix
- [ ] **Base Branch** - Correct target branch
- [ ] **Up to Date** - Branch rebased on latest main
- [ ] **No Merge Conflicts** - Conflicts resolved

---

## Review Process

### For Reviewers

1. **Understand Context** - Read PR description and related tickets
2. **Check Functionality** - Does it work as intended?
3. **Code Quality** - Follow checklist above
4. **Test Coverage** - Are there adequate tests?
5. **Performance** - Any obvious performance issues?
6. **Security** - Any security concerns?
7. **Documentation** - Is code self-documenting?

### Review Comments

- [ ] **Constructive** - Suggest improvements, not just criticize
- [ ] **Specific** - Point to exact lines
- [ ] **Actionable** - Clear next steps
- [ ] **Severity** - Distinguish between blocking and suggestions
- [ ] **Acknowledge** - Recognize good patterns

### Approval Criteria

- [ ] All CI checks passing
- [ ] No unresolved blocking comments
- [ ] At least one approval from domain expert
- [ ] QA sign-off if required
- [ ] Documentation updated

---

## Common Anti-Patterns

### React

❌ **Don't:**
```tsx
// Inline objects in render
<Component style={{ color: 'red' }} />

// useEffect without deps
useEffect(() => { fetchData(); });

// Prop drilling more than 2 levels
<A prop={value} /> → <B prop={prop} /> → <C prop={prop} />
```

✅ **Do:**
```tsx
// Memoized styles
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />

// Proper useEffect deps
useEffect(() => { fetchData(); }, [id]);

// Context or state management for deep props
```

### Laravel

❌ **Don't:**
```php
// N+1 query
$users = User::all();
foreach ($users as $user) {
    echo $user->profile->bio; // Queries in loop
}

// Raw SQL with user input
DB::select("SELECT * FROM users WHERE id = {$request->id}");
```

✅ **Do:**
```php
// Eager loading
$users = User::with('profile')->get();

// Parameterized query
DB::select('SELECT * FROM users WHERE id = ?', [$request->id]);
```

---

## Tools & Automation

### Recommended Linters

- **ESLint** - React/TypeScript linting
- **Prettier** - Code formatting
- **PHP_CodeSniffer** - PHP code standards
- **PHPStan** - PHP static analysis
- **Rector** - PHP automated refactoring

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:ci"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.php": ["php-cs-fixer fix", "phpstan analyse"]
  }
}
```

---

## Sign-off

**Reviewer:** _______________  **Date:** _______________

**Approved:** ☐ Yes  ☐ Changes Requested  ☐ Needs Discussion

**Notes:**
