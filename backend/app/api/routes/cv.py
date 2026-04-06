from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.core.logger import get_logger
from app.models.cv import UserCV
from app.models.job import Job
from app.models.application import Application
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/cv", tags=["cv"])
logger = get_logger(__name__)

TAILOR_SYSTEM_PROMPT = """You are an expert technical recruiter and CV writer with deep knowledge of ATS systems.
Your job is to tailor a candidate's master CV specifically for a job posting.

Rules:
- NEVER invent skills, experience, or achievements the candidate doesn't have
- Rewrite bullet points to use the job's exact terminology where accurate
- Extract 15-20 keywords from the job description and weave them in naturally
- Reorder sections/bullets to lead with the most relevant experience
- Rewrite the professional summary to mirror the role's language
- Keep ALL facts, dates, companies, and metrics from the original
- Output clean markdown that renders well

Output format — return ONLY the tailored CV in markdown, nothing else. Start with the candidate's name as # heading."""

SCORE_PROMPT = """Analyze this job against the candidate's CV and return a JSON object with:
- score: integer 1-100 (overall fit)
- summary: 2-3 sentence plain-English assessment
- strengths: list of 3 key matching strengths
- gaps: list of any notable gaps (empty list if none)

Return ONLY valid JSON, no markdown fences."""


class CVUpload(BaseModel):
    content: str
    filename: Optional[str] = None


class CVResponse(BaseModel):
    id: int
    content: str
    filename: Optional[str]


class TailorRequest(BaseModel):
    job_id: int


class TailorResponse(BaseModel):
    tailored_cv: str
    score: int
    summary: str
    strengths: list
    gaps: list


# ── CV CRUD ───────────────────────────────────────────────────────────────────

@router.post("", response_model=CVResponse, status_code=status.HTTP_201_CREATED)
def upload_cv(body: CVUpload, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(UserCV).filter(UserCV.user_id == user.id).first()
    if existing:
        existing.content = body.content
        existing.filename = body.filename
        db.commit()
        db.refresh(existing)
        return CVResponse(id=existing.id, content=existing.content, filename=existing.filename)

    cv = UserCV(user_id=user.id, content=body.content, filename=body.filename)
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return CVResponse(id=cv.id, content=cv.content, filename=cv.filename)


@router.get("", response_model=CVResponse)
def get_cv(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cv = db.query(UserCV).filter(UserCV.user_id == user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="No CV uploaded yet")
    return CVResponse(id=cv.id, content=cv.content, filename=cv.filename)


# ── AI TAILORING ──────────────────────────────────────────────────────────────

@router.post("/tailor", response_model=TailorResponse)
def tailor_cv(body: TailorRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="AI tailoring not configured — set ANTHROPIC_API_KEY")

    cv = db.query(UserCV).filter(UserCV.user_id == user.id).first()
    if not cv:
        raise HTTPException(status_code=400, detail="Upload your master CV first")

    job = db.query(Job).filter(Job.id == body.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    import anthropic, json
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    job_context = f"""**Role:** {job.title}
**Company:** {job.company or 'Unknown'}
**Location:** {job.location or 'Not specified'}
**Description:**
{job.description or 'No description available'}
**Tags:** {', '.join(job.tags.split(',')) if job.tags else 'None'}"""

    # Step 1: Score the fit
    try:
        score_msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": f"Job posting:\n{job_context}\n\nCandidate CV:\n{cv.content}\n\nScore this match."
            }],
            system=SCORE_PROMPT,
        )
        score_data = json.loads(score_msg.content[0].text)
        score = int(score_data.get("score", 70))
        summary = score_data.get("summary", "")
        strengths = score_data.get("strengths", [])
        gaps = score_data.get("gaps", [])
    except Exception as e:
        logger.error(f"Scoring failed: {e}")
        score, summary, strengths, gaps = 70, "AI analysis unavailable.", [], []

    # Step 2: Tailor the CV
    tailor_msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"Job posting:\n{job_context}\n\nMaster CV:\n{cv.content}\n\nProduce the tailored CV."
        }],
        system=TAILOR_SYSTEM_PROMPT,
    )
    tailored_cv = tailor_msg.content[0].text.strip()

    # Save as application record
    existing_app = db.query(Application).filter(
        Application.user_id == user.id,
        Application.job_id == job.id,
    ).first()
    if existing_app:
        existing_app.tailored_cv = tailored_cv
        existing_app.score = score
        existing_app.ai_notes = summary
        db.commit()
    else:
        app = Application(
            user_id=user.id,
            job_id=job.id,
            job_title=job.title,
            company=job.company,
            job_url=job.url,
            tailored_cv=tailored_cv,
            score=score,
            ai_notes=summary,
            status="saved",
        )
        db.add(app)
        db.commit()

    logger.info(f"Tailored CV for user={user.id} job={job.id} score={score}")
    return TailorResponse(
        tailored_cv=tailored_cv,
        score=score,
        summary=summary,
        strengths=strengths,
        gaps=gaps,
    )
