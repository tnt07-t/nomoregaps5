# CLAUDE.md — NoMoreGaps (Hackathon Build)

> **READ THIS BEFORE EVERY BUILD PHASE. UPDATE AFTER EVERY PHASE.**
> Full history in BUILD_LOG.md.

---

## Project Overview
Calendar-based web app that reads Google Calendar, detects fragmented free time blocks, and suggests context-aware tasks as dashed tentative blocks. Users accept/reject. Accepted tasks write back to GCal. System learns from feedback and re-scores tasks via LLM on each sync.

## Stack
- **Frontend**: React + Tailwind CSS v3 (Vite, port 3000)
- **Backend**: FastAPI (Python 3.11), port 8000
- **DB**: SQLite via SQLAlchemy (`focusfill/backend/nomoregaps.db`)
- **Auth**: Google OAuth 2.0 (real mode; `USE_MOCK_DATA=false`)
- **LLM**: Anthropic API — `claude-sonnet-4-20250514` for task gen, `claude-haiku-4-5-20251001` for explanations + re-scoring
- **Integrations**: Google Calendar API (read + write)

## Running the App

### Backend
```bash
cd focusfill/backend
source venv/bin/activate   # Python 3.11 venv — DO NOT use system python3 (3.14)
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd focusfill/frontend
npm run dev   # runs on http://localhost:3000
```

## Core Entities
User, UserPreference, Goal, GoalTask, CalendarEvent, TimeBlock, Task, Suggestion, FeedbackEvent

## Key Design Rules
- Matching/ranking is DETERMINISTIC (rule-based scoring formula + LLM priority_boost)
- LLM called for: (1) task generation on goal create/update, (2) re-prioritization on each sync, (3) explanation strings (optional, with fallback)
- Onboarding subtasks are persisted to GoalTask and mirrored into user task-library rows in `tasks` (`source_type="user"`)
- DB migrations run automatically on startup via `database._migrate()` — safe to add new ALTER TABLE statements there
- Only fetch/process events within current 7-day week
- Suggestions appear as dashed blocks; accepted = solid; rejected = hidden
- **Only 1 suggestion shown per time_block** (WeekView deduplicates by time_block_id)
- Accepting a suggestion auto-rejects all sibling suggestions for the same time_block
- Large gaps (>90 min) are subdivided into 60-min sub-blocks in suggestions.py
- Goals sidebar in calendar view must show what user is working on now/next per goal
- Suggestions must remain role-agnostic (no default student assumptions)
- Suggestion regeneration must clear stale in-range pending suggestions and recompute fresh candidates
- Suggestions must diversify across adjacent time blocks (title and category fatigue penalties in scorer)
- Suggestion blocks must not expand on hover; actions are handled in side panel
- Overlapping suggestion intervals must render in separate lanes (side-by-side), not stacked
- Onboarding must use typed API helpers (`api.createGoal`, `api.getGoals`) and must not silently swallow save failures
- Backend uses Python 3.11 venv (Python 3.14 breaks pydantic v1)
- `from __future__ import annotations` required in Python 3.11 files using `X | Y` union types

## Scoring Formula
```
total_score = 30*duration_fit + 25*context_match + 20*user_goal_match
            + 15*event_relevance + 10*low_setup_bonus + 10*historical_acceptance
            - 20*mobility_mismatch - 25*location_mismatch
            + priority_boost * 30   ← set by LLM on each sync
```

## Task Limits
- **daily_limit**: max times a task is suggested per day (stored on Task + GoalTask)
- **weekly_limit**: max times a task is suggested per week (stored on Task + GoalTask)
- Enforced in `suggestion_engine.get_top_suggestions()` via `daily_usage` + `weekly_usage` dicts
- `session_usage` dict prevents over-assignment within a single generation call
- Seed task examples: "Reply to Emails" → daily=1, weekly=5; "Chess Tactics" → daily=2, weekly=14
- Laundry policy: low effort only, continuous block (>=60 min), hard max 90 min/week
- Legacy tasks with missing limits are backfilled at startup migration (`daily_limit`, `weekly_limit`)

