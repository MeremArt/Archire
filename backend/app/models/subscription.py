from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func

from app.core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    keywords = Column(String(1000), nullable=False)  # comma-separated
    location_filter = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    last_notified_at = Column(DateTime, nullable=True)

    def get_keywords(self) -> list:
        return [k.strip().lower() for k in self.keywords.split(",") if k.strip()]
