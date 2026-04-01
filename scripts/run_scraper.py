#!/usr/bin/env python3
"""
Manual scraper runner.

Usage (from project root):
    python scripts/run_scraper.py
    python scripts/run_scraper.py --source "RemoteOK"
    python scripts/run_scraper.py --dry-run
"""
import argparse
import os
import sys

sys.path.insert(
    0,
    os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
    ),
)

from app.core.database import SessionLocal, init_db
from app.core.logger import get_logger
from app.scrapers.engine import (
    get_scraper,
    load_scraper_configs,
    run_all_scrapers,
)
from app.services.job_service import bulk_upsert_jobs

logger = get_logger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run job scrapers manually")
    parser.add_argument("--source", help="Run only a specific source (by name)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape but do not persist to database",
    )
    args = parser.parse_args()

    init_db()

    if args.source:
        configs = [
            c
            for c in load_scraper_configs()
            if c.get("name", "").lower() == args.source.lower()
        ]
        if not configs:
            print(f"No scraper config found for source: '{args.source}'")
            sys.exit(1)
        scraper = get_scraper(configs[0])
        scraped = scraper.scrape()
    else:
        scraped = run_all_scrapers()

    print(f"\n{'─'*60}")
    print(f"  Scraped {len(scraped)} job(s)")
    print(f"{'─'*60}")
    for job in scraped[:10]:
        print(f"  [{job.source}] {job.title}")
        print(f"    Company  : {job.company or '—'}")
        print(f"    Location : {job.location or '—'}")
        print(f"    URL      : {job.url}")
        print()
    if len(scraped) > 10:
        print(f"  … and {len(scraped) - 10} more\n")

    if args.dry_run:
        print("[DRY RUN] Skipping database write\n")
        return

    db = SessionLocal()
    try:
        inserted, skipped = bulk_upsert_jobs(db, scraped)
        print(f"Database: {inserted} inserted, {skipped} skipped\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
