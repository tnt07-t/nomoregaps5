"""
Gap detector — finds free time blocks between calendar events.
"""
from datetime import datetime, timedelta, date
from typing import List


def detect_gaps(
    events: list,
    work_start_hour: int = 8,
    work_end_hour: int = 22,
    min_gap_minutes: int = 15,
    transition_buffer: int = 10,
) -> list:
    """
    Given a list of event dicts (or ORM objects) for a SINGLE day,
    detect gaps between them.

    Each event must have: start_time (datetime), end_time (datetime),
    title (str), location (str|None), id (int|None).

    Returns list of gap dicts:
    {
        date: str (YYYY-MM-DD),
        start_time: datetime,
        end_time: datetime,
        duration_minutes: int,
        prev_event_id: int | None,
        prev_event_title: str | None,
        next_event_id: int | None,
        next_event_title: str | None,
        is_mobile: bool,
        is_home: bool,
        low_setup_only: bool,
    }
    """
    if not events:
        return []

    # Pull the date from the first event
    first_start = _get_dt(events[0], "start_time")
    day = first_start.date()

    day_start = datetime(day.year, day.month, day.day, work_start_hour, 0)
    day_end   = datetime(day.year, day.month, day.day, work_end_hour, 0)

    # Sort events by start_time
    sorted_events = sorted(events, key=lambda e: _get_dt(e, "start_time"))

    gaps = []

    # Build timeline points: day_start, [events], day_end
    # Each "slot" is (start, end, event_obj | None)
    timeline = []  # list of (start_dt, end_dt)
    event_refs = []  # parallel list: the event that occupies this slot, or None for gaps

    prev_end = day_start
    prev_event = None

    for ev in sorted_events:
        ev_start = _get_dt(ev, "start_time")
        ev_end   = _get_dt(ev, "end_time")

        # Clamp to work window
        ev_start = max(ev_start, day_start)
        ev_end   = min(ev_end, day_end)

        if ev_start <= prev_end:
            # Overlapping or back-to-back — just advance prev_end
            if ev_end > prev_end:
                prev_end = ev_end
                prev_event = ev
            continue

        # There is a potential gap between prev_end and ev_start
        gap_start = prev_end + timedelta(minutes=transition_buffer if prev_event else 0)
        gap_end   = ev_start - timedelta(minutes=transition_buffer)

        if gap_end > gap_start:
            dur = int((gap_end - gap_start).total_seconds() / 60)
            if dur >= min_gap_minutes:
                gaps.append(_build_gap(
                    day=day,
                    gap_start=gap_start,
                    gap_end=gap_end,
                    duration_minutes=dur,
                    prev_event=prev_event,
                    next_event=ev,
                ))

        prev_end = max(prev_end, ev_end)
        prev_event = ev

    # Gap after last event until day_end
    if prev_end < day_end:
        gap_start = prev_end + timedelta(minutes=transition_buffer if prev_event else 0)
        gap_end   = day_end
        if gap_end > gap_start:
            dur = int((gap_end - gap_start).total_seconds() / 60)
            if dur >= min_gap_minutes:
                gaps.append(_build_gap(
                    day=day,
                    gap_start=gap_start,
                    gap_end=gap_end,
                    duration_minutes=dur,
                    prev_event=prev_event,
                    next_event=None,
                ))

    return gaps


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_dt(event, field: str) -> datetime:
    val = getattr(event, field, None) if hasattr(event, field) else event.get(field)
    if isinstance(val, datetime):
        return val
    raise ValueError(f"Event missing datetime field '{field}'")


def _get_str(event, field: str, default=None):
    val = getattr(event, field, None) if hasattr(event, field) else event.get(field, default)
    return val


def _build_gap(day, gap_start: datetime, gap_end: datetime, duration_minutes: int,
               prev_event, next_event) -> dict:
    prev_title = _get_str(prev_event, "title") if prev_event else None
    next_title = _get_str(next_event, "title") if next_event else None
    prev_id    = _get_str(prev_event, "id") if prev_event else None
    next_id    = _get_str(next_event, "id") if next_event else None
    prev_loc   = _get_str(prev_event, "location") if prev_event else None
    next_loc   = _get_str(next_event, "location") if next_event else None

    # is_mobile: short gap (<20 min) OR adjacent events have transit-related keywords
    transit_keywords = ("commute", "transit", "train", "bus", "uber", "lyft", "drive", "walk")
    adjacent_transit = any(
        kw in (t or "").lower()
        for kw in transit_keywords
        for t in [prev_title, next_title, prev_loc, next_loc]
        if t
    )
    is_mobile = duration_minutes < 20 or adjacent_transit

    # is_home: after 7 PM OR no location on adjacent events
    after_7pm = gap_start.hour >= 19
    no_location = (not prev_loc) and (not next_loc)
    is_home = after_7pm or no_location

    # low_setup_only: gap < 20 min
    low_setup_only = duration_minutes < 20

    return {
        "date": day.strftime("%Y-%m-%d"),
        "start_time": gap_start,
        "end_time": gap_end,
        "duration_minutes": duration_minutes,
        "prev_event_id": prev_id,
        "prev_event_title": prev_title,
        "next_event_id": next_id,
        "next_event_title": next_title,
        "is_mobile": is_mobile,
        "is_home": is_home,
        "low_setup_only": low_setup_only,
    }
