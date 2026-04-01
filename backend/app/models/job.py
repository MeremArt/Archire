from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func

from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    company = Column(String(500), nullable=True)
    location = Column(String(500), nullable=True)
    url = Column(String(2048), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    date_posted = Column(DateTime, nullable=True)
    source = Column(String(200), nullable=True)
    tags = Column(String(1000), nullable=True)  # comma-separated
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("idx_jobs_date_posted", "date_posted"),
        Index("idx_jobs_company", "company"),
        Index("idx_jobs_source", "source"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "url": self.url,
            "description": self.description,
            "date_posted": (
                self.date_posted.isoformat() if self.date_posted else None
            ),
            "source": self.source,
            "tags": self.tags.split(",") if self.tags else [],
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
        }
