# Product Requirements Document (PRD)
## AWS Route53 Clone

| | |
|---|---|
| **Document Owner** | Engineering |
| **Status** | Draft v1.0 |
| **Last Updated** | July 10, 2026 |
| **Target Stack** | Next.js (TypeScript) · FastAPI · SQLite |

---

## 1. Overview

### 1.1 Purpose
Build a functional, self-hosted clone of the AWS Route53 console that recreates the **user experience and core workflows** of Route53 — hosted zone management, DNS record management, navigation, search/filter/pagination, modals, and notifications — backed by a real API and persistent database. The clone does **not** need to perform actual DNS resolution; it simulates the management plane only.

### 1.2 Goals
- Deliver a UI that is visually and behaviorally indistinguishable from Route53 for the in-scope workflows.
- Provide full CRUD for Hosted Zones and DNS Records with real persistence (SQLite).
- Provide a mocked authentication system with session persistence.
- Ship a clean, well-documented, maintainable codebase suitable for evaluation and extension.

### 1.3 Non-Goals
- No actual DNS resolution, propagation, or nameserver hosting.
- No real AWS integration (IAM, Organizations, Billing, Route53 API) — these are mocked/stubbed.
- No multi-region, multi-account, or production-grade auth (OAuth/SSO) — mocked auth is sufficient.
- Health Checks, Traffic Policies, Resolver, and Profiles are **placeholder** ("Coming Soon") pages only.

### 1.4 Success Metrics
- All CRUD flows for Hosted Zones and Records work end-to-end against SQLite, surviving server restarts.
- UI closely mirrors Route53's IA (left nav, breadcrumbs, table/detail patterns, flash notifications).
- Documented, reproducible local setup (`README`) and a working hosted demo link.

---

## 2. Personas & Use Cases

| Persona | Description | Primary Use Cases |
|---|---|---|
| **Cloud/DevOps Engineer** | Manages DNS for company domains | Create hosted zone, add/update A/CNAME/MX records, search records, delete stale zones |
| **Developer (demo/reviewer)** | Evaluates the clone against real Route53 | Explore navigation, test CRUD, verify persistence, compare UX fidelity |

### Representative User Stories
- As a user, I want to log in with a mock account so my session persists across page reloads.
- As a user, I want to view a paginated, searchable list of all my hosted zones.
- As a user, I want to create a new hosted zone by specifying a domain name and type (public/private).
- As a user, I want to drill into a hosted zone and manage its DNS records (view, search, filter by type, paginate).
- As a user, I want to create/edit records with type-specific field validation (e.g., MX needs priority, SRV needs priority/weight/port/target).
- As a user, I want confirmation modals before destructive actions (delete zone/record).
- As a user, I want toast notifications confirming success/failure of actions.
- As a user, I want to see "Coming Soon" placeholders for Dashboard, Traffic Policies, Health Checks, Resolver, and Profiles so the nav feels complete.

---

## 3. Information Architecture & Navigation

Mirrors the Route53 console left-hand navigation:

```
Route53 Clone
├── Dashboard                (Coming Soon)
├── Hosted zones             (full CRUD)
│   └── [zone detail]
│       └── Records          (full CRUD)
├── DNS management
│   ├── Traffic policies     (Coming Soon)
│   └── Domains               (out of scope / omitted or coming soon)
├── Resolver                 (Coming Soon)
├── Health checks            (Coming Soon)
├── Profiles                 (Coming Soon)
└── Account
    ├── Login / Logout
    └── Session info
```

Top bar includes: global search (hosted zones), region-style label (cosmetic, e.g., "Global"), user menu (mocked account name, Logout), and notification bell (optional, tied to toast history).

---

## 4. Functional Requirements

### 4.1 Authentication (Mocked)
- **Login page**: username/password form (or "Sign in" with a preset demo user). No real identity provider.
- Backend issues a **session token** (JWT or opaque token stored server-side) on successful login.
- **Session persistence**: token stored in an HTTP-only cookie (preferred) or localStorage; session restored on page refresh via a `/auth/me` check.
- **Logout**: clears session token client- and server-side, redirects to login.
- **Route protection**: all app routes except `/login` require a valid session; unauthenticated requests redirect to login.
- Single demo user is acceptable (e.g., `admin@example.com` / `password123`), seeded at startup.

### 4.2 Hosted Zones — Full CRUD

**List View**
- Table columns: Domain name, Type (Public/Private), Record count, Description, Created date.
- **Search**: by domain name (client- or server-side, debounced).
- **Pagination**: page size selector (10/25/50), page controls, total count.
- **Sort**: by domain name, created date (stretch).
- Empty state ("No hosted zones yet") and loading skeletons.

