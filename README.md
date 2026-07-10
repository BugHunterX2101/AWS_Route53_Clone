# AWS Route53 Clone

A fully functional clone of the **AWS Route53 Management Console** — built with FastAPI, Next.js 14, and Tailwind CSS.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.12-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

---

## Features

- **Hosted Zone Management** — Create, update, delete public/private hosted zones
- **DNS Records** — Full CRUD for A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA records
- **Auto NS & SOA** — System records generated on zone creation (protected from deletion)
- **Search & Pagination** — Real-time search + type filters on all list views
- **Export** — Download zones as JSON or BIND zone files
- **Authentication** — HTTP-only session cookies with bcrypt password hashing
- **AWS UI** — Pixel-perfect Cloudscape-style interface (dark nav, orange CTAs)
- **Toast Notifications** — Success/error feedback on all mutations
- **Route Protection** — Middleware-based auth guards on all dashboard routes

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS, TanStack Query |
| Backend   | FastAPI, SQLAlchemy, Pydantic v2    |
| Database  | SQLite (file-based, zero-config)    |
| Auth      | bcrypt + HTTP-only session cookies  |

---

## Quick Start (Local)

### Prerequisites
- Python 3.12+
- Node.js 20+

### Backend
```bash
cd backend
py -3.12 -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo credentials:** `admin@example.com` / `password123`

---

## Deploy on Render (Free)

This repo includes a **`render.yaml`** Blueprint for one-click deployment.

### Steps

1. Go to [https://dashboard.render.com/select-repo](https://dashboard.render.com/select-repo)
2. Connect your GitHub account and select **`BugHunterX2101/AWS_Route53_Clone`**
3. Render detects `render.yaml` automatically — click **Apply**
4. Two services will be created:
   - `route53-clone-backend` (FastAPI)
   - `route53-clone-frontend` (Next.js)
5. Wait ~5 minutes for both to build and go live

> **Note:** The free tier spins down after 15 min of inactivity. First request after sleep may take ~30 seconds.

### After Deploy

Once both services are live, optionally tighten CORS:

1. In the Render dashboard → `route53-clone-backend` → **Environment**
2. Set `CORS_ALLOW_ALL` → `false`
3. Set `CORS_ORIGINS` → `["https://route53-clone-frontend.onrender.com"]`
4. Click **Save Changes** (auto-redeploys)

---

## Project Structure

```
AWS Route53 Clone/
├── render.yaml               # Render Blueprint (one-click deploy)
├── docker-compose.yml        # Local Docker stack
├── backend/
│   ├── app/
│   │   ├── api/v1/           # FastAPI route handlers
│   │   ├── core/             # Config, DB, security
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── services/         # Business logic
│   │   ├── seed.py           # Demo data seeder
│   │   └── main.py           # App entry point
│   └── requirements.txt
└── frontend/
    ├── app/                  # Next.js App Router pages
    ├── components/           # UI components
    ├── context/              # React contexts (auth, toast)
    ├── lib/                  # API client, query keys
    └── types/                # TypeScript types
```

---

## API Documentation

Once running, interactive API docs are available at:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## License

MIT — free to use, modify, and distribute.
