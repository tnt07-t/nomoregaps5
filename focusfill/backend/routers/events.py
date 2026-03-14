from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/sync")
def sync_events(user_id: int = Query(...), force: bool = Query(False), db: Session = Depends(get_db)):
    """Stub: Sync calendar events from Google Calendar."""
    return {"status": "stub", "message": "Event sync not yet implemented", "user_id": user_id}


@router.get("/")
def get_events(user_id: int = Query(...), db: Session = Depends(get_db)):
    """Stub: Get stored calendar events."""
    return {"status": "stub", "events": [], "user_id": user_id}
