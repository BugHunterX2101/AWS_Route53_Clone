# Technical Design Document
## AWS Route53 Clone

| | |
|---|---|
| **Document Type** | Technical Design / Engineering Spec |
| **Companion Doc** | Route53-Clone-PRD.md |
| **Stack** | Next.js (TypeScript) · FastAPI (Python) · SQLite · SQLAlchemy |
| **Status** | Draft v1.0 |
| **Last Updated** | July 10, 2026 |

---

## 1. Purpose & Scope

This document translates the PRD into an implementable technical design: system architecture, component boundaries, data model, API contracts, request/response flows, folder structures, and operational concerns (auth, error handling, deployment). It is the primary reference for engineers building the frontend, backend, and database layers.

---

## 2. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        Browser["Next.js App<br/>(React 18, TypeScript)"]
    end

    subgraph Frontend["Frontend Layer - Next.js"]
        Pages["App Router Pages"]
        Components["Shared UI Components<br/>(DataTable, Modal, Toast, Forms)"]
        Query["TanStack Query<br/>(server-state cache)"]
        AuthCtx["Auth Context / Middleware"]
    end

    subgraph API["Backend Layer - FastAPI"]
        Routes["API Routes<br/>(auth, hosted_zones, dns_records)"]
        Deps["Dependencies<br/>(get_current_user, pagination, search)"]
        Services["Service Layer<br/>(zone creation, record validation,<br/>import/export)"]
        Schemas["Pydantic Schemas<br/>(request/response validation)"]
    end

    subgraph Data["Data Layer"]
        ORM["SQLAlchemy ORM Models"]
        DB[("SQLite Database<br/>route53_clone.db")]
    end

    Browser -->|"HTTPS / fetch"| Pages
    Pages --> Components
    Pages --> Query
    Pages --> AuthCtx
    Query -->|"REST/JSON<br/>+ session cookie"| Routes
    AuthCtx -->|"/auth/*"| Routes
    Routes --> Deps
    Deps --> Services
    Routes --> Schemas
    Services --> ORM
    Schemas --> ORM
    ORM --> DB

    style Client fill:#e8f0fe,stroke:#4285f4
    style Frontend fill:#fff4e5,stroke:#f9a825
    style API fill:#e6f4ea,stroke:#34a853
    style Data fill:#fce8e6,stroke:#ea4335
```

**Key architectural decisions**

| Decision | Rationale |
|---|---|
| REST (not GraphQL) | Matches Route53's own API style; simpler to mirror 1:1 in FastAPI's OpenAPI docs |
| Session cookie (HTTP-only) over localStorage JWT | Mitigates XSS token theft; simpler `credentials: 'include'` fetch pattern |
| TanStack Query for server-state | Avoids manual loading/error/cache boilerplate; supports optimistic updates for snappy CRUD |
| SQLAlchemy + SQLite | Zero-ops local persistence; ORM keeps a clean migration path to Postgres later |
| Service layer between routes and ORM | Isolates business rules (e.g., auto-generating NS/SOA records, system-record deletion guard) from HTTP concerns |

---

## 3. Component Architecture

### 3.1 Frontend Component Tree

```mermaid
graph TD
    App["App Layout<br/>(app/layout.tsx)"] --> AuthProvider
    AuthProvider --> TopBar["TopBar<br/>(search, user menu, logout)"]
    AuthProvider --> SideNav["SideNav<br/>(Dashboard, Hosted Zones,<br/>Traffic Policies, Resolver,<br/>Health Checks, Profiles)"]
    AuthProvider --> PageOutlet["Page Outlet"]

    PageOutlet --> LoginPage["/login"]
    PageOutlet --> ZonesList["/hosted-zones<br/>(HostedZonesTable)"]
    PageOutlet --> ZoneDetail["/hosted-zones/[id]<br/>(ZoneHeader + RecordsTable)"]
    PageOutlet --> ComingSoon["/dashboard, /traffic-policies,<br/>/resolver, /health-checks,<br/>/profiles → ComingSoonPage"]

    ZonesList --> DataTable1["DataTable"]
    ZonesList --> ZoneFormModal["ZoneFormModal<br/>(create/edit)"]
    ZonesList --> ConfirmDialog1["ConfirmDialog<br/>(delete zone)"]

    ZoneDetail --> DataTable2["DataTable"]
    ZoneDetail --> RecordFormModal["RecordFormModal<br/>(type-aware form)"]
    ZoneDetail --> ConfirmDialog2["ConfirmDialog<br/>(delete record)"]
    ZoneDetail --> ExportImportMenu["Export/Import Menu"]

    DataTable1 --> SearchBar
    DataTable1 --> Pagination
    DataTable2 --> SearchBar
    DataTable2 --> Pagination
    DataTable2 --> TypeFilter["Record Type Filter"]

    AuthProvider -.->|"wraps entire tree"| ToastProvider["ToastProvider<br/>(global notifications)"]

    style App fill:#e8f0fe,stroke:#4285f4
    style ToastProvider fill:#fff4e5,stroke:#f9a825
