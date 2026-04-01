"""
Custom scrape endpoints.

POST /api/scrape/run        — run a one-off targeted scrape
GET  /api/scrape/specs      — list saved specs
POST /api/scrape/specs      — create a saved spec
GET  /api/scrape/specs/{id} — get one spec
POST /api/scrape/specs/{id}/run  — run a saved spec
DELETE /api/scrape/specs/{id}    — delete a spec
GET  /api/scrape/sources    — list all available source names
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logger import get_logger
from app.models.scrape_spec import ScraperSpec
from app.scrapers.engine import (
    load_scraper_configs,
    run_targeted_scrape,
)
from app.services.job_service import bulk_upsert_jobs

router = APIRouter(prefix="/scrape", tags=["scrape"])
logger = get_logger(__name__)

# All source names available for targeted scraping
ALL_SOURCES = [
    "RemoteOK",
    "We Work Remotely",
    "Remotive",
    "Indeed",
    "LinkedIn",
    "Glassdoor",
]


# ── Schemas ───────────────────────────────────────────────────────────────────

class RunScrapeRequest(BaseModel):
    keyword: str
    location: str = ""
    sources: List[str] = ALL_SOURCES
    save_spec: bool = False
    spec_name: str = ""

    @field_validator("keyword")
    @classmethod
    def keyword_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("keyword is required")
        return v

    @field_validator("sources")
    @classmethod
    def sources_not_empty(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one source is required")
        return v


class SourceResultOut(BaseModel):
    source: str
    count: int
    error: Optional[str]


class RunScrapeResponse(BaseModel):
    keyword: str
    location: str
    total_scraped: int
    inserted: int
    skipped: int
    sources: List[SourceResultOut]
    spec_id: Optional[int] = None


class SpecCreate(BaseModel):
    name: str
    keyword: str
    location: str = ""
    sources: List[str] = ALL_SOURCES

    @field_validator("name", "keyword")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class SpecOut(BaseModel):
    id: int
    name: str
    keyword: str
    location: Optional[str]
    sources: List[str]
    is_active: bool
    created_at: str
    last_run_at: Optional[str]
    last_run_inserted: Optional[int]


def _spec_to_out(spec: ScraperSpec) -> SpecOut:
    return SpecOut(
        id=spec.id,
        name=spec.name,
        keyword=spec.keyword,
        location=spec.location or "",
        sources=spec.get_sources(),
        is_active=spec.is_active,
        created_at=spec.created_at.isoformat() if spec.created_at else "",
        last_run_at=spec.last_run_at.isoformat() if spec.last_run_at else None,
        last_run_inserted=spec.last_run_inserted,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _execute_scrape(
    keyword: str,
    location: str,
    sources: List[str],
    db: Session,
) -> Dict[str, Any]:
    source_results = run_targeted_scrape(
        keyword=keyword,
        location=location,
        source_names=sources,
    )

    all_jobs = [job for sr in source_results for job in sr.jobs]
    inserted, skipped = bulk_upsert_jobs(db, all_jobs) if all_jobs else (0, 0)

    return {
        "total_scraped": sum(sr.count for sr in source_results),
        "inserted": inserted,
        "skipped": skipped,
        "source_results": source_results,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/sources")
def list_sources():
    """Return all source names available for targeted scraping."""
    configs = load_scraper_configs(include_search=True)
    return [
        {
            "name": c.get("name"),
            "type": c.get("type"),
            "requires_js": c.get("requires_js", False),
            "is_search": c.get("type") == "search_html",
        }
        for c in configs
    ]


@router.post("/run", response_model=RunScrapeResponse)
def run_scrape(request: RunScrapeRequest, db: Session = Depends(get_db)):
    """Run a targeted scrape and import results into the database."""
    logger.info(
        f"Custom scrape: keyword='{request.keyword}' "
        f"location='{request.location}' sources={request.sources}"
    )

    result = _execute_scrape(
        keyword=request.keyword,
        location=request.location,
        sources=request.sources,
        db=db,
    )

    spec_id = None
    if request.save_spec:
        spec_name = request.spec_name.strip() or f"{request.keyword} — {request.location or 'anywhere'}"
        spec = ScraperSpec(
            name=spec_name,
            keyword=request.keyword,
            location=request.location or None,
            sources=",".join(request.sources),
            last_run_at=datetime.utcnow(),
            last_run_inserted=result["inserted"],
        )
        db.add(spec)
        db.commit()
        db.refresh(spec)
        spec_id = spec.id

    return RunScrapeResponse(
        keyword=request.keyword,
        location=request.location,
        total_scraped=result["total_scraped"],
        inserted=result["inserted"],
        skipped=result["skipped"],
        sources=[sr.to_dict() for sr in result["source_results"]],
        spec_id=spec_id,
    )


@router.get("/specs", response_model=List[SpecOut])
def list_specs(db: Session = Depends(get_db)):
    specs = (
        db.query(ScraperSpec)
        .filter(ScraperSpec.is_active == True)  # noqa: E712
        .order_by(ScraperSpec.created_at.desc())
        .all()
    )
    return [_spec_to_out(s) for s in specs]


@router.post("/specs", response_model=SpecOut, status_code=status.HTTP_201_CREATED)
def create_spec(request: SpecCreate, db: Session = Depends(get_db)):
    spec = ScraperSpec(
        name=request.name,
        keyword=request.keyword,
        location=request.location or None,
        sources=",".join(request.sources),
    )
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return _spec_to_out(spec)


@router.get("/specs/{spec_id}", response_model=SpecOut)
def get_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.query(ScraperSpec).filter(ScraperSpec.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")
    return _spec_to_out(spec)


@router.post("/specs/{spec_id}/run", response_model=RunScrapeResponse)
def run_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.query(ScraperSpec).filter(ScraperSpec.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    result = _execute_scrape(
        keyword=spec.keyword,
        location=spec.location or "",
        sources=spec.get_sources(),
        db=db,
    )

    spec.last_run_at = datetime.utcnow()
    spec.last_run_inserted = result["inserted"]
    db.commit()

    return RunScrapeResponse(
        keyword=spec.keyword,
        location=spec.location or "",
        total_scraped=result["total_scraped"],
        inserted=result["inserted"],
        skipped=result["skipped"],
        sources=[sr.to_dict() for sr in result["source_results"]],
        spec_id=spec.id,
    )


@router.delete("/specs/{spec_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.query(ScraperSpec).filter(ScraperSpec.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")
    spec.is_active = False
    db.commit()
