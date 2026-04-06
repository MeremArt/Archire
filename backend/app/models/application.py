from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, String
from sqlalchemy.sql import func

from app.core.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)

    # Job snapshot (kept even if job is deleted)
    job_title = Column(String(500), nullable=True)
    company = Column(String(500), nullable=True)
    job_url = Column(String(2048), nullable=True)

    # AI-generated tailored CV
    tailored_cv = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)          # AI fit score 1-100
    ai_notes = Column(Text, nullable=True)          # AI analysis summary

    # Application status pipeline
    status = Column(String(50), nullable=False, default="saved")
    # saved → applied → screening → interview → offer → rejected → withdrawn

    notes = Column(Text, nullable=True)             # user's own notes
    applied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "job_title": self.job_title,
            "company": self.company,
            "job_url": self.job_url,
            "tailored_cv": self.tailored_cv,
            "score": self.score,
            "ai_notes": self.ai_notes,
            "status": self.status,
            "notes": self.notes,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