```

### 3.2 Backend Layered Architecture

```mermaid
graph LR
    subgraph L1["Presentation Layer"]
        R1["auth.py routes"]
        R2["hosted_zones.py routes"]
        R3["dns_records.py routes"]
    end

    subgraph L2["Dependency Layer"]
        D1["get_current_user"]
        D2["PaginationParams"]
        D3["SearchParams"]
        D4["get_db (session)"]
    end

    subgraph L3["Service Layer"]
        S1["AuthService<br/>(hash, verify, session mgmt)"]
        S2["ZoneService<br/>(create w/ NS+SOA, cascade delete)"]
        S3["RecordService<br/>(type validation, system-record guard)"]
        S4["ImportExportService<br/>(BIND parse/generate)"]
    end

    subgraph L4["Data Access Layer"]
        M1["User Model"]
        M2["HostedZone Model"]
        M3["DnsRecord Model"]
        M4["Session Model"]
    end

    R1 --> D1 & D4
    R2 --> D1 & D2 & D3 & D4
    R3 --> D1 & D2 & D3 & D4

    R1 --> S1
    R2 --> S2
    R3 --> S3 & S4

    S1 --> M1 & M4
    S2 --> M2 & M3
    S3 --> M3
    S4 --> M3

    style L1 fill:#e6f4ea,stroke:#34a853
    style L2 fill:#fff4e5,stroke:#f9a825
    style L3 fill:#e8f0fe,stroke:#4285f4
    style L4 fill:#fce8e6,stroke:#ea4335
```

---

## 4. Data Model / Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ HOSTED_ZONES : "owns"
    HOSTED_ZONES ||--o{ DNS_RECORDS : "contains"

    USERS {
        int id PK
        string email UK
        string password_hash
        string name
        datetime created_at
    }

    SESSIONS {
        string id PK "UUID / opaque token"
        int user_id FK
        datetime expires_at
        datetime created_at
    }

    HOSTED_ZONES {
        string id PK "UUID, zone-XXXXXXXX format"
        string domain_name
        string type "PUBLIC | PRIVATE"
        string comment
        int record_count "denormalized"
        int owner_id FK
        datetime created_at
        datetime updated_at
    }

    DNS_RECORDS {
        string id PK "UUID"
        string hosted_zone_id FK
        string name
        string type "A|AAAA|CNAME|TXT|MX|NS|PTR|SRV|CAA"
        int ttl "default 300"
        text values "JSON-encoded array"
        string routing_policy "SIMPLE default"
        bool is_system "true for auto NS/SOA"
        datetime created_at
        datetime updated_at
    }
```

**Indexes**
- `hosted_zones(domain_name)` — unique-ish lookup + search
- `dns_records(hosted_zone_id, name, type)` — composite index for list/search/filter
- `sessions(user_id)` — fast session lookups on auth check

---

## 5. Key Request Flows (Sequence Diagrams)

