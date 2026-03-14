"""
Suggestions router — generate and retrieve task suggestions.
"""
import os
from datetime import datetime, timedelta, date as date_type
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from services.gap_detector import detect_gaps
from services.suggestion_engine import get_top_suggestions

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.post("/generate", response_model=List[schemas.SuggestionOut])
def generate_suggestions(
    user_id: int = Query(...),
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    1. Get events for the week (or a specific date)
    2. Detect gaps
    3. Store TimeBlocks
    4. Get/seed tasks
    5. Score and match
    6. Store top-3 suggestions per gap
    7. Return all suggestions
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get user preferences
    prefs = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == user_id
    ).first()
    work_start = prefs.work_start_hour if prefs else 8
    work_end   = prefs.work_end_hour if prefs else 22
    min_gap    = prefs.min_gap_minutes if prefs else 15
    buffer     = prefs.transition_buffer_minutes if prefs else 10

    # Determine date range
    today = datetime.today().date()
    week_start = today - timedelta(days=today.weekday())
    week_end   = week_start + timedelta(days=7)

    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
            start_dt = datetime(target_date.year, target_date.month, target_date.day)
            end_dt   = start_dt + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")
    else:
        start_dt = datetime(week_start.year, week_start.month, week_start.day)
        end_dt   = datetime(week_end.year, week_end.month, week_end.day)

    # Fetch stored events in range
    events = (
        db.query(models.CalendarEvent)
        .filter(
            models.CalendarEvent.user_id == user_id,
            models.CalendarEvent.start_time >= start_dt,
            models.CalendarEvent.start_time < end_dt,
        )
        .order_by(models.CalendarEvent.start_time)
        .all()
    )

    # Group events by date
    events_by_day: dict = {}
    for ev in events:
        day_key = ev.start_time.date()
        events_by_day.setdefault(day_key, []).append(ev)

    # Detect gaps for each day
    all_gaps = []
    for day, day_events in events_by_day.items():
        gaps = detect_gaps(
            events=day_events,
            work_start_hour=work_start,
            work_end_hour=work_end,
            min_gap_minutes=min_gap,
            transition_buffer=buffer,
        )
        all_gaps.extend(gaps)

    if not events_by_day and not all_gaps:
        # No events synced yet — return empty but don't error
        return []

    # Store TimeBlocks (upsert by date+start_time+user_id)
    stored_blocks = []
    for gap in all_gaps:
        existing_block = db.query(models.TimeBlock).filter(
            models.TimeBlock.user_id == user_id,
            models.TimeBlock.date == gap["date"],
            models.TimeBlock.start_time == gap["start_time"],
        ).first()

        if existing_block:
            block = existing_block
        else:
            block = models.TimeBlock(
                user_id=user_id,
                date=gap["date"],
                start_time=gap["start_time"],
                end_time=gap["end_time"],
                duration_minutes=gap["duration_minutes"],
                prev_event_id=gap.get("prev_event_id"),
                next_event_id=gap.get("next_event_id"),
                is_mobile=gap["is_mobile"],
                is_home=gap["is_home"],
                low_setup_only=gap["low_setup_only"],
            )
            db.add(block)
            db.flush()  # get block.id

        stored_blocks.append((block, gap))

    db.commit()

    # Get all tasks
    tasks = db.query(models.Task).all()
    if not tasks:
        return []

    # Get user goals
    user_goals = db.query(models.Goal).filter(
        models.Goal.user_id == user_id,
        models.Goal.is_active == True,
    ).all()

    # Get feedback history
    feedback_history = (
        db.query(models.FeedbackEvent)
        .filter(models.FeedbackEvent.user_id == user_id)
        .all()
    )

    # Score + match — pass gap dicts (with block ids)
    enriched_gaps = []
    for block, gap in stored_blocks:
        enriched = dict(gap)
        enriched["time_block_id"] = block.id
        enriched_gaps.append(enriched)

    # Build daily_usage: count pending/accepted suggestions per task per day
    # This ensures daily_limit is respected across generation calls
    today_str = str(date_type.today())
    today_suggestions = (
        db.query(models.Suggestion)
        .join(models.TimeBlock, models.Suggestion.time_block_id == models.TimeBlock.id)
        .filter(
            models.Suggestion.user_id == user_id,
            models.Suggestion.status.in_(["pending", "accepted"]),
            models.TimeBlock.date == today_str,
        )
        .all()
    )
    daily_usage: dict = {}
    for s in today_suggestions:
        daily_usage[s.task_id] = daily_usage.get(s.task_id, 0) + 1

    scored = get_top_suggestions(
        gaps=enriched_gaps,
        tasks=tasks,
        user_goals=user_goals,
        feedback_history=feedback_history,
        top_n=3,
        daily_usage=daily_usage,
    )

    # Store suggestions (skip duplicates for same block+task)
    new_suggestion_ids = []
    for item in scored:
        task  = item["task"]
        gap   = item["gap"]
        score = item["score"]
        reason = item["reason"]
        block_id = gap.get("time_block_id")

        existing_sugg = db.query(models.Suggestion).filter(
            models.Suggestion.user_id == user_id,
            models.Suggestion.task_id == task.id,
            models.Suggestion.time_block_id == block_id,
        ).first()

        if existing_sugg:
            existing_sugg.score = score
            existing_sugg.reason = reason
            new_suggestion_ids.append(existing_sugg.id)
        else:
            sugg = models.Suggestion(
                user_id=user_id,
                task_id=task.id,
                time_block_id=block_id,
                score=score,
                reason=reason,
                status="pending",
            )
            db.add(sugg)
            db.flush()
            new_suggestion_ids.append(sugg.id)

    db.commit()

    # Return all suggestions for the requested range
    return _get_suggestions_for_range(user_id, start_dt, end_dt, db)


@router.get("/", response_model=List[schemas.SuggestionOut])
def get_suggestions(
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Return pending and accepted suggestions for the current week, with task+time_block nested."""
    today = datetime.today().date()
    week_start = today - timedelta(days=today.weekday())
    week_end   = week_start + timedelta(days=7)
    start_dt = datetime(week_start.year, week_start.month, week_start.day)
    end_dt   = datetime(week_end.year, week_end.month, week_end.day)
    return _get_suggestions_for_range(user_id, start_dt, end_dt, db)


# ─── Helper ───────────────────────────────────────────────────────────────────

def _get_suggestions_for_range(
    user_id: int,
    start_dt: datetime,
    end_dt: datetime,
    db: Session,
) -> List[models.Suggestion]:
    return (
        db.query(models.Suggestion)
        .join(models.TimeBlock, models.Suggestion.time_block_id == models.TimeBlock.id)
        .filter(
            models.Suggestion.user_id == user_id,
            models.Suggestion.status.in_(["pending", "accepted"]),
            models.TimeBlock.start_time >= start_dt,
            models.TimeBlock.start_time < end_dt,
        )
        .order_by(models.TimeBlock.start_time, models.Suggestion.score.desc())
        .all()
    )
