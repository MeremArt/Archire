from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.application import Application
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/applications", tags=["applications"])

VALID_STATUSES = {"saved", "applied", "screening", "interview", "offer", "rejected", "withdrawn"}


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    applied_at: Optional[str] = None


@router.get("")
def list_applications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    apps = (
        db.query(Application)
        .filter(Application.user_id == user.id)
        .order_by(desc(Application.created_at))
        .all()
    )
    return [a.to_dict() for a in apps]


@router.get("/{app_id}")
def get_application(app_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app.to_dict()


@router.patch("/{app_id}")
def update_application(app_id: int, body: ApplicationUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if body.status:
        if body.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
        app.status = body.status
        if body.status == "applied" and not app.applied_at:
            app.applied_at = datetime.utcnow()

    if body.notes is not None:
        app.notes = body.notes

    if body.applied_at:
        try:
            app.applied_at = datetime.fromisoformat(body.applied_at)
        except ValueError:
            pass

    db.commit()
    db.refresh(app)
    return app.to_dict()


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(app_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app)
    db.commit()