### 5.1 Login & Session Persistence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Next.js Frontend
    participant BE as FastAPI Backend
    participant DB as SQLite

    U->>FE: Enter email/password, submit
    FE->>BE: POST /api/v1/auth/login
    BE->>DB: SELECT user WHERE email = ?
    DB-->>BE: user row (password_hash)
    BE->>BE: verify_password(plain, hash)
    alt valid credentials
        BE->>DB: INSERT INTO sessions (id, user_id, expires_at)
        BE-->>FE: 200 OK + Set-Cookie: session_id (HttpOnly)
        FE->>FE: store user in AuthContext
        FE-->>U: redirect to /hosted-zones
    else invalid credentials
        BE-->>FE: 401 Unauthorized
        FE-->>U: show error toast "Invalid credentials"
    end

    Note over FE,BE: On every page load
    FE->>BE: GET /api/v1/auth/me (cookie auto-sent)
    BE->>DB: SELECT session WHERE id = ? AND expires_at > now
    alt session valid
        BE-->>FE: 200 OK + user payload
    else session missing/expired
        BE-->>FE: 401 Unauthorized
        FE-->>U: redirect to /login
    end
```

### 5.2 Create Hosted Zone (with auto NS/SOA generation)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend (ZoneFormModal)
    participant BE as FastAPI (hosted_zones route)
    participant SVC as ZoneService
    participant DB as SQLite

    U->>FE: Fill domain name, type, comment → Submit
    FE->>FE: client-side FQDN validation
    FE->>BE: POST /api/v1/hosted-zones {domain_name, type, comment}
    BE->>BE: get_current_user (auth check)
    BE->>SVC: create_zone(payload, owner_id)
    SVC->>DB: INSERT INTO hosted_zones (...)
    SVC->>SVC: generate default SOA + NS values
    SVC->>DB: INSERT INTO dns_records (type=NS, is_system=true)
    SVC->>DB: INSERT INTO dns_records (type=SOA, is_system=true)
    SVC->>DB: UPDATE hosted_zones SET record_count = 2
    DB-->>SVC: commit
    SVC-->>BE: HostedZone (with record_count)
    BE-->>FE: 201 Created + zone JSON
    FE->>FE: invalidate ["hosted-zones"] query cache
    FE-->>U: close modal + success toast "Hosted zone created"
```

### 5.3 Create / Edit DNS Record (type-aware validation)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend (RecordFormModal)
    participant BE as FastAPI (dns_records route)
    participant SVC as RecordService
    participant DB as SQLite

    U->>FE: Select record type (e.g., MX) → dynamic fields render
    U->>FE: Fill name, TTL, priority/hostname pairs → Submit
    FE->>FE: client-side type-specific validation
    FE->>BE: POST /hosted-zones/{zoneId}/records {name, type, ttl, values}
    BE->>BE: get_current_user + verify zone ownership
    BE->>SVC: create_record(zoneId, payload)
    SVC->>SVC: validate values schema per record type
    alt validation fails
        SVC-->>BE: 422 Unprocessable Entity (field errors)
        BE-->>FE: 422 + error detail
        FE-->>U: inline field errors + error toast
    else validation passes
        SVC->>DB: INSERT INTO dns_records (...)
        SVC->>DB: UPDATE hosted_zones SET record_count += 1
        DB-->>SVC: commit
        SVC-->>BE: DnsRecord JSON
        BE-->>FE: 201 Created
        FE->>FE: invalidate ["records", zoneId] query cache
        FE-->>U: close modal + success toast "Record created"
    end
```

### 5.4 Delete Hosted Zone (cascade + system-record guard)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend (ConfirmDialog)
    participant BE as FastAPI
    participant SVC as ZoneService
    participant DB as SQLite

    U->>FE: Click Delete → ConfirmDialog opens
    U->>FE: Confirm deletion
    FE->>BE: DELETE /api/v1/hosted-zones/{id}
    BE->>BE: get_current_user + verify ownership
    BE->>SVC: delete_zone(id)
    SVC->>DB: DELETE FROM dns_records WHERE hosted_zone_id = id
    SVC->>DB: DELETE FROM hosted_zones WHERE id = id
    DB-->>SVC: commit (cascade via FK ON DELETE CASCADE)
    SVC-->>BE: 204 No Content
    BE-->>FE: 204 No Content
    FE->>FE: invalidate ["hosted-zones"] query cache
    FE-->>U: success toast "Hosted zone deleted"
```

---

## 6. Frontend Design Details

### 6.1 Routing Map (Next.js App Router)