**Create**
- Modal or full-page form: Domain name (required, validated as FQDN), Type (Public/Private radio), Comment/Description (optional).
- On create, auto-generate default **NS** and **SOA** records (matches real Route53 behavior) — reinforces authenticity.
- Success toast + redirect/refresh of list.

**Edit**
- Editable fields: Comment/Description (domain name and type are immutable post-creation, matching Route53 semantics — call this out in UI as disabled fields with tooltip).

**Delete**
- Confirmation modal warning that all records will be removed (block or warn if non-default records exist, matching real Route53's "zone must be empty" nuance — optional strict rule or soft warning).
- Cascade deletes all associated DNS records in SQLite.

**Detail View**
- Header: domain name, hosted zone ID, type, record count.
- Tabs or sections: Records (primary), (optional) DNSSEC placeholder tab as "Coming Soon".

### 4.3 DNS Records — Full CRUD (within a Hosted Zone)

**Supported Record Types**: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA.

**List View**
- Table columns: Record name, Type, TTL, Value/Route traffic to, (Alias indicator if applicable).
- **Search**: by record name.
- **Filter**: by record type (multi-select or dropdown).
- **Pagination**: consistent with zones list.
- Default NS/SOA records shown but visually marked as system-managed (deletion restricted, matches Route53).

**Create / Edit (type-aware form)**
Dynamic form fields per record type, matching Route53's real-world constraints:

| Type | Fields |
|---|---|
| A | Name, TTL, Value(s) (IPv4, supports multiple) |
| AAAA | Name, TTL, Value(s) (IPv6) |
| CNAME | Name, TTL, Value (single FQDN target) |
| TXT | Name, TTL, Value(s) (quoted strings) |
| MX | Name, TTL, Value(s) (`priority hostname` pairs) |
| NS | Name, TTL, Value(s) (nameserver hostnames) |
| PTR | Name, TTL, Value (hostname) |
| SRV | Name, TTL, Priority, Weight, Port, Target |
| CAA | Name, TTL, Flag, Tag (issue/issuewild/iodef), Value |

- Client-side validation per type (e.g., IP format for A/AAAA, numeric ranges for priority/weight/port/flag).
- Routing policy field can be simplified to "Simple" only (Weighted/Latency/Failover/Geolocation/Multivalue shown as disabled options with "Coming Soon" tag for authenticity, stretch to implement Simple + Weighted).
- TTL default 300, editable numeric field.

**Delete**
- Confirmation modal; system records (NS/SOA at zone apex) protected from deletion with explanatory tooltip, mirroring real Route53.

### 4.4 Search, Filter, Pagination, Modals, Notifications (cross-cutting)
- **Search**: consistent debounced search input pattern used on both Hosted Zones and Records tables.
- **Filters**: record type filter chips/dropdown on Records table.
- **Pagination**: shared `<Pagination>` component; server-side pagination via API `limit`/`offset` or `page`/`page_size` params.
- **Modals**: shared modal system (create/edit forms, delete confirmations) matching Route53's slide-over or modal patterns.
- **Notifications**: toast/flash system for success ("Hosted zone created"), error, and info messages, auto-dismiss with manual close option.

### 4.5 Mocked/Placeholder Sections
- Dashboard, Traffic Policies, Health Checks, Resolver, Profiles: static "Coming Soon" page with consistent illustration/header, reachable from nav to preserve full IA.

### 4.6 Bonus Features (Optional, Prioritized)
1. **Export Hosted Zone** as JSON or BIND zone file (high value, low effort).
2. **Import DNS records** from a BIND zone file (parse and bulk-create records).
3. **Dark Mode** (theme toggle, persisted preference).
4. **Bulk operations** (multi-select delete on Records table).
5. **Keyboard shortcuts** (e.g., `/` to focus search, `c` to create).

---

## 5. Non-Functional Requirements
- **Performance**: list views paginated server-side to remain responsive with 1000+ records.
- **Validation**: consistent client + server-side validation (FastAPI Pydantic models) to prevent malformed DNS data.
- **Error handling**: all API errors return structured JSON (`{ "detail": "..." }`) and surface as toasts in UI.
- **Accessibility**: forms and modals keyboard-navigable, proper ARIA labels, focus trapping in modals.
- **Responsiveness**: usable on standard laptop widths (1280px+); mobile not a priority (matches AWS console norms).
- **Code quality**: typed throughout (TypeScript strict mode, Pydantic models), linted (ESLint/Prettier, ruff/black).
- **Security (mocked scope)**: passwords hashed (even in mock auth) using bcrypt/argon2; session tokens signed (JWT) or securely random (opaque + server store); protect against basic CSRF/XSS in forms.

---

## 6. System Architecture

### 6.1 High-Level Diagram
```
┌─────────────────────┐        REST/JSON over HTTPS        ┌─────────────────────┐
│   Next.js Frontend   │ ───────────────────────────────▶  │   FastAPI Backend    │
│  (TypeScript, App    │ ◀───────────────────────────────  │  (Pydantic, Uvicorn) │
│   Router, React)     │        Auth cookie/JWT             │                      │
└─────────────────────┘                                    └──────────┬───────────┘
                                                                        │ SQLAlchemy ORM
                                                                        ▼
                                                              ┌─────────────────────┐
                                                              │   SQLite Database    │
                                                              │ (hosted_zones,        │
                                                              │  dns_records, users,   │
                                                              │  sessions)             │
                                                              └─────────────────────┘
```

### 6.2 Frontend Architecture (Next.js/TypeScript)
- **Routing**: App Router with route groups: `(auth)/login`, `(dashboard)/hosted-zones`, `(dashboard)/hosted-zones/[id]`, `(dashboard)/hosted-zones/[id]/records`, `(dashboard)/dashboard`, `(dashboard)/traffic-policies`, etc.
- **State/data fetching**: React Query (TanStack Query) or SWR for server-state caching, mutation, and optimistic updates; avoids manual loading/error boilerplate.
- **UI components**: component library (e.g., shadcn/ui or a hand-rolled design system) styled with Tailwind CSS to replicate AWS Cloudscape-like density (compact tables, blue primary actions, side navigation).
- **Shared components**: `DataTable` (search/sort/paginate), `Modal`, `ConfirmDialog`, `Toast/NotificationProvider`, `RecordForm` (type-aware), `ZoneForm`, `Breadcrumbs`, `SideNav`.
- **Auth**: `AuthProvider` context wrapping the app; `middleware.ts` for route protection based on session cookie.

### 6.3 Backend Architecture (FastAPI)
- **Structure**:
```
backend/
├── app/
│   ├── main.py                # FastAPI app init, CORS, routers
│   ├── core/
│   │   ├── config.py          # settings (env vars)
│   │   ├── security.py        # password hashing, JWT
│   │   └── database.py        # SQLAlchemy engine/session
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── hosted_zone.py
│   │   └── dns_record.py
│   ├── schemas/                # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── hosted_zone.py
│   │   └── dns_record.py
│   ├── api/
│   │   ├── deps.py             # auth dependency, pagination deps
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── hosted_zones.py
│   │       └── dns_records.py
│   ├── services/               # business logic (zone creation w/ default NS/SOA, etc.)
│   └── seed.py                 # seeds demo user + sample data
├── tests/
├── requirements.txt
└── alembic/                    # migrations (optional, recommended)
```
- **Layering**: routes → services (business logic, e.g. auto-generating NS/SOA on zone create) → ORM models. Pydantic schemas isolate API contracts from DB models.
- **Auth dependency**: `get_current_user` FastAPI dependency validates session/JWT on protected routes.
- **Pagination dependency**: shared `PaginationParams` (page, page_size) and `SearchParams` (q) reused across list endpoints.

### 6.4 Database Design (SQLite)

#### Entity-Relationship Overview
```
users (1) ────< sessions (N)
hosted_zones (1) ────< dns_records (N)
```

#### Schema

**`users`**
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| email | TEXT UNIQUE NOT NULL | |
| password_hash | TEXT NOT NULL | bcrypt hash |
| name | TEXT | display name |
| created_at | DATETIME | default now |

**`sessions`** *(if using server-tracked sessions instead of/alongside stateless JWT)*
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID/opaque token |
| user_id | INTEGER FK → users.id | |
| expires_at | DATETIME | |
| created_at | DATETIME | |

**`hosted_zones`**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID, mimics Route53 zone ID format `/hostedzone/XXXXXXXX` |
| domain_name | TEXT NOT NULL | FQDN, validated |
| type | TEXT NOT NULL | `PUBLIC` \| `PRIVATE` |
| comment | TEXT | optional description |
| record_count | INTEGER | denormalized count, updated on record CRUD |
| owner_id | INTEGER FK → users.id | |
| created_at | DATETIME | default now |
| updated_at | DATETIME | on update |

**`dns_records`**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| hosted_zone_id | TEXT FK → hosted_zones.id (ON DELETE CASCADE) | |
| name | TEXT NOT NULL | record name (relative or FQDN) |
| type | TEXT NOT NULL | ENUM: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA |
| ttl | INTEGER NOT NULL DEFAULT 300 | |
| values | TEXT NOT NULL | JSON-encoded array of value strings/objects (supports multi-value + typed fields e.g. SRV/MX/CAA) |
| routing_policy | TEXT DEFAULT 'SIMPLE' | SIMPLE (+ WEIGHTED if implemented) |
| is_system | BOOLEAN DEFAULT FALSE | true for auto-created NS/SOA (deletion-protected) |
| created_at | DATETIME | default now |
| updated_at | DATETIME | on update |

> Indexes: `hosted_zones(domain_name)`, `dns_records(hosted_zone_id, name, type)` for fast search/filter.

### 6.5 API Overview

Base URL: `/api/v1`

**Auth**
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Authenticate, set session cookie/return token |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Return current authenticated user (session check) |

**Hosted Zones**
| Method | Path | Description |
|---|---|---|
| GET | `/hosted-zones?q=&page=&page_size=` | List zones, search + paginate |
| POST | `/hosted-zones` | Create zone (auto-creates NS/SOA records) |
| GET | `/hosted-zones/{id}` | Get zone detail |
| PUT | `/hosted-zones/{id}` | Update zone (comment only) |
| DELETE | `/hosted-zones/{id}` | Delete zone + cascade records |

**DNS Records**
| Method | Path | Description |
|---|---|---|
| GET | `/hosted-zones/{zoneId}/records?q=&type=&page=&page_size=` | List/search/filter records |
| POST | `/hosted-zones/{zoneId}/records` | Create record |
| GET | `/hosted-zones/{zoneId}/records/{recordId}` | Get record detail |
| PUT | `/hosted-zones/{zoneId}/records/{recordId}` | Update record |
| DELETE | `/hosted-zones/{zoneId}/records/{recordId}` | Delete record (blocked if `is_system`) |

**Bonus**
| Method | Path | Description |
|---|---|---|
| GET | `/hosted-zones/{zoneId}/export?format=json\|bind` | Export zone |
| POST | `/hosted-zones/{zoneId}/import` | Import BIND zone file (multipart upload) |

All list endpoints return a consistent envelope:
```json
{
  "items": [ ... ],
  "total": 123,
  "page": 1,
  "page_size": 25
}
```

---

## 7. UX/UI Requirements

- Recreate Route53's visual language: left navigation with collapsible sections, top breadcrumb trail, blue primary buttons, compact data-dense tables with checkbox row selection, right-aligned action buttons ("Create hosted zone", "Create record").
- Table row actions via overflow menu or inline buttons (Edit/Delete), consistent with AWS console patterns.
- Modals for create/edit use a right-side slide-over panel (Route53's real pattern) or centered modal — slide-over preferred for fidelity.
- Flash/toast notifications appear top-right, auto-dismiss after ~5s, color-coded by severity (success/green, error/red, info/blue).
- Empty states, loading skeletons, and error boundaries on every data view.
- Route53-style badges: zone Type (Public/Private), record Type pills.

---

## 8. Milestones / Suggested Build Order

1. **Foundation**: repo scaffolding (frontend/backend), SQLite + SQLAlchemy models, seed script, mocked auth (login/logout/session).
2. **Hosted Zones CRUD**: API + UI list/create/edit/delete, search, pagination.
3. **DNS Records CRUD**: API + UI with type-aware forms, search, filter by type, pagination.
4. **Route53 UX polish**: nav, breadcrumbs, modals/slide-overs, toasts, empty/loading states.
5. **Placeholder sections**: Dashboard, Traffic Policies, Health Checks, Resolver, Profiles.
6. **Bonus features**: export (JSON/BIND), import (BIND), dark mode, bulk ops, shortcuts.
7. **Documentation & deployment**: README (setup, architecture, schema, API), hosted demo deployment.

---

## 9. Deliverables Checklist
- [ ] `frontend/` — Next.js TypeScript app
- [ ] `backend/` — FastAPI app with SQLite persistence
- [ ] `README.md` — setup instructions, architecture overview, DB schema, API overview
- [ ] Hosted demo link (e.g., Vercel for frontend + Render/Fly.io/Railway for backend)
- [ ] Seed data for demo purposes (sample zones + records)

---

## 10. Evaluation Alignment

| Criterion | How This PRD Addresses It |
|---|---|
| UI similarity to Route53 | Section 3, 7 — detailed IA and UX patterns matching real console |
| Frontend engineering quality | Section 6.2 — typed, componentized, cached data-fetching architecture |
| Backend/API design | Section 6.3, 6.5 — layered FastAPI structure, consistent REST contracts |
| Database design | Section 6.4 — normalized schema with indexes and cascade rules |
| Code quality/maintainability | Section 5 — linting, typing, structured error handling |
| Documentation | Section 8/9 — README requirements explicitly scoped |
| Overall completeness | Sections 4.1–4.6 cover full mandatory scope plus prioritized bonus features |
