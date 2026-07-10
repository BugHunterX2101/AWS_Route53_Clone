from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routes
app.include_router(router)


@app.on_event("startup")
async def startup():
    create_tables()
    from app.seed import seed_data
    seed_data()


@app.get("/health")
def health():
    return {"status": "ok", "service": "Route53 Clone API"}