| Route | File | Auth Required | Description |
|---|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | No | Mock login form |
| `/hosted-zones` | `app/(dashboard)/hosted-zones/page.tsx` | Yes | Zones list (search/paginate) |
| `/hosted-zones/[id]` | `app/(dashboard)/hosted-zones/[id]/page.tsx` | Yes | Zone detail + records table |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Yes | Coming Soon |
| `/traffic-policies` | `app/(dashboard)/traffic-policies/page.tsx` | Yes | Coming Soon |
| `/resolver` | `app/(dashboard)/resolver/page.tsx` | Yes | Coming Soon |
| `/health-checks` | `app/(dashboard)/health-checks/page.tsx` | Yes | Coming Soon |
| `/profiles` | `app/(dashboard)/profiles/page.tsx` | Yes | Coming Soon |

Route protection implemented via `middleware.ts`, checking the session cookie and redirecting unauthenticated requests to `/login`.

### 6.2 State Management Strategy

| State type | Tool | Example |
|---|---|---|
| Server state (remote data) | TanStack Query | zones list, records list, zone detail |
| Auth/session state | React Context (`AuthProvider`) | current user, login/logout actions |
| UI/local state | `useState` / `useReducer` | modal open/close, form field values, filters |
| Global UI feedback | Context (`ToastProvider`) | success/error/info notifications |

Query keys convention: `["hosted-zones", { q, page, pageSize }]`, `["records", zoneId, { q, type, page, pageSize }]` — enables targeted cache invalidation on mutation.

### 6.3 Shared Component Contracts (high level)

```typescript
// DataTable.tsx
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearch?: (query: string) => void;
  filters?: React.ReactNode; // e.g., record type filter
  rowActions?: (row: T) => React.ReactNode; // Edit/Delete menu
  onRowClick?: (row: T) => void;
}

// RecordFormModal.tsx
interface RecordFormModalProps {
  zoneId: string;
  mode: "create" | "edit";
  initialData?: DnsRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // triggers query invalidation + toast
}
```

---

## 7. Backend Design Details

### 7.1 Pydantic Schema Examples

```python
# schemas/dns_record.py
from pydantic import BaseModel, field_validator
from typing import Literal, Union
from enum import Enum

class RecordType(str, Enum):
    A = "A"
    AAAA = "AAAA"
    CNAME = "CNAME"
    TXT = "TXT"
    MX = "MX"
    NS = "NS"
    PTR = "PTR"
    SRV = "SRV"
    CAA = "CAA"

class DnsRecordCreate(BaseModel):
    name: str
    type: RecordType
    ttl: int = 300
    values: list[str] | list[dict]  # dict form for MX/SRV/CAA structured values
    routing_policy: Literal["SIMPLE", "WEIGHTED"] = "SIMPLE"

    @field_validator("ttl")
    @classmethod
    def ttl_range(cls, v: int) -> int:
        if not (0 <= v <= 172800):
            raise ValueError("TTL must be between 0 and 172800 seconds")
        return v

class DnsRecordResponse(DnsRecordCreate):
    id: str
    hosted_zone_id: str
    is_system: bool
    created_at: str
    updated_at: str
```

### 7.2 Auth Dependency

```python
# api/deps.py
from fastapi import Depends, HTTPException, Cookie
from sqlalchemy.orm import Session

def get_db() -> Session: ...

def get_current_user(
    session_id: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = db.query(Session).filter_by(id=session_id).first()
    if not session or session.expires_at < now():
        raise HTTPException(status_code=401, detail="Session expired")
    return session.user
```

### 7.3 Pagination Envelope (all list endpoints)

```json
{
  "items": [ /* ... */ ],
  "total": 42,
  "page": 1,
  "page_size": 25
}
```

### 7.4 Error Response Convention

```json
{
  "detail": "Domain name already exists",
  "code": "DUPLICATE_ZONE",
  "field": "domain_name"
}
```
FastAPI's `HTTPException` used for standard errors; a custom `RequestValidationError` handler normalizes Pydantic 422 errors into the same envelope shape for consistent frontend toast/field-error handling.

---

## 8. Full Repository File Structure

