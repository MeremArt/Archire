"""
APScheduler-based scraping scheduler.

Run from the project root:
    python services/scheduler.py
"""
import os
import sys
import signal

# Add backend/ to path so we can import app.*
sys.path.insert(
    0,
    os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
    ),
)

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.database import SessionLocal, init_db
from app.core.logger import get_logger
from app.scrapers.engine import run_all_scrapers
from app.services.job_service import bulk_upsert_jobs

logger = get_logger(__name__)


def scraping_job() -> None:
    """Full scrape → persist → notify cycle."""
    logger.info("=== Scheduled scraping job START ===")
    db = SessionLocal()
    try:
        scraped = run_all_scrapers()

        if not scraped:
            logger.warning("Scraping job returned 0 jobs")
            return

        inserted, skipped = bulk_upsert_jobs(db, scraped)
        logger.info(f"Persisted: {inserted} new, {skipped} duplicates")

        try:
            # Import here to avoid circular import at module load time
            sys.path.insert(
                0,
                os.path.normpath(
                    os.path.join(
                        os.path.dirname(os.path.abspath(__file__)), ".."
                    )
                ),
            )
            from services.notifier import notify_subscribers  # type: ignore

            sent = notify_subscribers(db)
            logger.info(f"Notifications sent: {sent}")
        except Exception as exc:
            logger.error(f"Notification step failed: {exc}", exc_info=True)

    except Exception as exc:
        logger.error(f"Scraping job failed: {exc}", exc_info=True)
    finally:
        db.close()

    logger.info("=== Scheduled scraping job END ===")


def main() -> None:
    init_db()

    scheduler = BlockingScheduler(timezone="UTC")

    # Run immediately on startup
    scheduler.add_job(
        scraping_job,
        id="scrape_immediate",
        name="Initial scrape on startup",
    )

    # Then run on interval
    scheduler.add_job(
        scraping_job,
        trigger=IntervalTrigger(hours=settings.SCRAPE_INTERVAL_HOURS),
        id="scrape_interval",
        name=f"Scrape every {settings.SCRAPE_INTERVAL_HOURS}h",
        replace_existing=True,
        max_instances=1,
    )

    def _shutdown(signum, frame):
        logger.info("Shutdown signal received, stopping scheduler…")
        scheduler.shutdown(wait=False)

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    logger.info(
        f"Scheduler running — interval: {settings.SCRAPE_INTERVAL_HOURS}h"
    )
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped")


if __name__ == "__main__":
    main()
