<div align="center">

<img src="https://img.shields.io/badge/AWS-Route53%20Clone-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS Route53 Clone" />

<h1>AWS Route53 Clone</h1>
<p><strong>A production-grade, pixel-perfect clone of the AWS Route53 Management Console</strong></p>
<p>Built with FastAPI · Next.js 14 · TypeScript · SQLite · Tailwind CSS</p>

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-aws--route53--clone--three.vercel.app-FF9900?style=for-the-badge)](https://aws-route53-clone-three.vercel.app)
[![Backend API](https://img.shields.io/badge/📡_API_Docs-Swagger_UI-00A1C9?style=for-the-badge)](https://route53-clone-backend-1jhp.onrender.com/docs)

<br/>

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 🌐 What Is This?

This is a **fully functional DNS management console** that replicates the AWS Route53 experience end-to-end — from the dark navy topbar down to the orange CTAs. It goes far beyond a toy CRUD app:

- **Real backend** — FastAPI with session-based auth, SQLAlchemy ORM, and a production-ready layered service architecture
- **Real frontend** — Next.js App Router, TanStack Query for server-state, Cloudscape-inspired design
- **Real features** — BIND import/export, dark mode, keyboard shortcuts, bulk operations
- **Real deployment** — Vercel (frontend) + Render (backend) with runtime proxy to fix cross-domain auth

> 🔑 **Demo:** `admin@example.com` / `password123` — try it live at [aws-route53-clone-three.vercel.app](https://aws-route53-clone-three.vercel.app)

---

## ✨ Feature Highlights

### 🗂 Hosted Zone Management
| Feature | Details |
|---|---|
| Create / Edit / Delete | Full lifecycle management for public & private zones |
| Auto NS & SOA records | System records auto-generated on creation, protected from deletion |
| Search & Pagination | Real-time domain-name search with configurable page size |
| Multi-select Bulk Delete | Select multiple zones, delete in one action |
| Keyboard shortcut | `n` → Create new zone · `r` → Refresh |

### 🔡 DNS Record Management
| Record Types | A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA |
|---|---|
| Full CRUD | Create, view, edit, and delete any record |
| Type Filter | Filter records by type with a single click |
| Import | Upload BIND zone files or paste JSON arrays |
| Export | Download as JSON or BIND-compatible zone file |
| Bulk Delete | Multi-select & delete records in one click |
| Keyboard shortcuts | `c` → Create record · `i` → Import · `r` → Refresh |

### 🔐 Authentication
- Session-based auth with `bcrypt` password hashing
- Bearer token proxy (solves cross-domain Vercel → Render auth)
- Client-side auth guard with automatic redirect to `/login`
- Session persistence via `sessionStorage`

### 🌙 Dark Mode
- Toggle between light and dark with the Moon/Sun button in the topbar
- Persists your preference to `localStorage`
- Full dark-mode CSS coverage for every component

### ⌨️ Keyboard Shortcuts
| Key | Action |
|---|---|
| `?` | Open shortcuts help panel |
| `n` | New hosted zone |
| `c` | New DNS record |
| `i` | Import DNS records |
| `r` | Refresh current table |
| `Esc` | Close any modal |

> Shortcuts are automatically disabled while you're typing in an input field or when any modal is open.

---

## 🏗 Architecture

```
Browser
  │
  ▼
Vercel (Next.js App Router)
  ├── /login, /hosted-zones, /hosted-zones/[id]  — React pages
  ├── /api/v1/[...path]                           — Runtime proxy route
  │       │  (strips content-encoding, forwards Bearer token)
  │       ▼
  └── Render (FastAPI backend)
          ├── /api/v1/auth/*          — Login / logout / session
          ├── /api/v1/hosted-zones/*  — Zone CRUD
          └── /api/v1/hosted-zones/{id}/records/*  — Record CRUD + import/export
                  │
                  ▼
              SQLite Database (persisted on Render disk)
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 App Router | Pages, routing, SSR |
| **Styling** | Tailwind CSS + custom CSS | Cloudscape-inspired AWS design |
| **State** | TanStack Query v5 | Server-state caching & mutations |
| **Backend** | FastAPI + Uvicorn | REST API, async routing |
| **ORM** | SQLAlchemy 2 + Pydantic v2 | Models, validation, serialization |
| **Database** | SQLite | Zero-config persistent storage |
| **Auth** | bcrypt + Bearer tokens | Password hashing + cross-domain sessions |
| **Deployment** | Vercel + Render | Frontend CDN + backend hosting |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.12+
- Node.js 20+

### 1. Clone the repo
```bash
git clone https://github.com/BugHunterX2101/AWS_Route53_Clone.git
cd AWS_Route53_Clone
```

### 2. Start the backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend seeds a demo user and sample zones automatically on first launch.

### 3. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in with `admin@example.com` / `password123`

### 4. API Documentation
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## ☁️ Deploy Your Own (Free)

### Frontend → Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/BugHunterX2101/AWS_Route53_Clone)

1. Import the repo in [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variable: `BACKEND_URL=https://your-render-backend.onrender.com`
4. Deploy — Vercel handles the rest

### Backend → Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect `BugHunterX2101/AWS_Route53_Clone`
3. Set **Root Directory** to `backend`, **Build Command** to `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env var: `DATABASE_URL=sqlite:///./route53_clone.db`

> ⚠️ **Render free tier** spins down after 15 min of inactivity. First request after sleep takes ~30s — the login page will display a "Server waking up…" message automatically.

---

## 📁 Project Structure

```
AWS Route53 Clone/
├── render.yaml                    # Render Blueprint
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py                # FastAPI app + CORS middleware
│       ├── seed.py                # Demo user & sample data seeder
│       ├── api/
│       │   ├── deps.py            # Auth dependency (Bearer token)
│       │   └── v1/
│       │       ├── auth.py        # Login / logout / me
│       │       ├── hosted_zones.py
│       │       └── dns_records.py # CRUD + /import/bind + /import/json + bulk DELETE
│       ├── core/
│       │   ├── config.py          # Settings (Pydantic BaseSettings)
│       │   ├── database.py        # SQLAlchemy engine + session
│       │   └── security.py        # bcrypt + session token generation
│       ├── models/                # SQLAlchemy ORM models
│       ├── schemas/               # Pydantic v2 request/response schemas
│       └── services/
│           ├── auth_service.py
│           ├── record_service.py
│           ├── import_service.py  # BIND zone file parser
│           └── import_export_service.py
└── frontend/
    ├── app/
    │   ├── layout.tsx             # Root layout + all providers
    │   ├── globals.css            # Design system + dark mode
    │   ├── (auth)/login/          # Login page
    │   ├── (dashboard)/           # Protected pages
    │   └── api/v1/[...path]/      # Runtime proxy → Render backend
    ├── components/
    │   ├── layout/                # TopBar, SideNav, Breadcrumbs
    │   ├── zones/                 # HostedZonesTable, ZoneFormModal, ZoneHeader
    │   ├── records/               # RecordsTable, RecordFormModal, ImportRecordsModal
    │   └── common/                # Modal, ConfirmDialog, Pagination, SearchBar, KeyboardShortcutsHelp
    ├── context/
    │   ├── AuthContext.tsx
    │   ├── ThemeContext.tsx        # Dark / light mode
    │   ├── ToastContext.tsx
    │   └── KeyboardShortcutsContext.tsx
    ├── lib/
    │   ├── api-client.ts          # Typed fetch wrapper + Bearer token injection
    │   └── query-keys.ts
    └── types/                     # TypeScript interfaces
```

---

## 🤝 Contributing

Pull requests are welcome! If you find a bug or want to add a feature:

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push and open a PR

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">
  <p>Built with ❤️ as a full-stack engineering showcase</p>
  <p>
    <a href="https://aws-route53-clone-three.vercel.app">🌐 Live Demo</a> ·
    <a href="https://route53-clone-backend-1jhp.onrender.com/docs">📡 API Docs</a> ·
    <a href="https://github.com/BugHunterX2101/AWS_Route53_Clone/issues">🐛 Report Bug</a>
  </p>
</div>