```
route53-clone/
├── README.md
├── docker-compose.yml                     # optional: spin up FE+BE together
├── .gitignore
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── middleware.ts                      # route protection
│   ├── .env.local.example
│   │
│   ├── app/
│   │   ├── layout.tsx                     # root layout (AuthProvider, ToastProvider)
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   │
│   │   └── (dashboard)/
│   │       ├── layout.tsx                 # SideNav + TopBar wrapper
│   │       ├── dashboard/
│   │       │   └── page.tsx               # Coming Soon
│   │       ├── hosted-zones/
│   │       │   ├── page.tsx               # zones list
│   │       │   └── [id]/
│   │       │       └── page.tsx           # zone detail + records
│   │       ├── traffic-policies/
│   │       │   └── page.tsx               # Coming Soon
│   │       ├── resolver/
│   │       │   └── page.tsx               # Coming Soon
│   │       ├── health-checks/
│   │       │   └── page.tsx               # Coming Soon
│   │       └── profiles/
│   │           └── page.tsx               # Coming Soon
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── SideNav.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   ├── common/
│   │   │   ├── DataTable.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ToastProvider.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ComingSoonPage.tsx
│   │   ├── zones/
│   │   │   ├── HostedZonesTable.tsx
│   │   │   ├── ZoneFormModal.tsx
│   │   │   └── ZoneHeader.tsx
│   │   └── records/
│   │       ├── RecordsTable.tsx
│   │       ├── RecordFormModal.tsx
│   │       ├── RecordTypeFields/          # dynamic per-type field groups
│   │       │   ├── AFields.tsx
│   │       │   ├── MxFields.tsx
│   │       │   ├── SrvFields.tsx
│   │       │   ├── CaaFields.tsx
│   │       │   └── ...
│   │       └── TypeFilter.tsx
│   │
│   ├── lib/
│   │   ├── api-client.ts                  # fetch wrapper, base URL, credentials
│   │   ├── query-keys.ts
│   │   └── validators.ts                  # zod schemas for forms
│   │
│   ├── hooks/
│   │   ├── useHostedZones.ts              # TanStack Query hooks
│   │   ├── useHostedZone.ts
│   │   ├── useDnsRecords.ts
│   │   └── useAuth.ts
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ToastContext.tsx
│   │
│   └── types/
│       ├── hosted-zone.ts
│       ├── dns-record.ts
│       └── user.ts
│
└── backend/
    ├── requirements.txt
    ├── pyproject.toml                     # or setup.cfg (ruff/black config)
    ├── .env.example
    ├── alembic.ini                        # optional migrations
    │
    ├── app/
    │   ├── main.py                        # FastAPI() app, CORS, router includes
    │   │
    │   ├── core/
    │   │   ├── config.py                  # Settings (pydantic-settings)
    │   │   ├── security.py                # password hashing, session tokens
    │   │   └── database.py                # engine, SessionLocal, Base
    │   │
    │   ├── models/
    │   │   ├── user.py
    │   │   ├── session.py
    │   │   ├── hosted_zone.py
    │   │   └── dns_record.py
    │   │
    │   ├── schemas/
    │   │   ├── auth.py
    │   │   ├── hosted_zone.py
    │   │   ├── dns_record.py
    │   │   └── common.py                  # PaginatedResponse, ErrorResponse
    │   │
    │   ├── api/
    │   │   ├── deps.py                    # get_db, get_current_user, pagination
    │   │   └── v1/
    │   │       ├── router.py              # aggregates all route modules
    │   │       ├── auth.py
    │   │       ├── hosted_zones.py
    │   │       └── dns_records.py
    │   │
    │   ├── services/
    │   │   ├── auth_service.py
    │   │   ├── zone_service.py            # incl. default NS/SOA generation
    │   │   ├── record_service.py          # type validation, system guard
    │   │   └── import_export_service.py   # BIND zone file parse/generate
    │   │
    │   └── seed.py                        # seeds demo user + sample zones/records
    │
    ├── alembic/
    │   └── versions/
    │
    └── tests/
        ├── conftest.py
        ├── test_auth.py
        ├── test_hosted_zones.py
        └── test_dns_records.py
```

---

## 9. Deployment Architecture

