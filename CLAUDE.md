# CLAUDE.md — AI Dead-Time Optimizer (Hackathon Build)

## Project Overview
A calendar-based web app that reads Google Calendar events, detects fragmented free time blocks, and suggests context-aware tasks as dashed tentative blocks on a visual calendar UI. Users accept/reject suggestions. The system learns from feedback.

## Stack
- **Frontend**: React + Tailwind CSS (Vite, port 3000)
- **Backend**: FastAPI (Python 3.11), port 8000
- **DB**: SQLite (hackathon speed) via SQLAlchemy
- **Auth**: Google OAuth 2.0 (mock mode for dev, real OAuth ready)
- **LLM**: claude-sonnet-4-20250514 via Anthropic API (with rule-based fallback)
- **Integrations**: Google Calendar API (USE_MOCK_DATA=true for dev)

## Running the App

### Backend
```bash
cd focusfill/backend
source venv/bin/activate   # Python 3.11 venv — DO NOT use system python3 (3.14)
uvicorn main:app --reload --port 8000
# OR: ./start.sh
```

### Frontend
```bash
cd focusfill/frontend
npm run dev   # runs on http://localhost:3000
```

## Switching to Real Google Calendar
1. Set up Google Cloud project → enable Calendar API → create OAuth credentials
2. Edit `focusfill/backend/.env`:
   ```
   USE_MOCK_DATA=false
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
   ```
3. Visit `http://localhost:8000/auth/google` to start OAuth flow
4. After login, user is redirected to `http://localhost:3000?user_id=<id>`

## Core Entities
User, UserPreference, CalendarEvent, TimeBlock, Task, Suggestion, FeedbackEvent

## Key Design Rules
- Matching/ranking is DETERMINISTIC (rule-based scoring formula)
- LLM is called ONLY for: (1) suggestion explanation text (with fallback)
- Cache LLM outputs per event (don't re-call if already processed)
- Only fetch/process events within next 7 days
- Suggestions appear as dashed blocks; accepted = solid; rejected = hidden
- Backend uses Python 3.11 venv (Python 3.14 breaks pydantic v1)

## Scoring Formula
```
total_score = 30*duration_fit + 25*context_match + 20*user_goal_match
            + 15*event_relevance + 10*low_setup_bonus + 10*historical_acceptance_bonus
            - 20*mobility_mismatch - 25*location_mismatch
```

## API Endpoints
- POST /auth/mock-login         → login as demo user (mock mode)
- GET  /auth/google             → start Google OAuth (real mode)
- GET  /auth/me?user_id=N       → user + preferences
- POST /events/sync?user_id=N   → fetch+store events from Google/mock
- GET  /events/?user_id=N       → get stored events for week
- POST /suggestions/generate    → run suggestion pipeline for a date
- GET  /suggestions/?user_id=N  → get stored suggestions
- POST /feedback/               → accept or reject a suggestion
- GET  /preferences/?user_id=N  → get user preferences
- PUT  /preferences/?user_id=N  → update preferences

## Sync & Write-back Behavior
- GCal sync throttled to once per 6 hours (SYNC_COOLDOWN_HOURS in events.py)
- Manual "Sync" button in UI always forces a remote fetch (force=true)
- Accepting a suggestion writes it to Google Calendar (real mode) or logs a mock ID (mock mode)
- `users.last_synced_at` tracks when the last remote fetch happened
- `suggestions.gcal_event_id` stores the GCal event ID written on accept

## Known Errors & Decisions Log
- Python 3.14 breaks pydantic v1 — must use Python 3.11 venv at /opt/homebrew/bin/python3.11
- Tailwind v4 does not work with postcss config format from v3 — downgraded to v3 in package.json

## What Has Been Built
✅ Folder structure scaffolded
✅ DB models defined (User, UserPreference, CalendarEvent, TimeBlock, Task, Suggestion, FeedbackEvent)
✅ Mock auth (/auth/mock-login) + Google OAuth code ready (gated by USE_MOCK_DATA)
✅ Calendar event fetch (mock: 11 events for demo week; real: Google Calendar API)
✅ TimeBlock detection algorithm (detects gaps ≥10 min within 8AM–10PM window)
✅ Seed tasks (12 tasks covering all categories + constraint fields)
✅ Scoring + matching engine (deterministic formula, all 8 score components)
✅ Suggestion generation endpoint (generates + stores top-3 per time block)
✅ Suggestion retrieval endpoint
✅ Accept/Reject feedback endpoint + FeedbackEvent stored
✅ LLM reason string generation (with rule-based fallback)
✅ React frontend scaffolded (Vite + Tailwind v3)
✅ WeekView calendar component (Mon–Sun, time axis)
✅ EventBlock component (solid colored blocks by event type)
✅ SuggestionBlock component (dashed border, animated)
✅ SuggestionCard detail panel (task info + accept/reject buttons)
✅ TopBar with week nav + sync button + mode selector
✅ Sidebar with goals + scheduled tasks + category list
✅ ModeSelector (Productive / Low Energy / Passive)
✅ useCalendar hook (sync + fetch events)
✅ useSuggestions hook (generate per day + feedback)

## Build Order (Priority)
- [x] CLAUDE.md created and initialized
- [x] Folder structure scaffolded
- [x] DB models defined
- [x] Google OAuth flow working (mock + real)
- [x] Calendar event fetch (7-day window)
- [x] TimeBlock detection algorithm
- [x] Task seed data (12 realistic tasks)
- [x] Scoring + matching engine
- [x] Suggestion generation endpoint
- [x] Suggestion storage + retrieval
- [x] React calendar week view
- [x] Dashed suggestion blocks rendering
- [x] Accept/Reject UI + feedback endpoint
- [x] LLM reason string generation
- [ ] User preference/goals edit page (UI form)
- [ ] Mode selector affects suggestions in real-time (needs re-generate on change)
- [ ] Spotify integration (stretch)
