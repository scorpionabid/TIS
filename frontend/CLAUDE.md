# Frontend Development Rules (React 19 + TypeScript + Vite)

## Commands (always inside Docker)

```bash
docker exec atis_frontend npm run lint
docker exec atis_frontend npm run typecheck
docker exec atis_frontend npm run build
docker exec atis_frontend npm install
```

## Directory Structure

```
src/
├── components/
│   ├── ui/             # Shadcn/ui base components (Button, Card, Table, Dialog, etc.)
│   ├── common/         # Reusable application components
│   ├── layout/         # Header, Sidebar, navigation
│   ├── auth/           # Authentication & session management
│   ├── dashboard/      # Role-specific dashboards
│   ├── surveys/        # Survey management
│   ├── tasks/          # Task management
│   ├── modals/         # Modal dialogs
│   └── {rolename}/    # Role-specific components (regionadmin/, sektoradmin/)
├── pages/              # Page-level route components
├── services/           # API service layer (BaseService pattern)
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

## Coding Patterns

### Components
- Always use TypeScript with explicit prop interfaces
- Use Shadcn/ui components from `src/components/ui/` — don't reinvent
- Reusable components go in `src/components/common/`
- Role-specific components go in `src/components/{rolename}/`

### State Management
- **Server state**: @tanstack/react-query (queries + mutations)
- **Client state**: React Context API
- **Form state**: react-hook-form + Zod validation
- **URL state**: React Router

### API Integration
- All services extend `BaseService` in `src/services/`
- Use React Query hooks for data fetching
- Consistent error handling with toast notifications
- Optimistic updates for mutations where appropriate

### Styling
- Tailwind CSS 3.4.11 — utility classes only (no inline styles)
- Custom design tokens in `src/styles/`
- CSS custom properties for dark/light mode
- Mobile-first responsive design
- CVA (Class Variance Authority) for component variants

### Permissions & Access Control
- `useAuth()` hook for current user context
- `usePermissions()` hook for permission checks
- Conditional rendering based on user roles
- Route guards for page-level access control

## TypeScript Rules

- Strict mode enabled — no `any` types
- Define interfaces for all API responses in `src/types/`
- Use Zod schemas for runtime validation
- Explicit return types on all functions
- No implicit `any` or `unknown` without type narrowing

## Icons & UI

- Lucide React (v0.462.0) for icons
- Recharts for data visualization
- Radix UI primitives via Shadcn/ui
