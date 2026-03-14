"""
Feedback router — accept or reject a suggestion.
"""
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/", response_model=schemas.SuggestionOut)
def submit_feedback(body: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    """
    - Update suggestion.status = 'accepted' or 'rejected'
    - Store FeedbackEvent
    - If accepted + real mode: write to Google Calendar
    - If mock mode: log a mock gcal_event_id
    - Return updated suggestion
    """
    # Validate action
    if body.action not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="action must be 'accepted' or 'rejected'")

    # Fetch suggestion
    suggestion = db.query(models.Suggestion).filter(
        models.Suggestion.id == body.suggestion_id,
        models.Suggestion.user_id == body.user_id,
    ).first()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # Update suggestion status
    suggestion.status = body.action

    if body.action == "accepted":
        if USE_MOCK_DATA:
            # Mock write-back: generate a fake gcal event id
            mock_id = f"mock_gcal_{uuid.uuid4().hex[:12]}"
            suggestion.gcal_event_id = mock_id
            print(f"[feedback] Mock GCal write-back: event_id={mock_id}")
        else:
            # Real mode: write to Google Calendar
            gcal_id = _write_to_gcal(suggestion, db)
            if gcal_id:
                suggestion.gcal_event_id = gcal_id

    # Store FeedbackEvent
    feedback_event = models.FeedbackEvent(
        user_id=body.user_id,
        suggestion_id=body.suggestion_id,
        action=body.action,
    )
    db.add(feedback_event)
    db.commit()
    db.refresh(suggestion)

    return suggestion


# ─── GCal write-back ─────────────────────────────────────────────────────────

def _write_to_gcal(suggestion: models.Suggestion, db: Session) -> str | None:
    """Write an accepted suggestion to Google Calendar. Returns gcal event id or None."""
    try:
        user = db.query(models.User).filter(models.User.id == suggestion.user_id).first()
        if not user or not user.access_token:
            return None

        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=user.access_token,
            refresh_token=user.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=["https://www.googleapis.com/auth/calendar.events"],
        )
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)

        block = suggestion.time_block
        task  = suggestion.task

        event_body = {
            "summary": task.title if task else "TimeFiller Task",
            "description": suggestion.reason or "",
            "start": {
                "dateTime": block.start_time.isoformat() + "Z",
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": block.end_time.isoformat() + "Z",
                "timeZone": "UTC",
            },
        }

        created = service.events().insert(calendarId="primary", body=event_body).execute()
        return created.get("id")

    except Exception as exc:
        print(f"[feedback] GCal write-back failed: {exc}")
        return None
