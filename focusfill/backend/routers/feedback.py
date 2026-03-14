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
        # Reject all other pending suggestions for the same time block
        siblings = db.query(models.Suggestion).filter(
            models.Suggestion.time_block_id == suggestion.time_block_id,
            models.Suggestion.id != suggestion.id,
            models.Suggestion.status == "pending",
        ).all()
        for sib in siblings:
            sib.status = "rejected"

        if USE_MOCK_DATA:
            mock_id = f"mock_gcal_{uuid.uuid4().hex[:12]}"
            suggestion.gcal_event_id = mock_id
            print(f"[feedback] Mock GCal write-back: event_id={mock_id}")
        else:
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
        if not user or not user.refresh_token:
            print("[feedback] No refresh token — cannot write to GCal")
            return None

        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = Credentials(
            token=user.access_token,
            refresh_token=user.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=["https://www.googleapis.com/auth/calendar",
                    "https://www.googleapis.com/auth/calendar.events"],
        )

        # Refresh the token if expired — this is the key fix
        if not creds.valid:
            creds.refresh(Request())
            # Persist the new access token so future calls don't need to refresh again
            user.access_token = creds.token
            db.commit()

        service = build("calendar", "v3", credentials=creds, cache_discovery=False)

        block = suggestion.time_block
        task  = suggestion.task
        tz    = user.timezone or "America/New_York"

        # Format datetimes as RFC3339 with timezone
        def fmt(dt):
            return dt.strftime("%Y-%m-%dT%H:%M:%S")

        event_body = {
            "summary": task.title if task else "NoMoreGaps Task",
            "description": (suggestion.reason or "") + "\n\nScheduled by NoMoreGaps",
            "start": {"dateTime": fmt(block.start_time), "timeZone": tz},
            "end":   {"dateTime": fmt(block.end_time),   "timeZone": tz},
            "colorId": "2",  # sage green in GCal
        }

        created = service.events().insert(calendarId="primary", body=event_body).execute()
        gcal_id = created.get("id")
        print(f"[feedback] GCal event created: {gcal_id}")
        return gcal_id

    except Exception as exc:
        print(f"[feedback] GCal write-back failed: {exc}")
        return None