```mermaid
graph LR
    subgraph Dev["Local Development"]
        LFE["Next.js dev server<br/>:3000"]
        LBE["Uvicorn (FastAPI)<br/>:8000"]
        LDB[("SQLite file<br/>./backend/app.db")]
        LFE -->|proxy /api| LBE --> LDB
    end

    subgraph Prod["Hosted Demo"]
        Vercel["Vercel<br/>(Next.js frontend)"]
        Render["Render / Fly.io / Railway<br/>(FastAPI + SQLite volume)"]
        Vol[("Persistent volume<br/>app.db")]
        Vercel -->|"HTTPS REST calls<br/>NEXT_PUBLIC_API_URL"| Render
        Render --> Vol
    end

    Dev -.->|git push| CI["CI: lint + test<br/>(GitHub Actions)"]
    CI -.->|deploy| Prod

    style Dev fill:#e8f0fe,stroke:#4285f4
    style Prod fill:#e6f4ea,stroke:#34a853
```

**Notes**
- SQLite requires a persistent disk/volume on the hosting platform (ephemeral filesystems will lose data on redeploy) — Render/Fly.io persistent volumes recommended over serverless platforms for the backend.
- CORS on FastAPI restricted to the deployed frontend origin; cookies set with `SameSite=None; Secure` in production for cross-origin auth to work.

---

## 10. Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend framework | Next.js 14+ (App Router), TypeScript | SSR/CSR hybrid, typed React |
| Styling | Tailwind CSS (+ shadcn/ui) | AWS-console-like density and theming |
| Server-state | TanStack Query | Caching, mutations, invalidation |
| Form validation | react-hook-form + zod | Type-safe, per-record-type schemas |
| Backend framework | FastAPI | Async, OpenAPI docs, Pydantic validation |
| ORM | SQLAlchemy 2.0 | Models, relationships, cascade rules |
| Migrations | Alembic (optional but recommended) | Versioned schema changes |
| Database | SQLite | Zero-ops persistence per PRD requirement |
| Auth | Passlib (bcrypt) + HttpOnly session cookie | Mocked but realistic auth |
| Testing | Pytest (backend), Vitest/Playwright (frontend) | Unit + E2E coverage |
| Lint/format | ESLint/Prettier, ruff/black | Code quality gates |

---

## 11. Cross-Cutting Concerns

### 11.1 Validation Strategy
- **Frontend**: zod schemas per record type gate form submission before any network call (fast feedback).
- **Backend**: Pydantic schemas + custom `field_validator`s are the source of truth; frontend validation is a UX convenience, not a security boundary.

### 11.2 System-Managed Records
- NS and SOA records created at zone creation carry `is_system = true`.
- `RecordService.delete_record` raises `403` if `is_system` is true and the record is at the zone apex, matching Route53's real restriction; UI disables the delete action with a tooltip explanation.

### 11.3 Notifications
- All mutation hooks (`useCreateZone`, `useUpdateRecord`, etc.) follow a consistent pattern: `onSuccess` → invalidate relevant query key + push success toast; `onError` → push error toast with the backend's `detail` message.

### 11.4 Testing Strategy

| Layer | Type | Coverage target |
|---|---|---|
| Backend services | Unit tests (pytest) | Zone creation (NS/SOA), record type validation, cascade delete, system-record guard |
| Backend routes | Integration tests (pytest + TestClient) | Auth flow, CRUD status codes, pagination/search params |
| Frontend components | Unit tests (Vitest + Testing Library) | DataTable pagination/search, form validation per record type |
| End-to-end | Playwright | Login → create zone → create record → edit → delete happy path |

---

## 12. Open Questions / Decisions for Implementation

| Question | Recommendation |
|---|---|
| JWT vs server-tracked session table? | Server-tracked session table (simpler revocation on logout, matches `sessions` table in schema) |
| Zone ID format | Mimic Route53's `/hostedzone/XXXXXXXXXXXXX` style ID for authenticity in UI, store as plain UUID internally |
| Weighted routing policy | Implement as stretch goal; default all records to `SIMPLE` for MVP |
| BIND import conflict handling | On duplicate name+type, prompt user to overwrite or skip per record |
