"""
Events router — sync calendar events and retrieve stored events.
"""
import os
from datetime import datetime, timedelta, date
from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from services.calendar_service import get_mock_events, get_real_events

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"
SYNC_COOLDOWN_HOURS = 6

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/sync", response_model=List[schemas.CalendarEventOut])
def sync_events(
    user_id: int = Query(...),
    force: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Sync calendar events for the current week.
    Throttled to once per SYNC_COOLDOWN_HOURS unless force=True.
    In mock mode: generate mock events.
    In real mode: call Google Calendar API.
    Upserts events by gcal_event_id.
    """
    # Validate user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check cooldown (skip if force=True)
    if not force and user.last_synced_at:
        elapsed = (datetime.utcnow() - user.last_synced_at).total_seconds() / 3600
        if elapsed < SYNC_COOLDOWN_HOURS:
            # Return existing events without re-fetching
            return _get_week_events(user_id, db)

    # Calculate current week start (Monday)
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday

    # Fetch events
    if USE_MOCK_DATA:
        raw_events = get_mock_events(user_id, week_start)
    else:
        raw_events = get_real_events(
            user_id=user_id,
            access_token=user.access_token or "",
            refresh_token=user.refresh_token or "",
            week_start=week_start,
        )

    # Upsert events
    for ev_data in raw_events:
        gcal_id = ev_data.get("gcal_event_id")
        if gcal_id:
            existing = db.query(models.CalendarEvent).filter(
                models.CalendarEvent.gcal_event_id == gcal_id,
                models.CalendarEvent.user_id == user_id,
            ).first()
            if existing:
                existing.title = ev_data["title"]
                existing.start_time = ev_data["start_time"]
                existing.end_time = ev_data["end_time"]
                existing.location = ev_data.get("location")
                existing.description = ev_data.get("description")
                existing.event_type = ev_data.get("event_type", "work")
                continue

        event = models.CalendarEvent(
            user_id=user_id,
            gcal_event_id=gcal_id,
            title=ev_data["title"],
            start_time=ev_data["start_time"],
            end_time=ev_data["end_time"],
            location=ev_data.get("location"),
            description=ev_data.get("description"),
            event_type=ev_data.get("event_type", "work"),
        )
        db.add(event)

    # Update last_synced_at
    user.last_synced_at = datetime.utcnow()
    db.commit()

    return _get_week_events(user_id, db)


@router.get("/", response_model=List[schemas.CalendarEventOut])
def get_events(
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Return all stored events for the current 7-day window."""
    return _get_week_events(user_id, db)


# ─── Helper ───────────────────────────────────────────────────────────────────

def _get_week_events(user_id: int, db: Session) -> List[models.CalendarEvent]:
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    start_dt = datetime(week_start.year, week_start.month, week_start.day)
    end_dt   = datetime(week_end.year, week_end.month, week_end.day)

    return (
        db.query(models.CalendarEvent)
        .filter(
            models.CalendarEvent.user_id == user_id,
            models.CalendarEvent.start_time >= start_dt,
            models.CalendarEvent.start_time < end_dt,
        )
        .order_by(models.CalendarEvent.start_time)
        .all()
    )
