from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import create_tables
from app.api.v1.router import router


app = FastAPI(
    title="AWS Route53 Clone API",
    description="A functional clone of the AWS Route53 management console API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────────────────────
cors_origins = settings.get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # When allow_origins=["*"] credentials must be false — guard against that
    expose_headers=["Content-Disposition"],
)

# ── Routes ───────────────────────────────────────────────────────────────────
app.include_router(router)


# ── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    create_tables()
    from app.seed import seed_data
    seed_data()


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "Route53 Clone API", "version": "1.0.0"}
