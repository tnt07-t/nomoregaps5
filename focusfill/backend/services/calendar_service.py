"""
Calendar service — mock data + real Google Calendar API wrapper.
"""
import os
from datetime import datetime, timedelta, date

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"


def get_mock_events(user_id: int, week_start: date) -> list:
    """Return 11 mock events for the given week.

    week_start should be a Monday.
    Returns list of dicts with keys:
      gcal_event_id, title, start_time, end_time, location,
      description, event_type, user_id
    """
    ws = week_start  # alias

    def dt(day_offset: int, hour: int, minute: int = 0) -> datetime:
        d = ws + timedelta(days=day_offset)
        return datetime(d.year, d.month, d.day, hour, minute)

    events = [
        # Monday (offset 0)
        {
            "gcal_event_id": f"mock_uid_{user_id}_001",
            "title": "Team Standup",
            "start_time": dt(0, 9, 0),
            "end_time":   dt(0, 9, 30),
            "location": None,
            "description": "Daily sync with the team",
            "event_type": "work",
            "user_id": user_id,
        },
        {
            "gcal_event_id": f"mock_uid_{user_id}_002",
            "title": "1:1 with Manager",
            "start_time": dt(0, 14, 0),
            "end_time":   dt(0, 15, 0),
            "location": "Zoom",
            "description": "Weekly 1:1 check-in",
            "event_type": "work",
            "user_id": user_id,
        },
        # Tuesday (offset 1)
        {
            "gcal_event_id": f"mock_uid_{user_id}_003",
            "title": "Product Review",
            "start_time": dt(1, 10, 0),
            "end_time":   dt(1, 11, 30),
            "location": "Conference Room B",
            "description": "Review product roadmap and sprint status",
            "event_type": "work",
            "user_id": user_id,
        },
        {
            "gcal_event_id": f"mock_uid_{user_id}_004",
            "title": "CS3110 Lecture",
            "start_time": dt(1, 15, 0),
            "end_time":   dt(1, 16, 0),
            "location": "Olin Hall 155",
            "description": "Functional programming lecture",
            "event_type": "personal",
            "user_id": user_id,
        },
        # Wednesday (offset 2)
        {
            "gcal_event_id": f"mock_uid_{user_id}_005",
            "title": "Deep Work: Coding",
            "start_time": dt(2, 11, 0),
            "end_time":   dt(2, 13, 0),
            "location": None,
            "description": "Focus block — no interruptions",
            "event_type": "focus",
            "user_id": user_id,
        },
        {
            "gcal_event_id": f"mock_uid_{user_id}_006",
            "title": "Gym",
            "start_time": dt(2, 16, 0),
            "end_time":   dt(2, 17, 0),
            "location": "Campus Gym",
            "description": "Workout session",
            "event_type": "personal",
            "user_id": user_id,
        },
        # Thursday (offset 3)
        {
            "gcal_event_id": f"mock_uid_{user_id}_007",
            "title": "Team Standup",
            "start_time": dt(3, 9, 0),
            "end_time":   dt(3, 9, 30),
            "location": None,
            "description": "Daily sync with the team",
            "event_type": "work",
            "user_id": user_id,
        },
        {
            "gcal_event_id": f"mock_uid_{user_id}_008",
            "title": "Biology Midterm",
            "start_time": dt(3, 14, 0),
            "end_time":   dt(3, 15, 30),
            "location": "Statler Hall 190",
            "description": "BIO 2800 midterm exam",
            "event_type": "personal",
            "user_id": user_id,
        },
        # Friday (offset 4)
        {
            "gcal_event_id": f"mock_uid_{user_id}_009",
            "title": "Career Fair Prep",
            "start_time": dt(4, 10, 0),
            "end_time":   dt(4, 11, 0),
            "location": None,
            "description": "Prepare elevator pitch and resume review",
            "event_type": "work",
            "user_id": user_id,
        },
        {
            "gcal_event_id": f"mock_uid_{user_id}_010",
            "title": "CS3110 Lecture",
            "start_time": dt(4, 15, 0),
            "end_time":   dt(4, 16, 0),
            "location": "Olin Hall 155",
            "description": "Functional programming lecture",
            "event_type": "personal",
            "user_id": user_id,
        },
        # Saturday (offset 5)
        {
            "gcal_event_id": f"mock_uid_{user_id}_011",
            "title": "Chess Club",
            "start_time": dt(5, 11, 0),
            "end_time":   dt(5, 12, 0),
            "location": "Willard Straight Hall",
            "description": "Weekly chess club meeting",
            "event_type": "personal",
            "user_id": user_id,
        },
    ]
    return events


def get_real_events(user_id: int, access_token: str, refresh_token: str, week_start: date) -> list:
    """Fetch events from Google Calendar API for the given week.

    Returns a list of dicts with the same schema as get_mock_events.
    Falls back to empty list on any error.
    """
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=["https://www.googleapis.com/auth/calendar.readonly",
                    "https://www.googleapis.com/auth/calendar.events"],
        )
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)

        week_end = week_start + timedelta(days=7)
        time_min = datetime(week_start.year, week_start.month, week_start.day).isoformat() + "Z"
        time_max = datetime(week_end.year, week_end.month, week_end.day).isoformat() + "Z"

        result = service.events().list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            maxResults=50,
        ).execute()

        raw_events = result.get("items", [])
        events = []
        for item in raw_events:
            # Skip all-day events (no dateTime)
            start_raw = item.get("start", {}).get("dateTime")
            end_raw = item.get("end", {}).get("dateTime")
            if not start_raw or not end_raw:
                continue

            start_dt = datetime.fromisoformat(start_raw.replace("Z", "+00:00")).replace(tzinfo=None)
            end_dt = datetime.fromisoformat(end_raw.replace("Z", "+00:00")).replace(tzinfo=None)

            # Guess event type from summary/description
            summary = item.get("summary", "").lower()
            if any(kw in summary for kw in ["gym", "workout", "run", "yoga", "chess", "class", "lecture"]):
                event_type = "personal"
            elif any(kw in summary for kw in ["focus", "deep work", "block"]):
                event_type = "focus"
            else:
                event_type = "work"

            events.append({
                "gcal_event_id": item.get("id"),
                "title": item.get("summary", "Untitled"),
                "start_time": start_dt,
                "end_time": end_dt,
                "location": item.get("location"),
                "description": item.get("description"),
                "event_type": event_type,
                "user_id": user_id,
            })

        return events

    except Exception as exc:
        print(f"[calendar_service] get_real_events error: {exc}")
        return []
