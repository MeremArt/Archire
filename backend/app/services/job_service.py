from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.subscription import Subscription
from app.scrapers.base import ScrapedJob
from app.services.ranking import compute_relevance_score
from app.core.logger import get_logger
from app.utils.cache import cache

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Insertion helpers
# ---------------------------------------------------------------------------

def upsert_job(db: Session, scraped: ScrapedJob) -> Tuple[Job, bool]:
    """Insert a job if its URL is new. Returns (job, is_new)."""
    existing = db.query(Job).filter(Job.url == scraped.url).first()
    if existing:
        return existing, False

    job = Job(
        title=scraped.title,
        company=scraped.company,
        location=scraped.location,
        url=scraped.url,
        description=scraped.description,
        date_posted=scraped.date_posted,
        source=scraped.source,
        tags=",".join(scraped.tags) if scraped.tags else "",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job, True


def bulk_upsert_jobs(
    db: Session, scraped_jobs: List[ScrapedJob]
) -> Tuple[int, int]:
    """
    Bulk insert scraped jobs, skipping duplicates by URL.
    Returns (inserted_count, skipped_count).
    """
    if not scraped_jobs:
        return 0, 0

    urls = [j.url for j in scraped_jobs if j.url]
    existing_urls: set = set(
        row[0]
        for row in db.query(Job.url).filter(Job.url.in_(urls)).all()
    )

    new_jobs: List[Job] = []
    skipped = 0

    for scraped in scraped_jobs:
        if not scraped.url or scraped.url in existing_urls:
            skipped += 1
            continue

        new_jobs.append(
            Job(
                title=(scraped.title or "")[:490],
                company=(scraped.company or "")[:490],
                location=(scraped.location or "")[:490],
                url=scraped.url[:2040],
                description=scraped.description,
                date_posted=scraped.date_posted,
                source=(scraped.source or "")[:190],
                tags=(",".join(scraped.tags) if scraped.tags else "")[:990],
            )
        )
        existing_urls.add(scraped.url)

    if new_jobs:
        db.bulk_save_objects(new_jobs)
        db.commit()

    inserted = len(new_jobs)
    logger.info(f"bulk_upsert: {inserted} inserted, {skipped} skipped")

    # Invalidate cached queries
    cache.clear()

    return inserted, skipped


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_jobs(
    db: Session,
    keyword: Optional[str] = None,
    location: Optional[str] = None,
    days: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    source: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Fetch and rank jobs with optional filtering.
    Returns (jobs_list, total_count).
    """
    cache_key = f"jobs:{keyword}:{location}:{days}:{page}:{page_size}:{source}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    query = db.query(Job)

    # --- Filters ---
    if days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.filter(
            or_(Job.date_posted >= cutoff, Job.created_at >= cutoff)
        )

    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))

    if source:
        query = query.filter(Job.source == source)

    if keyword:
        kws = [k.strip() for k in keyword.split() if k.strip()]
        conditions = []
        for kw in kws:
            conditions.extend([
                Job.title.ilike(f"%{kw}%"),
                Job.company.ilike(f"%{kw}%"),
                Job.description.ilike(f"%{kw}%"),
                Job.tags.ilike(f"%{kw}%"),
            ])
        query = query.filter(or_(*conditions))

    total = query.count()

    # --- Sorting ---
    query = query.order_by(desc(Job.created_at))

    if keyword:
        # Fetch more records, rank in Python, then slice
        fetch_limit = min(page_size * 10, 500)
        rows = query.limit(fetch_limit).all()
        kws_list = [k.strip() for k in keyword.split() if k.strip()]
        scored = sorted(
            ((job, compute_relevance_score(job.to_dict(), kws_list)) for job in rows),
            key=lambda x: (-x[1], -(
                x[0].date_posted.timestamp() if x[0].date_posted else 0
            )),
        )
        offset = (page - 1) * page_size
        page_jobs = [j for j, _ in scored[offset: offset + page_size]]
    else:
        offset = (page - 1) * page_size
        page_jobs = query.offset(offset).limit(page_size).all()

    result = [job.to_dict() for job in page_jobs]
    cache.set(cache_key, (result, total))
    return result, total


# ---------------------------------------------------------------------------
# Subscription helpers
# ---------------------------------------------------------------------------

def get_active_subscriptions(db: Session) -> List[Subscription]:
    return db.query(Subscription).filter(Subscription.is_active == True).all()  # noqa: E712


def get_matching_jobs_for_subscription(
    db: Session,
    subscription: Subscription,
    since: Optional[datetime] = None,
) -> List[Job]:
    """Return jobs matching a subscription's keywords, posted since `since`."""
    keywords = subscription.get_keywords()
    if not keywords:
        return []

    query = db.query(Job)

    if since:
        query = query.filter(Job.created_at >= since)

    if subscription.location_filter:
        query = query.filter(
            Job.location.ilike(f"%{subscription.location_filter}%")
        )

    conditions = []
    for kw in keywords:
        conditions.extend([
            Job.title.ilike(f"%{kw}%"),
            Job.description.ilike(f"%{kw}%"),
            Job.tags.ilike(f"%{kw}%"),
        ])
    query = query.filter(or_(*conditions))

    rows = query.order_by(desc(Job.created_at)).limit(100).all()

    scored = sorted(
        ((job, compute_relevance_score(job.to_dict(), keywords)) for job in rows),
        key=lambda x: -x[1],
    )
    # Only return jobs with a positive score
    return [j for j, s in scored if s > 0][:20]
