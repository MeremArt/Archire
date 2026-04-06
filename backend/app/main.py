from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.core.logger import get_logger
from app.api.routes import jobs, subscriptions, auth, scrape, cv, applications

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME}...")
    try:
        init_db()
        logger.info("Database initialised")
    except Exception as exc:
        # Log but don't crash — health check must pass even if DB is slow to connect
        logger.error(f"Database init failed (will retry on first request): {exc}")
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
app.include_router(cv.router, prefix="/api")
app.include_router(applications.router, prefix="/api")


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


def _run_scrape_task():
    """Run in a background thread — scraping 33+ sources takes several minutes."""
    from app.scrapers.engine import run_all_scrapers
    from app.services.job_service import bulk_upsert_jobs
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        jobs_scraped = run_all_scrapers()
        inserted, skipped = bulk_upsert_jobs(db, jobs_scraped)
        logger.info(f"Background scrape done: scraped={len(jobs_scraped)} inserted={inserted} skipped={skipped}")
    except Exception as exc:
        logger.error(f"Background scrape failed: {exc}", exc_info=True)
    finally:
        db.close()


@app.post("/api/admin/init-db", tags=["admin"])
def force_init_db():
    """Force-create any missing tables (safe to call multiple times — idempotent)."""
    try:
        init_db()
        return {"status": "ok", "message": "Tables created / verified."}
    except Exception as exc:
        logger.error(f"Force init_db failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/admin/scrape", tags=["admin"])
def trigger_scrape(background_tasks: __import__("fastapi").BackgroundTasks):
    """
    Kick off a scrape in the background and return immediately.
    Scraping 33+ sources takes several minutes — runs async so the request doesn't time out.
    """
    background_tasks.add_task(_run_scrape_task)
    return {"status": "started", "message": "Scrape running in background. Jobs will appear within a few minutes."}
