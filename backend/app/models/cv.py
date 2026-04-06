from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, String
from sqlalchemy.sql import func

from app.core.database import Base


class UserCV(Base):
    __tablename__ = "user_cvs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    content = Column(Text, nullable=False)          # master CV in markdown/plain text
    filename = Column(String(255), nullable=True)   # original filename if uploaded
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
