from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func

from app.core.database import Base


class ScraperSpec(Base):
    """
    A user-defined scrape specification: keyword + location + sources.
    Saved specs can be re-run on demand or picked up by the scheduler.
    """
    __tablename__ = "scraper_specs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    keyword = Column(String(500), nullable=False)
    location = Column(String(255), nullable=True)
    # comma-separated source names, e.g. "indeed,linkedin,remoteok"
    sources = Column(String(1000), nullable=False, default="")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    last_run_at = Column(DateTime, nullable=True)
    last_run_inserted = Column(Integer, nullable=True)

    def get_sources(self) -> list:
        return [s.strip().lower() for s in self.sources.split(",") if s.strip()]
