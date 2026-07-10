# AWS Route53 Clone

A fully functional, self-hosted clone of the AWS Route53 console — complete with hosted zone management, DNS record CRUD, mocked authentication, search/filter/pagination, and a pixel-perfect AWS-style UI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Server State | TanStack Query |
| Form Validation | react-hook-form + zod |
| Backend | FastAPI (Python 3.12+) |
| ORM | SQLAlchemy 2.0 |
| Database | SQLite |
| Auth | bcrypt + HTTP-only session cookies |

## Features

- ✅ **Mocked Authentication** — Login/logout with session persistence
- ✅ **Hosted Zones CRUD** — Create, view, edit, delete hosted zones with search & pagination
- ✅ **DNS Records CRUD** — Full type-aware record management (A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA)
- ✅ **Auto NS/SOA generation** — Mirrors real Route53 behavior on zone creation
- ✅ **System record protection** — NS/SOA at zone apex cannot be deleted
- ✅ **Export** — Download zone as JSON or BIND zone file
- ✅ **Route53-style UI** — Left nav, breadcrumbs, compact tables, blue actions, slide-over modals, toast notifications
- ✅ **Coming Soon sections** — Dashboard, Traffic Policies, Resolver, Health Checks, Profiles

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- npm or yarn

### 1. Clone the repository

```bash
git clone https://github.com/BugHunterX2101/AWS_Route53_Clone.git
cd AWS_Route53_Clone
```

### 2. Backend Setup

```bash
cd backend
py -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # macOS/Linux

pip install -r requirements.txt

# Copy and configure environment
copy .env.example .env

# Run the server (seeds demo user automatically)
uvicorn app.main:app --reload --port 8000
```

Backend available at: http://localhost:8000  
API docs: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy and configure environment
copy .env.local.example .env.local

npm run dev
```

Frontend available at: http://localhost:3000

### Demo Credentials

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `password123` |

## Project Structure

```
route53-clone/
├── README.md
├── .gitignore
├── docker-compose.yml
├── frontend/                    # Next.js TypeScript app
│   ├── app/
│   │   ├── (auth)/login/
│   │   └── (dashboard)/
│   │       ├── hosted-zones/
│   │       └── [Coming Soon pages]
│   ├── components/
│   │   ├── layout/              # SideNav, TopBar, Breadcrumbs
│   │   ├── common/              # DataTable, Modal, Toast, etc.
│   │   ├── zones/               # Zone-specific components
│   │   └── records/             # Record-specific components
│   └── lib/, hooks/, context/, types/
└── backend/                     # FastAPI app
    └── app/
        ├── api/v1/              # Routes: auth, hosted_zones, dns_records
        ├── core/                # Config, security, database
        ├── models/              # SQLAlchemy ORM models
        ├── schemas/             # Pydantic schemas
        └── services/            # Business logic layer
```

## API Overview

Base URL: `http://localhost:8000/api/v1`

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Authenticate, set session cookie |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Current user info |

### Hosted Zones
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hosted-zones` | List zones (search + paginate) |
| POST | `/hosted-zones` | Create zone (auto NS/SOA) |
| GET | `/hosted-zones/{id}` | Zone detail |
| PUT | `/hosted-zones/{id}` | Update comment |
| DELETE | `/hosted-zones/{id}` | Delete zone + cascade |

### DNS Records
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hosted-zones/{zoneId}/records` | List/search/filter records |
| POST | `/hosted-zones/{zoneId}/records` | Create record |
| PUT | `/hosted-zones/{zoneId}/records/{id}` | Update record |
| DELETE | `/hosted-zones/{zoneId}/records/{id}` | Delete record |
| GET | `/hosted-zones/{zoneId}/export` | Export as JSON or BIND |

## Database Schema

```
users (1) ────< sessions (N)
users (1) ────< hosted_zones (N)
hosted_zones (1) ────< dns_records (N)
```

## License

MIT
