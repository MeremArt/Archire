from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.core.logger import get_logger
from app.api.routes import jobs, subscriptions, auth, scrape

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME}...")
    init_db()
    logger.info("Database initialised")
    yield
    logger.info(f"{settings.APP_NAME} shut down")


app = FastAPI(
    title=settings.APP_NAME,
    description="Job Aggregation Platform — modular scraping engine, REST API, JWT auth",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(jobs.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(scrape.router, prefix="/api")


# ── Utility endpoints ─────────────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "version": "1.0.0"}


@app.get("/api/sources", tags=["meta"])
def list_sources():
    """Return metadata for every configured scraper source."""
    from app.scrapers.engine import load_scraper_configs
    configs = load_scraper_configs()
    return [
        {
            "name": c.get("name"),
            "type": c.get("type", "html"),
            "url": c.get("base_url"),
            "enabled": c.get("enabled", True),
        }
        for c in configs
    ]


@app.post("/api/admin/scrape", tags=["admin"])
def trigger_scrape():
    """
    Manually trigger a scrape run (no auth required for local dev —
    add get_admin_user dependency in production).
    """
    from app.scrapers.engine import run_all_scrapers
    from app.services.job_service import bulk_upsert_jobs
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        jobs_scraped = run_all_scrapers()
        inserted, skipped = bulk_upsert_jobs(db, jobs_scraped)
        return {
            "scraped": len(jobs_scraped),
            "inserted": inserted,
            "skipped": skipped,
        }
    finally:
        db.close()
