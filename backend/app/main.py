from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import re

from app.core.config import settings
from app.core.database import create_tables
from app.api.v1.router import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables and seed on startup."""
    create_tables()
    try:
        from app.seed import seed_data
        seed_data()
    except Exception as e:
        print(f"Startup seed error: {e}")
    yield  # Application runs here


app = FastAPI(
    title="AWS Route53 Clone API",
    description="A functional clone of the AWS Route53 management console API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Allowed origin patterns (supports wildcards via regex):
#   - Exact origins from CORS_ORIGINS env var
#   - Any *.vercel.app domain (covers preview + production Vercel deployments)
#   - Any *.onrender.com domain (in case services call each other)
#   - localhost for local dev

CORS_WILDCARD_PATTERNS = [
    re.compile(r"https://[a-zA-Z0-9\-]+\.vercel\.app$"),
    re.compile(r"https://[a-zA-Z0-9\-]+\.onrender\.com$"),
    re.compile(r"http://localhost:\d+$"),
    re.compile(r"http://127\.0\.0\.1:\d+$"),
]


def is_origin_allowed(origin: str) -> bool:
    if settings.CORS_ALLOW_ALL:
        return True
    explicit = settings.get_cors_origins()
    if origin in explicit:
        return True
    return any(p.match(origin) for p in CORS_WILDCARD_PATTERNS)


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")

    # Handle preflight
    if request.method == "OPTIONS" and origin:
        if is_origin_allowed(origin):
            return JSONResponse(
                content="",
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
                    "Access-Control-Expose-Headers": "Content-Disposition",
                    "Access-Control-Max-Age": "600",
                },
            )
        return JSONResponse(content={"detail": "CORS not allowed"}, status_code=403)

    response = await call_next(request)

    if origin and is_origin_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"

    return response


# ── Routes ───────────────────────────────────────────────────────────────────
app.include_router(router)




# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Route53 Clone API",
        "version": "1.0.0",
        "cors": "wildcard *.vercel.app + *.onrender.com + localhost",
    }


@app.get("/debug-db")
def debug_db():
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.models.hosted_zone import HostedZone
    import traceback

    db = SessionLocal()
    try:
        users = db.query(User).all()
        zones = db.query(HostedZone).all()
        return {
            "users": [{"id": u.id, "email": u.email, "name": u.name} for u in users],
            "zone_count": len(zones),
            "zones": [{"id": z.id, "domain": z.domain_name, "records": z.record_count} for z in zones],
        }
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}
    finally:
        db.close()
