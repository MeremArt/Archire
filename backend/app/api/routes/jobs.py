from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.job_service import get_jobs
from app.core.logger import get_logger

router = APIRouter(prefix="/jobs", tags=["jobs"])
logger = get_logger(__name__)


class JobListResponse(BaseModel):
    jobs: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=JobListResponse)
def list_jobs(
    keyword: Optional[str] = Query(None, description="Space-separated keywords"),
    location: Optional[str] = Query(None, description="Location filter"),
    days: Optional[int] = Query(None, ge=1, le=365, description="Posted within N days"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    source: Optional[str] = Query(None, description="Filter by source name"),
    db: Session = Depends(get_db),
):
    jobs, total = get_jobs(
        db=db,
        keyword=keyword,
        location=location,
        days=days,
        page=page,
        page_size=page_size,
        source=source,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{job_id}", response_model=Dict[str, Any])
def get_job(job_id: int, db: Session = Depends(get_db)):
    from app.models.job import Job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()