## LLM Usage (cost-controlled)
| Function | Model | Trigger | Output |
|----------|-------|---------|--------|
| `generate_tasks_for_goal()` | sonnet | goal create/update | 4 tasks with daily_limit |
| `reprioritize_tasks()` | haiku | every GCal sync | `{task_id: boost}` (-0.3 to +0.3) |
| `generate_explanation()` | haiku | on demand | 1-sentence reason string |

## API Endpoints
- POST `/auth/mock-login` → login as demo user (mock mode)
- GET  `/auth/google` → start Google OAuth
- GET  `/auth/me?user_id=N` → user + preferences
- POST `/events/sync?user_id=N&force=bool` → fetch+store events (throttled 6h); triggers LLM reprioritize
- GET  `/events/?user_id=N` → stored events for week
- POST `/suggestions/generate?user_id=N` → gap detect → subdivide → score → store top-3 per block
- GET  `/suggestions/?user_id=N` → week's pending+accepted suggestions
- POST `/feedback/` → accept (auto-rejects siblings, writes to GCal) or reject
- GET/POST/PUT `/goals/` → CRUD + LLM task gen in background
- GET/PUT `/preferences/` → user preferences

## Sync & Write-back
- GCal sync throttled 6h (SYNC_COOLDOWN_HOURS); force=true bypasses
- Sync now validates/refreshes OAuth tokens before GCal fetch
- Expired or invalid OAuth now returns explicit `401` (reconnect required), not silent empty data
- Non-auth Google Calendar API failures return `502` from `/events/sync`
- Claude re-prioritization runs only when remote sync actually executes (not during cooldown short-circuit)
- Accept → writes to GCal with `colorId: "2"` (sage green); token refresh handled automatically
- `users.last_synced_at` tracks last remote fetch
- `suggestions.gcal_event_id` stores written GCal event ID

## Known Gotchas
- `date` query param in suggestions.py shadowed `datetime.date` → renamed import to `date as date_type`
- Python 3.14 breaks pydantic v1 — must use venv at `/opt/homebrew/bin/python3.11`
- Tailwind v4 breaks with v3 postcss config — stay on v3
- `App.jsx` should be edited with Edit tool, not Write (linter may revert Write)
- After any models.py change: add migration SQL to `database._migrate()` or server won't start
- If `/events/sync` returns `401`, user must re-run Google OAuth (`/auth/google`) to restore tokens

## What Has Been Built
✅ Full onboarding flow (4 steps matching PDF mockups)
✅ Google OAuth 2.0 (real mode, token refresh on expiry)
✅ Calendar event sync (GCal API, 6h throttle, force sync button)
✅ Gap detection (≥15 min, 8AM–10PM, transition buffers)
✅ Block subdivision (>90 min gaps → 60-min chunks for varied tasks)
✅ 12 seed tasks with daily + weekly limits
✅ Scoring engine (deterministic formula + LLM priority_boost)
✅ Suggestion generation (top-3 per block, stored in DB)
✅ Accept/Reject flow (sibling auto-reject, GCal write-back)
✅ Weekly + daily limit enforcement in suggestion engine
✅ LLM task generation on goal create/update (BackgroundTasks)
✅ LLM re-prioritization on every GCal sync (Haiku, cost-minimal)
✅ Onboarding goals/subtasks mirrored into user task library used by suggestion generation
✅ React week-view calendar (dashed = pending, solid = accepted, hidden = rejected)
✅ 1 suggestion per time block in UI (no overlapping blocks)
✅ Goal management page (/goals)
✅ Dashboard: mini-calendar, goals progress sidebar, week nav, sync button
✅ Goals sidebar now shows `Now/Next/Planned` task context per goal
✅ Laundry constraints enforced (continuous + low effort + weekly minute cap)
✅ Student-biased default task wording removed; anti-repetition scoring penalties added
✅ Suggestion runs now clear stale pending rows before regeneration (accepted history retained)
✅ Strong diversification tuning: adjacent-title penalty + category fatigue + novelty bonus
✅ Onboarding goals persist reliably and load in preview/dashboard via correct API methods
✅ Suggestion hover expansion removed; overlap-safe lane layout added to calendar week view

## Remaining / Stretch
- [ ] Mode selector (Productive / Low Energy / Passive) → re-generate suggestions on change
- [ ] Goals router: wire BackgroundTasks LLM call on goal create/update (partially done)
- [ ] Spotify integration (stretch)
