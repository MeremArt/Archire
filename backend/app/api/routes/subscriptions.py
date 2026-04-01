from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.subscription import Subscription
from app.core.logger import get_logger

router = APIRouter(prefix="/subscribe", tags=["subscriptions"])
logger = get_logger(__name__)


class SubscribeRequest(BaseModel):
    email: EmailStr
    keywords: List[str]
    location_filter: str = ""

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, v: List[str]) -> List[str]:
        cleaned = [k.strip().lower() for k in v if k.strip()]
        if not cleaned:
            raise ValueError("At least one keyword is required")
        if len(cleaned) > 20:
            raise ValueError("Maximum 20 keywords allowed")
        return cleaned


class SubscribeResponse(BaseModel):
    message: str
    subscription_id: int


class UnsubscribeRequest(BaseModel):
    email: EmailStr


@router.post("", response_model=SubscribeResponse, status_code=status.HTTP_201_CREATED)
def subscribe(request: SubscribeRequest, db: Session = Depends(get_db)):
    # Upsert: update existing active subscription for this email
    existing = (
        db.query(Subscription)
        .filter(Subscription.email == request.email, Subscription.is_active == True)  # noqa: E712
        .first()
    )

    if existing:
        existing.keywords = ",".join(request.keywords)
        existing.location_filter = request.location_filter or None
        db.commit()
        return SubscribeResponse(
            message="Subscription updated successfully",
            subscription_id=existing.id,
        )

    sub = Subscription(
        email=request.email,
        keywords=",".join(request.keywords),
        location_filter=request.location_filter or None,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    logger.info(f"New subscription: {request.email} | keywords: {request.keywords}")
    return SubscribeResponse(
        message="Subscription created successfully",
        subscription_id=sub.id,
    )


@router.post("/cancel")
def unsubscribe(request: UnsubscribeRequest, db: Session = Depends(get_db)):
    subs = (
        db.query(Subscription)
        .filter(Subscription.email == request.email, Subscription.is_active == True)  # noqa: E712
        .all()
    )
    if not subs:
        raise HTTPException(status_code=404, detail="No active subscription found")

    for sub in subs:
        sub.is_active = False
    db.commit()

    return {"message": "Unsubscribed successfully"}
